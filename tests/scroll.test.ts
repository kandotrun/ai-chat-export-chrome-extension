import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { hydrateConversationHistory, selectBestScroller } from '../src/lib/scroll';

function setMetrics(element: Element, metrics: { scrollHeight: number; clientHeight: number }): void {
  Object.defineProperties(element, {
    scrollHeight: { configurable: true, value: metrics.scrollHeight },
    clientHeight: { configurable: true, value: metrics.clientHeight },
  });
}

describe('selectBestScroller', () => {
  it('prefers the scrollable container that owns ChatGPT turn nodes', () => {
    const dom = new JSDOM(`
      <main>
        <section id="unrelated"><p>long settings panel</p></section>
        <section id="conversation">
          <div data-message-author-role="user">hello</div>
          <div data-message-author-role="assistant">hi</div>
        </section>
      </main>
    `);
    const document = dom.window.document;
    const unrelated = document.querySelector('#unrelated')!;
    const conversation = document.querySelector('#conversation')!;

    setMetrics(unrelated, { scrollHeight: 4_000, clientHeight: 500 });
    setMetrics(conversation, { scrollHeight: 2_000, clientHeight: 500 });

    expect(selectBestScroller(document)).toBe(conversation);
  });

  it('prefers scrollable containers that own Claude or Gemini turn nodes', () => {
    const dom = new JSDOM(
      `
      <main>
        <section id="unrelated"><p>long settings panel</p></section>
        <section id="conversation">
          <div data-testid="user-message">hello Claude</div>
          <div class="font-claude-message">hi from Claude</div>
          <user-query>hello Gemini</user-query>
          <model-response><message-content>hi from Gemini</message-content></model-response>
        </section>
      </main>
    `,
      { url: 'https://claude.ai/chat/test' },
    );
    const document = dom.window.document;
    const unrelated = document.querySelector('#unrelated')!;
    const conversation = document.querySelector('#conversation')!;

    setMetrics(unrelated, { scrollHeight: 4_000, clientHeight: 500 });
    setMetrics(conversation, { scrollHeight: 2_000, clientHeight: 500 });

    expect(selectBestScroller(document)).toBe(conversation);
  });
});

describe('hydrateConversationHistory', () => {
  it('reports incomplete when the safety limit is reached before history is stable', async () => {
    const dom = new JSDOM(
      `
      <main>
        <section id="conversation">
          <div data-message-author-role="user">hello</div>
          <div data-message-author-role="assistant">hi</div>
        </section>
      </main>
    `,
      { url: 'https://chatgpt.com/c/test' },
    );
    const document = dom.window.document;
    const conversation = document.querySelector('#conversation')!;
    setMetrics(conversation, { scrollHeight: 2_000, clientHeight: 500 });

    const progress: number[] = [];
    const result = await hydrateConversationHistory(
      document,
      ({ iteration }) => progress.push(iteration),
      { maxIterations: 2, settleMs: 0, stableIterations: 99 },
    );

    expect(progress).toEqual([1, 2]);
    expect(result).toEqual({
      completed: false,
      reachedLimit: true,
      iterations: 2,
      messageCount: 2,
      atTop: true,
      maxIterations: 2,
    });
  });

  it('reports complete after the conversation is stable at the top', async () => {
    const dom = new JSDOM(
      `
      <main>
        <section id="conversation">
          <div data-message-author-role="user">hello</div>
          <div data-message-author-role="assistant">hi</div>
        </section>
      </main>
    `,
      { url: 'https://chatgpt.com/c/test' },
    );
    const document = dom.window.document;
    const conversation = document.querySelector('#conversation')!;
    setMetrics(conversation, { scrollHeight: 2_000, clientHeight: 500 });

    const result = await hydrateConversationHistory(document, undefined, {
      maxIterations: 5,
      settleMs: 0,
      stableIterations: 1,
    });

    expect(result).toEqual({
      completed: true,
      reachedLimit: false,
      iterations: 2,
      messageCount: 2,
      atTop: true,
      maxIterations: 5,
    });
  });
});
