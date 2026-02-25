/**
 * Tests for TelegramProxy
 * Run: node test-proxy.mjs
 */

import { TelegramProxy, createProxy } from "./proxy.mjs";

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function includes(str, sub, msg) {
  if (!str.includes(sub)) throw new Error(`FAIL: ${msg}\n  missing: ${JSON.stringify(sub)}\n  in: ${JSON.stringify(str)}`);
}

function notIncludes(str, sub, msg) {
  if (str.includes(sub)) throw new Error(`FAIL: ${msg}\n  should not contain: ${JSON.stringify(sub)}`);
}

// Mock Telegram client
function makeMockClient() {
  const sent = [];
  return {
    sent,
    async sendMessage(chatId, text, options = {}) {
      sent.push({ chatId, text, options });
      return { message_id: sent.length, chat: { id: chatId }, text };
    },
    async sendPhoto(chatId, photo, options = {}) {
      sent.push({ chatId, photo, options });
      return { message_id: sent.length };
    },
  };
}

// 1) Table is converted to bullets before sending
{
  const client = makeMockClient();
  const bot = new TelegramProxy(client);
  const table = `| Name | Country |
|---|---|
| Toyota | Japan |
| BMW | Germany |`;
  const responses = await bot.sendMessage(123, table);
  assert(responses.length === 1, "one chunk for short table");
  includes(client.sent[0].text, "• Name: Toyota · Country: Japan", "table converted to bullets");
  notIncludes(client.sent[0].text, "|", "no pipes in output");
  console.log("✓ table converted to bullets before sending");
}

// 2) Long message is chunked into multiple sendMessage calls
{
  const client = makeMockClient();
  const bot = new TelegramProxy(client, { chunkDelayMs: 0 });
  const longText = "word ".repeat(1000); // ~5000 chars
  const responses = await bot.sendMessage(456, longText);
  assert(responses.length >= 2, "long message chunked into multiple sends");
  assert(client.sent.length >= 2, "multiple sendMessage calls made");
  console.log(`✓ long message split into ${responses.length} chunks`);
}

// 3) Non-text methods are proxied through untouched
{
  const client = makeMockClient();
  const bot = new TelegramProxy(client);
  await bot.sendPhoto(789, "http://example.com/img.jpg");
  assert(client.sent[0].photo === "http://example.com/img.jpg", "sendPhoto proxied through");
  console.log("✓ non-text methods proxied through untouched");
}

// 4) HTML style sets parse_mode on outgoing messages
{
  const client = makeMockClient();
  const bot = new TelegramProxy(client, { style: "telegramHtml" });
  await bot.sendMessage(101, "**Bold text** and `code`");
  assert(client.sent[0].options.parse_mode === "HTML", "parse_mode HTML set");
  includes(client.sent[0].text, "<b>Bold text</b>", "bold converted to HTML");
  console.log("✓ HTML style sets parse_mode and converts markdown");
}

// 5) Disabled proxy passes message through unmodified
{
  const client = makeMockClient();
  const bot = new TelegramProxy(client);
  bot.disable();
  const table = `| A | B |\n|---|---|\n| 1 | 2 |`;
  await bot.sendMessage(202, table);
  includes(client.sent[0].text, "|", "raw table passed through when disabled");
  console.log("✓ disabled proxy passes message through unmodified");
}

// 6) createProxy factory works the same as constructor
{
  const client = makeMockClient();
  const bot = createProxy(client, { chunkDelayMs: 0 });
  const responses = await bot.sendMessage(303, "Hello, Telegram!");
  assert(responses.length === 1, "factory creates working proxy");
  assert(client.sent[0].text === "Hello, Telegram!", "simple text unchanged");
  console.log("✓ createProxy factory works correctly");
}

// 7) Caller-specified parse_mode is not overridden
{
  const client = makeMockClient();
  const bot = new TelegramProxy(client, { style: "telegramHtml" });
  await bot.sendMessage(404, "some text", { parse_mode: "MarkdownV2" });
  assert(client.sent[0].options.parse_mode === "MarkdownV2", "caller parse_mode preserved");
  console.log("✓ caller-specified parse_mode is not overridden");
}

console.log("\nAll proxy tests passed. ✅");
