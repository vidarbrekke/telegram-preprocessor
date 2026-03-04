# OpenClaw Telegram Preprocessor Integration

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
 * Function to integrate the preprocessor into OpenClaw's message sending logic.
 * This function replaces the default sendMessage function with the processed version.
 *
 * @param {Object} bot - Telegram bot instance.
 */
function integrateTelegramPreprocessor(bot) {
  const originalSendMessage = bot.sendMessage;

  bot.sendMessage = async function(chatId, message, opts) {
    return new Promise(async (resolve, reject) => {
      try {
        if (opts && opts.channel === 'telegram') {
          const processed = preprocessTelegramMessage(message, opts);
          // Send each chunk
          for (const chunk of processed.chunks) {
            await this.sendMessage(chatId, chunk, {
              parse_mode: processed.parseMode,
            });
          }
        } else {
          // Fall back to the original sendMessage for non-Telegram messages
          await originalSendMessage.call(this, chatId, message, opts);
        }
        resolve();
      } catch (err) {
        console.error(`Error in Telegram Preprocessor: ${err}`);
        reject(err);
      }
    });
  };
}

// Export the integration function for use in OpenClaw
module.exports = {
  preprocessTelegramMessage,
  integrateTelegramPreprocessor,
};

// Example usage:
// const { integrateTelegramPreprocessor } = require('./telegram-preprocessor-integration.mjs');
// const bot = new TelegramBot('YOUR_BOT_TOKEN');
// integrateTelegramPreprocessor(bot);