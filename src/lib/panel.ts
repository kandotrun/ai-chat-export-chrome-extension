export type PanelTheme = 'light' | 'dark';
export type PanelLocale = 'en' | 'ja';

export type StatusState =
  | { kind: 'idle' }
  | { kind: 'progress'; messageCount: number; iteration: number }
  | { kind: 'success'; messageCount: number; filename: string }
  | { kind: 'error'; message: string };

interface NavigatorLanguageLike {
  language?: string;
  languages?: readonly string[];
}

interface PanelCopy {
  subtitle: Record<StatusState['kind'], string>;
  tabLabel: string;
  openAria: string;
  closeAria: string;
  buttonLabel: string;
  busyLabel: string;
  footer: string;
  idleHint: string;
  progressText: (messageCount: number, iteration: number) => string;
  successBadge: string;
  successDetail: (messageCount: number) => string;
  defaultIncompleteError: (maxIterations: number) => string;
  defaultEmptyError: string;
  defaultUnknownError: string;
}

const PANEL_COPY: Record<PanelLocale, PanelCopy> = {
  en: {
    subtitle: {
      idle: 'Save this conversation locally',
      progress: 'Loading older messages…',
      success: 'Saved',
      error: 'Failed',
    },
    tabLabel: 'Save as .md',
    openAria: 'Open AI Chat Markdown Exporter',
    closeAria: 'Close',
    buttonLabel: 'Save this conversation as .md',
    busyLabel: 'Loading…',
    footer: 'No external transmission — extracted from this page and saved locally',
    idleHint:
      'Press the button to auto-scroll to the top and export all loaded turns as Markdown.',
    progressText: (messageCount, iteration) =>
      `${messageCount} messages found / ${iteration} scrolls`,
    successBadge: '✓ Saved',
    successDetail: (messageCount) => `${messageCount} messages exported to Markdown`,
    defaultIncompleteError: (maxIterations) =>
      `Stopped after ${maxIterations} scroll attempts before the top looked stable. Export was cancelled to avoid saving an incomplete file. Please try again after the conversation finishes loading.`,
    defaultEmptyError: 'Could not detect conversation messages.',
    defaultUnknownError: 'Export failed.',
  },
  ja: {
    subtitle: {
      idle: 'この会話をローカルに保存',
      progress: '古い会話を読み込み中…',
      success: '保存しました',
      error: '失敗しました',
    },
    tabLabel: 'MD保存',
    openAria: 'AI Chat Markdown Exporter を開く',
    closeAria: '閉じる',
    buttonLabel: 'この会話を .md 保存',
    busyLabel: '読み込み中…',
    footer: '外部送信なし・ページ内DOMから抽出してローカル保存',
    idleHint:
      'ボタンを押すと上端まで自動スクロールし、読み込まれた全ターンを Markdown 化します。',
    progressText: (messageCount, iteration) =>
      `${messageCount} 件検出 / ${iteration} 回スクロール`,
    successBadge: '✓ 保存完了',
    successDetail: (messageCount) => `${messageCount} 件を Markdown 化`,
    defaultIncompleteError: (maxIterations) =>
      `${maxIterations} 回スクロールしても上端の安定を確認できませんでした。不完全なファイル保存を避けるため、エクスポートを中止しました。会話の読み込み完了後に再試行してください。`,
    defaultEmptyError: '会話メッセージを検出できませんでした。',
    defaultUnknownError: 'エクスポートに失敗しました。',
  },
};

export const STATUS_SUBTITLE: Record<StatusState['kind'], string> = PANEL_COPY.ja.subtitle;

export function getPanelCopy(locale: PanelLocale = 'ja'): PanelCopy {
  return PANEL_COPY[locale];
}

export function resolveLocale(source: NavigatorLanguageLike = globalThis.navigator): PanelLocale {
  const candidates = source.languages?.length ? source.languages : [source.language];
  const normalized = candidates.find((language): language is string => Boolean(language))?.toLowerCase();
  return normalized?.startsWith('ja') ? 'ja' : 'en';
}

/**
 * Decide the panel theme by following the active chat app appearance, falling back
 * to the OS preference. Pure: takes a Document, returns the resolved theme.
 */
export function resolveTheme(doc: Document): PanelTheme {
  const el = doc.documentElement;
  if (el) {
    if (el.classList.contains('dark')) return 'dark';
    if (el.classList.contains('light')) return 'light';
    const dataTheme = (el.getAttribute('data-theme') ?? '').toLowerCase();
    if (dataTheme.includes('dark')) return 'dark';
    if (dataTheme.includes('light')) return 'light';
    const scheme = (el.style?.colorScheme ?? '').toLowerCase();
    if (scheme.includes('dark') && !scheme.includes('light')) return 'dark';
    if (scheme.includes('light')) return 'light';
  }
  const view = doc.defaultView;
  if (view && typeof view.matchMedia === 'function') {
    try {
      if (view.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    } catch {
      /* matchMedia unimplemented (e.g. bare jsdom) */
    }
  }
  return 'light';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Inner HTML for the status region; pure for unit testing. */
export function renderStatus(state: StatusState, locale: PanelLocale = 'ja'): string {
  const copy = getPanelCopy(locale);
  switch (state.kind) {
    case 'idle':
      return `<div class="well"><div class="well__row"><span class="dot dot--muted"></span><span>${copy.idleHint}</span></div></div>`;
    case 'progress':
      return `<div class="well"><div class="progress"><i></i></div><div class="well__row"><span class="dot dot--accent"></span><span>${copy.progressText(state.messageCount, state.iteration)}</span></div></div>`;
    case 'success':
      return `<div class="well"><div class="well__row"><span class="badge badge--success">${copy.successBadge}</span><span>${copy.successDetail(state.messageCount)}</span></div><div class="filename">${escapeHtml(state.filename)}</div></div>`;
    case 'error':
      return `<div class="alert" role="alert"><span class="badge badge--danger">!</span><span>${escapeHtml(state.message)}</span></div>`;
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

/** The full retro-cute stylesheet for the shadow DOM (token-driven, light + dark). */
export function panelStyles(): string {
  return `
    :host { all: initial; }
    .root {
      --indigo:#4f46e5; --indigo-strong:#4338ca; --primary-fg:#ffffff;
      --success:#1f9d6b; --danger:#e5484d;
      --bg:#ffffff; --fg:#0a0a0a; --muted:#f5f5f5; --muted-fg:#6b7280;
      --border:#e6e6ec; --card:#ffffff; --well-bg:#f7f7fb;
      --well-shadow: inset 0 2px 5px rgba(40,40,80,0.07);
      --card-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 14px -6px rgba(40,40,80,0.18), 0 18px 50px -20px rgba(40,40,80,0.30);
      --head-grad: linear-gradient(to bottom, #ffffff, color-mix(in oklab, var(--indigo) 5%, #fff));
      --track:#ececf3;
      --focus-ring: 0 0 0 3px color-mix(in oklab, var(--indigo) 40%, transparent);
      --bevel-top: inset 0 1px 0 0 rgba(255,255,255,0.6);
      --gloss: linear-gradient(to bottom, rgba(255,255,255,0.22), rgba(255,255,255,0) 45%, rgba(0,0,0,0.18));
      --btn-shadow: inset 0 0 0 1px rgba(0,0,0,0.22), inset 0 1px 0 0 rgba(255,255,255,0.45), 0 1px 2px rgba(0,0,0,0.18), 0 2px 6px -1px rgba(0,0,0,0.12);
      --font-sans: "Geist", "Noto Sans JP", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      --font-mono: "Geist Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
      font-family: var(--font-sans);
      color: var(--fg);
    }
    .root[data-theme="dark"] {
      --indigo:#6a63f0; --indigo-strong:#564fe0;
      --bg:#1d1d22; --fg:#ededed; --muted:#26262e; --muted-fg:#a6a6b3;
      --border:rgba(255,255,255,0.12); --card:#232329; --well-bg:#1a1a1f;
      --well-shadow: inset 0 2px 6px rgba(0,0,0,0.5);
      --card-shadow: 0 1px 3px rgba(0,0,0,0.4), 0 10px 30px -10px rgba(0,0,0,0.6), 0 24px 60px -24px rgba(0,0,0,0.7);
      --head-grad: linear-gradient(to bottom, #2a2a32, color-mix(in oklab, var(--indigo) 16%, #232329));
      --track:#15151a;
      --focus-ring: 0 0 0 3px color-mix(in oklab, var(--indigo) 55%, transparent);
    }
    .root, .root * { box-sizing: border-box; }

    .tab {
      position: fixed; right: 0; top: 42%; z-index: 2147483647;
      display: inline-flex; flex-direction: column; align-items: center; gap: 6px;
      writing-mode: vertical-rl; border: 0; cursor: pointer;
      border-radius: 14px 0 0 14px; padding: 16px 9px;
      color: var(--primary-fg); font: 600 12px/1.2 var(--font-sans); letter-spacing: .08em;
      background-color: var(--indigo); background-image: var(--gloss); background-repeat: no-repeat;
      box-shadow: inset 0 0 0 1px rgba(0,0,0,0.22), inset 0 1px 0 0 rgba(255,255,255,0.45), -2px 4px 12px rgba(40,40,80,0.30);
      transition: transform .12s ease, filter .12s ease, box-shadow .12s ease;
    }
    .tab:hover { filter: brightness(1.06); transform: translateX(-2px); }
    .tab:active { transform: translateX(0); filter: brightness(0.96); }
    .tab:focus-visible { outline: none; box-shadow: var(--btn-shadow), var(--focus-ring); }
    .tab .glyph { writing-mode: horizontal-tb; font-size: 15px; font-weight: 700; }

    .card {
      position: fixed; right: 14px; top: 86px; z-index: 2147483647;
      display: none; width: min(320px, calc(100vw - 28px));
      border: 1px solid var(--border); border-radius: 14px;
      background: var(--card); box-shadow: var(--card-shadow);
      overflow: hidden; font-size: 14px;
    }
    .card[data-open] { display: block; }
    .card__head { display: flex; align-items: center; gap: 10px; padding: 13px 14px; background-image: var(--head-grad); box-shadow: var(--bevel-top); border-bottom: 1px solid var(--border); }
    .brand { flex: none; width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; color: #fff; font-weight: 800; font-size: 13px; background-color: var(--indigo); background-image: var(--gloss); background-repeat: no-repeat; box-shadow: var(--btn-shadow); }
    .head__text { display: flex; flex-direction: column; line-height: 1.25; min-width: 0; }
    .title { font-weight: 700; font-size: 13.5px; letter-spacing: -0.01em; }
    .subtitle { font-size: 11px; color: var(--muted-fg); }
    .close { margin-left: auto; flex: none; width: 26px; height: 26px; border-radius: 8px; border: 1px solid transparent; background: transparent; color: var(--muted-fg); cursor: pointer; font-size: 17px; line-height: 1; display: grid; place-items: center; transition: background .12s ease, color .12s ease, border-color .12s ease; }
    .close:hover { background: var(--muted); color: var(--fg); border-color: var(--border); }
    .close:focus-visible { outline: none; box-shadow: var(--focus-ring); }

    .card__body { padding: 14px; display: flex; flex-direction: column; gap: 12px; }

    .primary { width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 0; cursor: pointer; border-radius: 10px; padding: 11px 14px; color: var(--primary-fg); font: 700 13.5px/1 var(--font-sans); background-color: var(--indigo); background-image: var(--gloss); background-repeat: no-repeat; box-shadow: var(--btn-shadow); transition: transform .1s ease, filter .12s ease, box-shadow .12s ease; }
    .primary:hover { filter: brightness(1.05); box-shadow: var(--btn-shadow), 0 6px 16px -6px color-mix(in oklab, var(--indigo) 55%, transparent); }
    .primary:active { transform: translateY(1px); box-shadow: inset 0 2px 6px rgba(0,0,0,0.28), inset 0 0 0 1px rgba(0,0,0,0.22); }
    .primary:focus-visible { outline: none; box-shadow: var(--btn-shadow), var(--focus-ring); }
    .primary:disabled { cursor: progress; filter: saturate(.7); opacity: .9; }
    .primary svg { width: 16px; height: 16px; }
    .primary .ic-dl { display: inline-flex; }
    .primary .ic-sp { display: none; }
    .primary[data-busy] .ic-dl { display: none; }
    .primary[data-busy] .ic-sp { display: inline-flex; }
    .spin { animation: kan-spin .8s linear infinite; }
    @keyframes kan-spin { to { transform: rotate(360deg); } }

    .well { border: 1px solid var(--border); border-radius: 10px; background: var(--well-bg); box-shadow: var(--well-shadow); padding: 11px 12px; font-size: 12.5px; color: var(--muted-fg); line-height: 1.5; display: flex; flex-direction: column; gap: 9px; }
    .well__row { display: flex; align-items: center; gap: 8px; }
    .dot { width: 7px; height: 7px; border-radius: 999px; flex: none; }
    .dot--muted { background: var(--muted-fg); }
    .dot--accent { background: var(--indigo); }

    .progress { height: 7px; border-radius: 999px; background: var(--track); box-shadow: inset 0 1px 2px rgba(0,0,0,0.18); overflow: hidden; }
    .progress > i { display: block; height: 100%; width: 40%; border-radius: 999px; background-color: var(--indigo); background-image: var(--gloss); background-repeat: no-repeat; box-shadow: var(--bevel-top); animation: kan-indeterminate 1.2s ease-in-out infinite; }
    @keyframes kan-indeterminate { 0% { margin-left: -42%; } 100% { margin-left: 102%; } }

    .badge { display: inline-flex; align-items: center; gap: 5px; flex: none; white-space: nowrap; border-radius: 999px; padding: 3px 9px; font-size: 11px; font-weight: 700; color: #fff; background-image: linear-gradient(to bottom, rgba(255,255,255,0.35), rgba(0,0,0,0.10)); box-shadow: var(--bevel-top), inset 0 0 0 1px rgba(0,0,0,0.12); }
    .badge--success { background-color: var(--success); }
    .badge--danger { background-color: var(--danger); }
    .filename { font-family: var(--font-mono); font-size: 12px; color: var(--fg); word-break: break-all; }

    .alert { border-radius: 10px; border: 1px solid color-mix(in oklab, var(--danger) 45%, var(--border)); background: color-mix(in oklab, var(--danger) 12%, var(--card)); color: color-mix(in oklab, var(--danger) 70%, var(--fg)); box-shadow: var(--bevel-top); padding: 10px 12px; font-size: 12.5px; line-height: 1.45; display: flex; gap: 8px; align-items: flex-start; }

    .foot { display: flex; align-items: center; gap: 7px; font-size: 11px; color: var(--muted-fg); margin: 0; }
    .foot svg { width: 13px; height: 13px; flex: none; }

    @media (prefers-reduced-motion: reduce) {
      .root *, .root *::before, .root *::after { transition: none !important; animation: none !important; }
    }
  `;
}

const ICON_DOWNLOAD = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/></svg>`;
const ICON_SPINNER = `<svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.2-8.5"/></svg>`;
const ICON_SHIELD = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 5 6v6c0 4 3 6.5 7 9 4-2.5 7-5 7-9V6l-7-3Z"/></svg>`;

/** Full shadow-DOM markup for the launcher tab + panel. */
export function panelMarkup(theme: PanelTheme = 'light', locale: PanelLocale = 'ja'): string {
  const copy = getPanelCopy(locale);
  return `
    <style>${panelStyles()}</style>
    <div class="root" data-export-root data-theme="${theme}" lang="${locale}">
      <button class="tab" type="button" data-export-tab aria-label="${copy.openAria}">
        <span class="glyph">↓</span>${copy.tabLabel}
      </button>
      <aside class="card" data-export-panel role="dialog" aria-label="AI Chat Markdown Exporter">
        <div class="card__head">
          <div class="brand" aria-hidden="true">M↓</div>
          <div class="head__text">
            <span class="title">AI Chat → Markdown</span>
            <span class="subtitle" data-export-subtitle>${copy.subtitle.idle}</span>
          </div>
          <button class="close" type="button" data-export-close aria-label="${copy.closeAria}">×</button>
        </div>
        <div class="card__body">
          <button class="primary" type="button" data-export-button>
            <span class="ic ic-dl">${ICON_DOWNLOAD}</span>
            <span class="ic ic-sp">${ICON_SPINNER}</span>
            <span data-export-label>${copy.buttonLabel}</span>
          </button>
          <div data-export-status aria-live="polite">${renderStatus({ kind: 'idle' }, locale)}</div>
          <p class="foot">${ICON_SHIELD}<span>${copy.footer}</span></p>
        </div>
      </aside>
    </div>
  `;
}
