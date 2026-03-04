# OpenClaw Telegram Preprocessor Integration

## Overview

This directory contains the integration scripts for the Telegram Preprocessor in OpenClaw. The preprocessor enhances Telegram message formatting by converting markdown tables to bullet lists, preserving code blocks, and ensuring messages are under Telegram's 4096-character limit.

## Files

- `telegram-preprocessor-integration.mjs`: Main integration script for OpenClaw.

## Installation

1. **Ensure the Telegram Preprocessor is installed**:
   ```bash
   cd /root/openclaw-stock-home/.openclaw/workspace/repositories/telegram-preprocessor
   npm install
   ```

2. **Load the integration script in OpenClaw**:
   ```javascript
   const { integrateTelegramPreprocessor } = require('/root/openclaw-stock-home/.openclaw/workspace/telegram-integration/telegram-preprocessor-integration.mjs');
   const bot = new TelegramBot('YOUR_BOT_TOKEN');
   integrateTelegramPreprocessor(bot);
   ```

## Usage

### Integrating the Preprocessor

To integrate the preprocessor into OpenClaw, follow these steps:

1. **Load the integration script**:
   ```javascript
   const { integrateTelegramPreprocessor } = require('./telegram-preprocessor-integration.mjs');
   ```

2. **Integrate with your Telegram bot**:
   ```javascript
   const bot = new TelegramBot('YOUR_BOT_TOKEN');
   integrateTelegramPreprocessor(bot);
   ```

### Features

- **Table-to-Bullets Conversion**: Converts markdown tables to bullet lists for better readability on Telegram.
- **Code Block Preservation**: Preserves code blocks using fence-aware logic.
- **Metadata Hiding**: Hides sensitive metadata like message IDs and timestamps.
- **Safe Chunking**: Splits messages at safe boundaries to avoid breaking HTML entities or tags.

## Testing

To test the integration, you can use the following commands:

```bash
cd /root/openclaw-stock-home/.openclaw/workspace/repositories/telegram-preprocessor
test-integration.mjs
```

## References

- [Telegram Preprocessor Documentation](https://github.com/vidarbrekke/telegram-preprocessor)
- [Telegram Message Formatting Guide](https://core.telegram.org/bots/api#formatting-options)
- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)

## License
MIT