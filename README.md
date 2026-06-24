# AI Chat Markdown Exporter

A privacy-first Chrome extension that exports the currently opened ChatGPT, Claude, or Gemini conversation to a local Markdown (`.md`) file.

## Features

- Export the current ChatGPT, Claude, or Gemini conversation as Markdown.
- Automatically scroll upward before export so older, lazily loaded messages can be collected.
- Cancels the export instead of saving a partial file if the page cannot confirm a stable top after the scroll safety limit.
- Adds a small right-edge `MD Export` tab on supported AI chat pages.
- Runs locally in the browser. No analytics, no remote server, no external API calls.
- Minimal permissions: no `tabs`, `downloads`, browsing history, storage, or clipboard permissions.

## Install from the latest release

1. Download `chatgpt-markdown-exporter.zip` from the [latest release](https://github.com/kandotrun/chatgpt-export-chrome-extension/releases/latest).
2. Unzip it locally.
3. Open Chrome and go to `chrome://extensions/`.
4. Enable **Developer mode**.
5. Click **Load unpacked** and select the unzipped folder.
6. Open a supported conversation, click the right-edge `MD Export` tab, then click **Save this conversation as .md**.

## Supported sites

- `https://chatgpt.com/*`
- `https://chat.openai.com/*`
- `https://claude.ai/*`
- `https://gemini.google.com/*`

## Build locally

```bash
npm install
npm run build
```

Then load the generated `dist/` folder from `chrome://extensions/` using **Load unpacked**.

## Development

```bash
npm install
npm run check
```

`npm run check` runs TypeScript type checks, unit tests, and a production build.

## Privacy and permissions

This extension reads the DOM of the currently opened supported conversation and creates a local Markdown download with `Blob` / object URLs. It does not send conversation content anywhere.

Current host permissions are limited to the supported sites listed above.

Chrome extension permissions are intentionally empty.

## Implementation notes

- `src/content.ts`: injects the right-edge panel into supported chat pages and runs export.
- `src/lib/scroll.ts`: scrolls to the top and waits for lazily loaded conversation turns.
- `src/lib/extract.ts`: extracts user / assistant turns from ChatGPT, Claude, and Gemini DOM.
- `src/lib/markdown.ts`: builds Markdown and sanitizes filenames.

## Known limitations

ChatGPT, Claude, or Gemini may change their DOM structure. If extraction breaks, add a representative DOM snippet to `tests/extract.test.ts` first, then update the selectors / renderer.

The auto-scroll pass currently uses a 300-iteration safety limit to avoid infinite loops. If that limit is reached before the top of the conversation looks stable, the extension stops with an error instead of downloading a potentially incomplete Markdown file.

## Disclaimer

This project is not affiliated with OpenAI, Anthropic, or Google.
