/**
 * TelegramProxy - Intercepts all outbound Telegram messages and
 * automatically applies the preprocessor pipeline before sending.
 *
 * Drop-in wrapper around any Telegram bot client that exposes:
 *   sendMessage(chatId, text, options?)
 *   sendPhoto / sendDocument / etc. (passthrough, unmodified)
 *
 * Usage:
 *   import { TelegramProxy } from "./proxy.mjs";
 *   const bot = new TelegramProxy(originalBotClient, { style: "telegramHtml" });
 *   await bot.sendMessage(chatId, longMarkdownText);  // auto-formatted + chunked
 *
 * The proxy:
 *   1. Runs the message through the preprocessor (tables → bullets, safe split)
 *   2. Sends each chunk sequentially via the underlying client
 *   3. Returns an array of API responses (one per chunk)
 *   4. Passes all other methods through untouched (photos, documents, etc.)
 */

import { process as preprocess } from "./index.mjs";

export class TelegramProxy {
  /**
   * @param {object} client  - Original Telegram bot client (node-telegram-bot-api, grammY, telegraf, etc.)
   * @param {object} options - Preprocessor options
   * @param {'telegramPlain'|'telegramHtml'} [options.style='telegramPlain']
   * @param {number} [options.maxChunkLength=4096]
   * @param {boolean} [options.split=true]
   * @param {number} [options.chunkDelayMs=300]  - Delay between chunks (ms) to avoid flood limits
   * @param {boolean} [options.enabled=true]     - Set false to disable preprocessing (passthrough mode)
   */
  constructor(client, options = {}) {
    if (!client) throw new Error("TelegramProxy: client is required");
    this._client = client;
    this._options = {
      style: "telegramPlain",
      maxChunkLength: 4096,
      split: true,
      chunkDelayMs: 300,
      enabled: true,
      ...options,
    };

    // Proxy: forward all properties/methods to the underlying client
    // unless we explicitly override them here.
    return new Proxy(this, {
      get(target, prop) {
        if (prop in target) return target[prop];
        const val = target._client[prop];
        return typeof val === "function" ? val.bind(target._client) : val;
      },
    });
  }

  /**
   * Intercept sendMessage, preprocess the text, send chunks sequentially.
   * @param {string|number} chatId
   * @param {string} text
   * @param {object} [options]  - Telegram API options (reply_markup, etc.)
   * @returns {Promise<object[]>} Array of API responses, one per chunk
   */
  async sendMessage(chatId, text, options = {}) {
    if (!this._options.enabled || typeof text !== "string" || text.trim() === "") {
      return [await this._client.sendMessage(chatId, text, options)];
    }

    const { chunks, parseMode } = preprocess(text, {
      style: this._options.style,
      maxChunkLength: this._options.maxChunkLength,
      split: this._options.split,
    });

    // Merge parse_mode from preprocessor (HTML) unless caller already set one
    const baseOptions = { ...options };
    if (parseMode && !baseOptions.parse_mode) {
      baseOptions.parse_mode = parseMode;
    }

    const responses = [];
    for (let i = 0; i < chunks.length; i++) {
      if (i > 0 && this._options.chunkDelayMs > 0) {
        await sleep(this._options.chunkDelayMs);
      }
      const res = await this._client.sendMessage(chatId, chunks[i], baseOptions);
      responses.push(res);
    }

    return responses;
  }

  /**
   * Convenience: disable preprocessing temporarily.
   */
  disable() {
    this._options.enabled = false;
    return this;
  }

  /**
   * Convenience: re-enable preprocessing.
   */
  enable() {
    this._options.enabled = true;
    return this;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Factory helper - wraps any client with minimal boilerplate.
 * @param {object} client
 * @param {object} [options]
 * @returns {TelegramProxy}
 */
export function createProxy(client, options = {}) {
  return new TelegramProxy(client, options);
}
