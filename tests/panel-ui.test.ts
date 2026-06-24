import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  panelMarkup,
  panelStyles,
  renderStatus,
  resolveTheme,
} from '../src/lib/panel';

describe('resolveTheme', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('style');
    vi.unstubAllGlobals();
  });

  it('returns dark when <html> has the dark class', () => {
    document.documentElement.classList.add('dark');
    expect(resolveTheme(document)).toBe('dark');
  });

  it('returns light when <html> has the light class', () => {
    document.documentElement.classList.add('light');
    expect(resolveTheme(document)).toBe('light');
  });

  it('honors data-theme="dark"', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    expect(resolveTheme(document)).toBe('dark');
  });

  it('falls back to light when nothing indicates a theme', () => {
    expect(resolveTheme(document)).toBe('light');
  });

  it('follows prefers-color-scheme when present', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('dark'),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    expect(resolveTheme(document)).toBe('dark');
  });
});

describe('renderStatus', () => {
  it('idle shows the hint inside a well', () => {
    const html = renderStatus({ kind: 'idle' });
    expect(html).toContain('class="well"');
    expect(html).toContain('Markdown');
  });

  it('progress shows the bar and counts', () => {
    const html = renderStatus({ kind: 'progress', messageCount: 48, iteration: 6 });
    expect(html).toContain('class="progress"');
    expect(html).toContain('48 件検出 / 6 回スクロール');
  });

  it('success shows the badge, count and filename', () => {
    const html = renderStatus({ kind: 'success', messageCount: 52, filename: 'chat.md' });
    expect(html).toContain('保存完了');
    expect(html).toContain('52');
    expect(html).toContain('chat.md');
  });

  it('error shows an alert with the message', () => {
    const html = renderStatus({ kind: 'error', message: '検出できませんでした' });
    expect(html).toContain('class="alert"');
    expect(html).toContain('検出できませんでした');
  });

  it('escapes HTML in dynamic values', () => {
    const html = renderStatus({ kind: 'error', message: '<img src=x onerror=alert(1)>' });
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });
});

describe('panelStyles', () => {
  const css = panelStyles();

  it('uses the ai-slop indigo primary', () => {
    expect(css).toContain('#4f46e5');
  });

  it('includes the gloss gradient and bevel-top highlight', () => {
    expect(css).toMatch(/linear-gradient\(\s*to bottom/);
    expect(css).toContain('inset 0 1px 0 0 rgba(255,255,255,0.6)');
  });

  it('defines the sunken well inset shadow', () => {
    expect(css).toContain('inset 0 2px 5px rgba(40,40,80,0.07)');
  });

  it('includes a progress bar rule', () => {
    expect(css).toContain('.progress');
  });

  it('keeps status badges on a single line', () => {
    expect(css).toMatch(/\.badge\s*\{[^}]*white-space:\s*nowrap/);
    expect(css).toMatch(/\.badge\s*\{[^}]*flex:\s*none/);
  });

  it('provides a dark theme override', () => {
    expect(css).toContain('[data-theme="dark"]');
  });

  it('always shows a focus ring', () => {
    expect(css).toContain(':focus-visible');
  });

  it('respects reduced motion', () => {
    expect(css).toContain('prefers-reduced-motion');
  });
});

describe('panelMarkup', () => {
  it('contains the launcher tab and export button', () => {
    const html = panelMarkup('light');
    expect(html).toContain('data-export-tab');
    expect(html).toContain('data-export-button');
    expect(html).toContain('この会話を .md 保存');
  });

  it('applies the requested theme to the root', () => {
    expect(panelMarkup('dark')).toContain('data-theme="dark"');
  });

  it('keeps the privacy footer copy', () => {
    expect(panelMarkup('light')).toContain('外部送信なし');
  });

  it('references no remote/network resources (privacy guard)', () => {
    const html = panelMarkup('light');
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toMatch(/url\(/);
  });
});
