import { describe, expect, it } from 'vitest';
import {
  getPanelCopy,
  panelMarkup,
  renderStatus,
  resolveLocale,
} from '../src/lib/panel';

describe('resolveLocale', () => {
  it('uses English when the browser language is English', () => {
    expect(resolveLocale({ language: 'en-US', languages: ['en-US', 'ja-JP'] })).toBe('en');
  });

  it('uses Japanese when the browser language is Japanese', () => {
    expect(resolveLocale({ language: 'ja-JP', languages: ['ja-JP', 'en-US'] })).toBe('ja');
  });

  it('falls back to English for non-Japanese languages', () => {
    expect(resolveLocale({ language: 'fr-FR', languages: ['fr-FR'] })).toBe('en');
  });
});

describe('localized panel copy', () => {
  it('renders English visible copy when locale is en', () => {
    const html = panelMarkup('light', 'en');

    expect(html).toContain('Save as .md');
    expect(html).toContain('Save this conversation as .md');
    expect(html).toContain('No external transmission');
    expect(html).not.toContain('この会話を .md 保存');
    expect(html).not.toContain('外部送信なし');
  });

  it('renders Japanese visible copy when locale is ja', () => {
    const html = panelMarkup('light', 'ja');

    expect(html).toContain('MD保存');
    expect(html).toContain('この会話を .md 保存');
    expect(html).toContain('外部送信なし');
  });

  it('localizes status subtitles and dynamic status messages', () => {
    expect(getPanelCopy('en').subtitle.success).toBe('Saved');
    expect(renderStatus({ kind: 'progress', messageCount: 48, iteration: 6 }, 'en')).toContain(
      '48 messages found / 6 scrolls',
    );
    expect(renderStatus({ kind: 'success', messageCount: 52, filename: 'chat.md' }, 'en')).toContain(
      '52 messages exported to Markdown',
    );
  });
});
