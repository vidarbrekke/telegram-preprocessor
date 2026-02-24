# telegram-preprocessor

Make agent-style content (markdown tables, long blocks, horizontal layout) more readable in Telegram’s mobile UI.

- **Fence-aware:** protects ` ``` ` code blocks from table/whitespace rewriting  
- **Tables → bullets:** strict markdown table detection; preserves empty cells as —  
- **Safe chunking:** splits at 4096 chars without breaking HTML entities or `<pre>` blocks  
- **Optional HTML:** `telegramHtml` style = conservative markdown → Telegram-safe HTML per chunk (no `_italic_` to avoid `foo_bar_baz`)

## Install

Clone or add as dependency:

```bash
git clone https://github.com/vidarbrekke/telegram-preprocessor.git
cd telegram-preprocessor
```

## Usage

### CLI

```bash
# stdin → stdout (plain)
echo "| A | B |\n|---|---|\n| 1 | 2 |" | node index.mjs

# JSON output (chunks + parseMode)
echo "long content..." | node index.mjs --json

# Conservative HTML
echo "**Bold** and \`code\`" | node index.mjs --html
```

### Programmatic

```javascript
import { process } from "telegram-preprocessor"; // or "./index.mjs"

const { chunks, parseMode } = process(agentReply, { style: "telegramHtml", split: true });
// Send each chunk via Telegram Bot API with parse_mode: parseMode
```

**Options:**

- `style`: `'telegramPlain'` (default) or `'telegramHtml'`
- `toHtml`: legacy boolean (same as `style: 'telegramHtml'`)
- `maxChunkLength`: default 4096
- `split`: default true

## Tests

```bash
npm test
# or: node test.mjs
```

Runs 8 regression tests (table→bullets, fence protection, safe chunking, blank cells, no italic on `foo_bar_baz`, etc.).

## Telegram limits

- **4096** characters per message; longer content is split.
- **No markdown tables;** this preprocessor converts them to bullet lists.
- **parse_mode** HTML supports only `<b>`, `<i>`, `<code>`, `<pre>`, `<a href="...">`; we use a conservative subset.

## License

MIT
