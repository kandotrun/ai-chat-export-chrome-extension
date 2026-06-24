import { extractConversation } from './lib/extract';
import { buildMarkdown, sanitizeFilename } from './lib/markdown';
import {
  getPanelCopy,
  panelMarkup,
  renderStatus,
  resolveLocale,
  resolveTheme,
  type PanelLocale,
  type PanelTheme,
  type StatusState,
} from './lib/panel';
import { hydrateConversationHistory } from './lib/scroll';

const HOST_ID = 'kan-chatgpt-markdown-exporter';

installExporter();

interface ExportUi {
  button: HTMLButtonElement;
  label: HTMLElement;
  subtitle: HTMLElement;
  status: HTMLElement;
  locale: PanelLocale;
}

function installExporter(): void {
  if (document.getElementById(HOST_ID)) return;

  const host = document.createElement('div');
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: 'open' });
  const locale = resolveLocale(navigator);
  shadow.innerHTML = panelMarkup(resolveTheme(document), locale);
  document.documentElement.append(host);

  const root = shadow.querySelector<HTMLElement>('[data-export-root]');
  const tab = shadow.querySelector<HTMLButtonElement>('[data-export-tab]');
  const panel = shadow.querySelector<HTMLElement>('[data-export-panel]');
  const close = shadow.querySelector<HTMLButtonElement>('[data-export-close]');
  const button = shadow.querySelector<HTMLButtonElement>('[data-export-button]');
  const label = shadow.querySelector<HTMLElement>('[data-export-label]');
  const subtitle = shadow.querySelector<HTMLElement>('[data-export-subtitle]');
  const status = shadow.querySelector<HTMLElement>('[data-export-status]');

  if (!root || !tab || !panel || !close || !button || !label || !subtitle || !status) return;

  watchTheme(document, (theme) => root.setAttribute('data-theme', theme));

  const ui: ExportUi = { button, label, subtitle, status, locale };
  tab.addEventListener('click', () => panel.toggleAttribute('data-open'));
  close.addEventListener('click', () => panel.removeAttribute('data-open'));
  button.addEventListener('click', () => void runExport(ui));
}

function setStatus(ui: ExportUi, state: StatusState): void {
  const copy = getPanelCopy(ui.locale);
  ui.subtitle.textContent = copy.subtitle[state.kind];
  ui.status.innerHTML = renderStatus(state, ui.locale);
  const busy = state.kind === 'progress';
  ui.button.toggleAttribute('data-busy', busy);
  ui.button.disabled = busy;
  ui.label.textContent = busy ? copy.busyLabel : copy.buttonLabel;
}

async function runExport(ui: ExportUi): Promise<void> {
  const copy = getPanelCopy(ui.locale);
  setStatus(ui, { kind: 'progress', messageCount: 0, iteration: 0 });

  try {
    const backfill = await hydrateConversationHistory(document, (progress) => {
      setStatus(ui, {
        kind: 'progress',
        messageCount: progress.messageCount,
        iteration: progress.iteration,
      });
    });

    if (!backfill.completed) {
      throw new Error(copy.defaultIncompleteError(backfill.maxIterations));
    }

    const conversation = extractConversation(document);
    if (conversation.messages.length === 0) {
      throw new Error(copy.defaultEmptyError);
    }

    const markdown = buildMarkdown({
      title: conversation.title,
      sourceUrl: location.href,
      exportedAt: new Date(),
      messages: conversation.messages,
      assistantName: conversation.assistantName,
    });

    const filename = sanitizeFilename(conversation.title);
    downloadTextFile(filename, markdown);
    setStatus(ui, {
      kind: 'success',
      messageCount: conversation.messages.length,
      filename,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : copy.defaultUnknownError;
    setStatus(ui, { kind: 'error', message });
  }
}

function watchTheme(doc: Document, apply: (theme: PanelTheme) => void): void {
  apply(resolveTheme(doc));
  const update = (): void => apply(resolveTheme(doc));

  if (doc.documentElement) {
    new MutationObserver(update).observe(doc.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    });
  }

  const view = doc.defaultView;
  if (view && typeof view.matchMedia === 'function') {
    try {
      view.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', update);
    } catch {
      /* matchMedia change events unsupported */
    }
  }
}

function downloadTextFile(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
