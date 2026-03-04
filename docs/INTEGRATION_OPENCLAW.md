# OpenClaw Integration Guide

## Overview

This document provides instructions for integrating the Telegram Preprocessor into OpenClaw. The preprocessor enhances Telegram message formatting by converting markdown tables to bullet lists, preserving code blocks, and ensuring messages are under Telegram's 4096-character limit.

## Prerequisites

- **Telegram Preprocessor Installed**: This repository.
- **Node.js Environment**: Ensure Node.js is installed and available.
- **OpenClaw Configuration**: Ensure OpenClaw is configured to use the Telegram Preprocessor.

## Integration Steps

### Step 1: Load the Preprocessor

Load the preprocessor in your OpenClaw integration script:

```javascript
const { preprocess } = require('./index.mjs');
```

### Step 2: Replace the Default `sendMessage` Function

Replace the default `sendMessage` function of the Telegram bot with the processed version:

```javascript
// Replace the default sendMessage function
const originalSendMessage = bot.sendMessage;

bot.sendMessage = async function(chatId, message, opts) {
  if (opts && opts.channel === 'telegram') {
    const { chunks, parseMode } = preprocess(message, {
      style: "telegramHtml",
      split: true,
    });

    // Hide metadata
    const cleanedChunks = chunks.map(chunk => {
      return chunk.replace(/\bmessage_id:\s*[^\s]+\b|\bsender_id:\s*[^\s]+\b/gi, "").trim();
    });

    // Send each chunk
    for (const chunk of cleanedChunks) {
      await this.sendMessage(chatId, chunk, { parse_mode: parseMode });
    }
  } else {
    // Fall back to the original sendMessage for non-Telegram messages
    await originalSendMessage.call(this, chatId, message, opts);
  }
};
```

### Step 3: Test the Integration

#### Test with Sample Input

```javascript
const { preprocess } = require('./index.mjs');

const message = `Here is a table:\n| A | B |\n|---|---|\n| 1 | 2 |\nMetadata: message_id: 12345, sender_id: 67890`;

const { chunks, parseMode } = preprocess(message, {
  style: "telegramHtml",
  split: true,
});

console.log('Processed Chunks:', chunks);
console.log('Parse Mode:', parseMode);
```

**Expected Output:**
```
Processed Chunks: [ '• A: 1 · B: 2' ]
Parse Mode: HTML
```

### Step 4: Verify Routing and Permissions

The routing logic is already configured in OpenClaw:

- **Vidar (5309173712)** → **main agent**
- **Everyone else** → **telegram-staff agent**

You can verify the routing by checking the logs at:
```
/root/openclaw-stock-home/.openclaw/logs/telegram-sender-router.log
```

## Example Integration Script

Here is a complete example of how to integrate the preprocessor into OpenClaw:

```javascript
// Load the preprocessor
const { preprocess } = require('./index.mjs');

// Replace the default sendMessage function
const originalSendMessage = bot.sendMessage;

bot.sendMessage = async function(chatId, message, opts) {
  if (opts && opts.channel === 'telegram') {
    const { chunks, parseMode } = preprocess(message, {
      style: "telegramHtml",
      split: true,
    });

    // Hide metadata
    const cleanedChunks = chunks.map(chunk => {
      return chunk.replace(/\bmessage_id:\s*[^\s]+\b|\bsender_id:\s*[^\s]+\b/gi, "").trim();
    });

    // Send each chunk
    for (const chunk of cleanedChunks) {
      await this.sendMessage(chatId, chunk, { parse_mode: parseMode });
    }
  } else {
    // Fall back to the original sendMessage for non-Telegram messages
    await originalSendMessage.call(this, chatId, message, opts);
  }
};
```

## References

- [Telegram Preprocessor Documentation](README.md)
- [Telegram Message Formatting Guide](https://core.telegram.org/bots/api#formatting-options)
- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)

## Troubleshooting

### Common Issues

1. **Tables not converting to bullets**: Ensure that the preprocessor is enabled and correctly configured.
2. **Messages exceeding 4096 characters**: The preprocessor automatically splits messages into chunks.
3. **Metadata visible in replies**: Ensure that the metadata hiding logic is correctly implemented.
4. **Code blocks being modified**: Ensure that the fence-aware feature is enabled and working correctly.

### Debugging

To debug issues with the Telegram Preprocessor:

- **Check logs**: Review the logs for any errors or warnings.
- **Run tests**: Execute the test suite to ensure that all features are working as expected.
- **Test with sample input**: Use sample inputs to verify the behavior of the preprocessor.

## License
MIT