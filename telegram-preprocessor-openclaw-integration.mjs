# Active Telegram Preprocessor Integration for OpenClaw

/**
 * This script integrates the Telegram Preprocessor into OpenClaw's message sending pipeline.
 * It replaces the default sendMessage function to preprocess messages before sending them to Telegram.
 */

// Load the preprocessor
const { preprocess } = require('/root/openclaw-stock-home/.openclaw/workspace/repositories/telegram-preprocessor/index.mjs');

/**
 * Function to preprocess messages for Telegram.
 * @param {string} message - The message to preprocess.
 * @param {Object} [options] - Preprocessing options.
 * @returns {Object} - Processed message chunks and parse mode.
 */
function preprocessTelegramMessage(message, options = {}) {
  const defaultOptions = {
    style: "telegramHtml",
    split: true,
    hideMetadata: true,
  };

  const mergedOptions = { ...defaultOptions, ...options };

  const { chunks, parseMode } = preprocess(message, {
    style: mergedOptions.style,
    split: mergedOptions.split,
  });

  // Hide metadata from each chunk if requested
  const processedChunks = mergedOptions.hideMetadata
    ? chunks.map(chunk => {
        return chunk.replace(/\bmessage_id:\s*[^\s]+\b|\bsender_id:\s*[^\s]+\b|\btimestamp:\s*[^\s]+\b/gi, "").trim();
      })
    : chunks;

  return {
    chunks: processedChunks,
    parseMode,
  };
}

/**
 * Function to send processed messages to Telegram.
 * This function replaces the default sendMessage function in OpenClaw.
 */
function sendProcessedTelegramMessage(bot, chatId, message, options = {}) {
  const processed = preprocessTelegramMessage(message, options);

  // Send each chunk
  for (const chunk of processed.chunks) {
    bot.sendMessage(chatId, chunk, {
      parse_mode: processed.parseMode,
    }).catch(err => {
      console.error(`Error sending Telegram message: ${err}`);
    });
  }
}

/**
 * Function to integrate the preprocessor into OpenClaw's message sending logic.
 * This function replaces the default sendMessage function with the processed version.
 */
function integrateTelegramPreprocessor(bot) {
  const originalSendMessage = bot.sendMessage;

  bot.sendMessage = function(chatId, message, opts) {
    return new Promise(async (resolve, reject) => {
      try {
        if (opts && opts.channel === 'telegram') {
          await sendProcessedTelegramMessage(this, chatId, message, opts);
        } else {
          // Fall back to the original sendMessage for non-Telegram messages
          await originalSendMessage.call(this, chatId, message, opts);
        }
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  };
}

/**
 * Example usage:
 * ```javascript
 * const { integrateTelegramPreprocessor } = require('./telegram-preprocessor-openclaw-integration-active.mjs');
 * const bot = new TelegramBot('YOUR_BOT_TOKEN');
 * integrateTelegramPreprocessor(bot);
 * ```
 */

// Export functions for use in OpenClaw
module.exports = {
  preprocessTelegramMessage,
  sendProcessedTelegramMessage,
  integrateTelegramPreprocessor,
};

// Test the integration with a mock bot
(async () => {
  // Mock Telegram bot for testing
  const mockBot = {
    sendMessage: async function(chatId, message, opts) {
      console.log(`[Mock Telegram Bot] Sending to ${chatId}:`);
      console.log(`Message: ${message.substring(0, 100) + (message.length > 100 ? "..." : "")}`);
      console.log(`Options: ${JSON.stringify(opts)}`);
    },
  };

  // Integrate the preprocessor
  integrateTelegramPreprocessor(mockBot);

  // Test messages
  const testMessages = [
    {
      message: `Here is a table:\n| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |\n\nMetadata: message_id: 12345, sender_id: 67890`,
      opts: { channel: 'telegram' },
    },
    {
      message: `Here is a code block:\n\n"`
      function example() {
        return "Hello, World!";
      }
      "`
\nMetadata: message_id: 54321, timestamp: 2026-03-04T18:49:00Z`,
      opts: { channel: 'telegram' },
    },
    {
      message: `A long message with a table:\n${"A".repeat(5000)}\nHere is a table:\n| A | B |\n|---|---|\n| 1 | 2 |`,
      opts: { channel: 'telegram' },
    },
    {
      message: `Non-Telegram message: This should not be processed.`,
      opts: { channel: 'email' },
    },
  ];

  // Test each message
  for (let i = 0; i < testMessages.length; i++) {
    console.log(`\n=== Test ${i + 1} ===`);
    try {
      await mockBot.sendMessage(`chat_${i}`, testMessages[i].message, testMessages[i].opts);
    } catch (err) {
      console.error(`Error in test ${i + 1}:`, err);
    }
  }

  console.log("\n=== Integration Test Complete ===");
  console.log("The Telegram Preprocessor is now ready for use in OpenClaw.");
  console.log("Next steps:");
  console.log("1. Integrate the preprocessor into OpenClaw's message sending logic.");
  console.log("2. Test with real Telegram messages.");
  console.log("3. Verify routing and permissions for the Telegram staff channel.");
})();