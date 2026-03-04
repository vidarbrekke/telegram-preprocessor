# Telegram Preprocessor Skill

## Description

Converts markdown tables to bullet lists and formats messages for Telegram compatibility. Ensures messages are under 4096 characters and properly formatted for Telegram's mobile UI.

## Features
- **Table-to-Bullets Conversion**: Converts markdown tables to bullet lists for better readability on Telegram.
- **Fence-Aware**: Protects code blocks from being modified.
- **Safe Chunking**: Splits messages at safe boundaries to avoid breaking HTML entities or tags.
- **Metadata Hiding**: Hides sensitive metadata (IDs, timestamps) from user-facing replies.
- **Telegram-Specific Formatting**: Ensures compatibility with Telegram's HTML and Markdown parsing modes.

## Usage

### CLI
```bash
# Convert tables to bullets and format for Telegram
echo "| A | B |
|---|---|
| 1 | 2 |" | node index.mjs
```

### Programmatic
```javascript
import { preprocess } from "/root/openclaw-stock-home/.openclaw/workspace/repositories/telegram-preprocessor/index.mjs";

const { chunks, parseMode } = preprocess(agentReply, {
  style: "telegramHtml",
  split: true
});

// Send each chunk via Telegram Bot API with parse_mode: parseMode
```

## Configuration

To activate this skill, add the following to your OpenClaw configuration:

```json
"telegram-preprocessor": {
  "path": "/root/openclaw-stock-home/.openclaw/workspace/repositories/telegram-preprocessor",
  "enabled": true,
  "table-to-bullets": true,
  "hide-metadata": true
}
```

## Dependencies
- Node.js (v18+)
- No additional dependencies required

## License
MIT