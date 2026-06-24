import { CONVERSATION_TURN_SELECTOR } from './extract';

const TURN_SELECTOR = CONVERSATION_TURN_SELECTOR;

export const DEFAULT_MAX_SCROLL_ITERATIONS = 300;

export interface BackfillProgress {
  iteration: number;
  messageCount: number;
  atTop: boolean;
}

export interface BackfillResult {
  completed: boolean;
  reachedLimit: boolean;
  iterations: number;
  messageCount: number;
  atTop: boolean;
  maxIterations: number;
}

interface HydrateOptions {
  maxIterations?: number;
  settleMs?: number;
  stableIterations?: number;
}

export type ScrollTarget = Element | Window;

export async function hydrateConversationHistory(
  document: Document,
  onProgress: (progress: BackfillProgress) => void = () => undefined,
  options: HydrateOptions = {},
): Promise<BackfillResult> {
  const maxIterations = options.maxIterations ?? DEFAULT_MAX_SCROLL_ITERATIONS;
  const settleMs = options.settleMs ?? 650;
  const stableIterations = options.stableIterations ?? 3;
  const scroller = selectBestScroller(document);
  let stable = 0;
  let previousSignature = '';
  let lastProgress: BackfillProgress = {
    iteration: 0,
    messageCount: conversationSignature(document).messageCount,
    atTop: isAtTop(scroller),
  };

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const before = conversationSignature(document);
    scrollToTop(scroller);
    await waitForDomToSettle(document, settleMs);
    const after = conversationSignature(document);
    const atTop = isAtTop(scroller);
    const signature = `${after.messageCount}:${after.firstMessage}:${after.lastMessage}:${atTop}`;

    lastProgress = { iteration, messageCount: after.messageCount, atTop };
    onProgress(lastProgress);

    if (atTop && signature === previousSignature && before.messageCount === after.messageCount) {
      stable += 1;
    } else {
      stable = 0;
    }

    previousSignature = signature;
    if (stable >= stableIterations) {
      return {
        completed: true,
        reachedLimit: false,
        iterations: iteration,
        messageCount: lastProgress.messageCount,
        atTop: lastProgress.atTop,
        maxIterations,
      };
    }
  }

  return {
    completed: false,
    reachedLimit: true,
    iterations: lastProgress.iteration,
    messageCount: lastProgress.messageCount,
    atTop: lastProgress.atTop,
    maxIterations,
  };
}

export function selectBestScroller(document: Document): ScrollTarget {
  const candidates = [
    document.scrollingElement,
    ...document.querySelectorAll<HTMLElement>('main, [role="main"], section, div'),
  ].filter((candidate): candidate is Element => Boolean(candidate));

  const ranked = candidates
    .map((candidate) => ({ candidate, score: scrollerScore(candidate) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.candidate ?? document.defaultView ?? window;
}

function scrollerScore(element: Element): number {
  const overflow = Math.max(0, element.scrollHeight - element.clientHeight);
  if (overflow <= 0) return 0;

  const turnCount = element.querySelectorAll(TURN_SELECTOR).length;
  const ownsTurns = turnCount > 0 ? 10_000 + turnCount * 100 : 0;
  const viewportScore = Math.min(overflow, 5_000);
  return ownsTurns + viewportScore;
}

function scrollToTop(target: ScrollTarget): void {
  if (target instanceof Window) {
    target.scrollTo({ top: 0, behavior: 'auto' });
    return;
  }
  target.scrollTop = 0;
}

function isAtTop(target: ScrollTarget): boolean {
  if (target instanceof Window) {
    return target.scrollY <= 2;
  }
  return target.scrollTop <= 2;
}

function conversationSignature(document: Document): {
  messageCount: number;
  firstMessage: string;
  lastMessage: string;
} {
  const turns = [...document.querySelectorAll<HTMLElement>(TURN_SELECTOR)];
  return {
    messageCount: turns.length,
    firstMessage: turns.at(0)?.textContent?.trim().slice(0, 80) ?? '',
    lastMessage: turns.at(-1)?.textContent?.trim().slice(0, 80) ?? '',
  };
}

function waitForDomToSettle(document: Document, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    let timer: number | undefined;
    const observer = new MutationObserver(() => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(done, timeoutMs);
    });

    const done = () => {
      observer.disconnect();
      resolve();
    };

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    timer = window.setTimeout(done, timeoutMs);
  });
}
