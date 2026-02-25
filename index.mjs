/**
 * Telegram message preprocessor
 *
 * Makes agent-style content (markdown tables, long blocks, horizontal layout)
 * more readable in Telegram's mobile UI.
 *
 * - Fence-aware: protects ``` and ~~~ code blocks from table/whitespace rewriting
 * - Converts markdown tables to bullet lists (strict detection; preserves empty cells)
 * - Collapses excessive newlines, trims
 * - Chunks at 4096 with safe boundaries (never inside HTML entities or tags)
 * - Optional style: telegramHtml = conservative markdown → HTML per chunk (after split)
 *
 * Usage:
 *   node index.mjs                 # stdin -> stdout (plain)
 *   node index.mjs --html         # conservative HTML
 *   node index.mjs --json
 *
 * Options: style = 'telegramPlain' (default) | 'telegramHtml'
 */

import { fileURLToPath } from "node:url";
import fs from "node:fs";
import process from "node:process";

const TELEGRAM_MAX_LENGTH = 4096;
const FENCE_PLACEHOLDER_PREFIX = "\u0000FENCE";
const FENCE_PLACEHOLDER_SUFFIX = "\u0000";

// Centralized HTML escaping — used everywhere HTML is produced
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Broad fence detection: supports ``` and ~~~, with optional whitespace
function isFenceLine(line) {
  const trimmed = line.trim();
  return (trimmed === "```" || trimmed === "~~~") && trimmed.length >= 3;
}

function extractFencedBlocks(text) {
  const blocks = [];
  // Match both ``` and ~~~, with optional language identifier and trailing whitespace
  const re = /(```|~~~)(\w*)\n([\s\S]*?)\1\s*$/gm;
  const matches = [];
  let match;
  while ((match = re.exec(text)) !== null) {
    matches.push(match);
    blocks.push({ lang: match[2] || "", body: match[3], fenceType: match[1] });
  }
  let out = text;
  for (let i = 0; i < matches.length; i++) {
    const placeholder = `${FENCE_PLACEHOLDER_PREFIX}${i}${FENCE_PLACEHOLDER_SUFFIX}`;
    out = out.replace(matches[i][0], placeholder);
  }
  return { text: out, blocks };
}

function restoreFencedBlocks(text, blocks, toHtml = false) {
  let out = text;
  for (let i = 0; i < blocks.length; i++) {
    const placeholder = `${FENCE_PLACEHOLDER_PREFIX}${i}${FENCE_PLACEHOLDER_SUFFIX}`;
    const { body, fenceType } = blocks[i];
    const escaped = toHtml ? escapeHtml(body) : body;
    const lang = blocks[i].lang ? ` ${blocks[i].lang}` : "";
    const replacement = toHtml
      ? `<pre><code${lang}>${escaped}</code></pre>`
      : `${fenceType}${lang}\n${body}\n${fenceType}\n`;
    out = out.split(placeholder).join(replacement);
  }
  return out;
}

const TABLE_SEPARATOR_RE = /^(\|[\s\-:]+)+\|\s*$/;

function parseRow(line) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((c) => c.trim());
}

function tableToBullets(block) {
  const lines = block.split("\n").map((l) => l.trim());
  if (lines.length < 3) return block;

  const first = lines[0];
  if (!first.includes("|")) return block;
  const sepIdx = lines.findIndex((l, i) => i > 0 && TABLE_SEPARATOR_RE.test(l));
  if (sepIdx < 1) return block;

  const dataLines = lines.slice(sepIdx + 1).filter((l) => l.includes("|"));
  if (dataLines.length === 0) return block;

  const headers = parseRow(first);
  const out = [];

  for (const row of dataLines) {
    const cells = parseRow(row);
    const display = cells.map((c) => (c === "" ? "—" : c));
    if (headers.length === display.length) {
      const pairs = headers.map((h, i) => `${h}: ${display[i]}`).join(" · ");
      out.push(`• ${pairs}`);
    } else {
      out.push(`• ${display.join(" · ")}`);
    }
  }
  return out.join("\n");
}

function processBlock(block) {
  const trimmed = block.trim();
  if (!trimmed) return "";

  const lines = trimmed.split("\n");
  if (lines.length < 3) return trimmed;
  const first = lines[0];
  if (!first.includes("|")) return trimmed;
  const sepIdx = lines.findIndex((l, i) => i > 0 && TABLE_SEPARATOR_RE.test(l));
  if (sepIdx !== 1) return trimmed;
  const dataLines = lines.slice(2).filter((l) => l.includes("|"));
  if (dataLines.length === 0) return trimmed;

  return tableToBullets(trimmed);
}

function normalizeWhitespace(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .trim();
}

function convertTablesToBullets(text) {
  const normalized = normalizeWhitespace(text);
  const blocks = normalized.split(/\n\s*\n/);
  const processed = blocks.map(processBlock).filter(Boolean);
  return processed.join("\n\n");
}

function nextSafeBreak(text, start, maxLen) {
  const slice = text.slice(start, start + maxLen);
  const len = slice.length;
  if (len < maxLen) return start + len;

  let best = start + maxLen;
  const segment = text.slice(start, start + maxLen + 200);

  const entityRe = /&(?:#\d+|#x[\da-fA-F]+|\w+);/g;
  let m;
  while ((m = entityRe.exec(segment)) !== null) {
    const end = start + m.index + m[0].length;
    if (end > start + maxLen && end < best) best = end;
  }

  const tagRe = /<[^>]+>/g;
  while ((m = tagRe.exec(segment)) !== null) {
    const end = start + m.index + m[0].length;
    if (end > start + maxLen && end < best) best = end;
  }

  const preRe = /<pre[\s>][\s\S]*?<\/pre>/g;
  while ((m = preRe.exec(segment)) !== null) {
    const end = start + m.index + m[0].length;
    if (end > start + maxLen && end < best) best = end;
  }

  const lastPara = slice.lastIndexOf("\n\n");
  const lastLine = slice.lastIndexOf("\n");
  const breakAt = lastPara > maxLen * 0.5 ? lastPara + 1 : lastLine > maxLen * 0.5 ? lastLine + 1 : maxLen;
  return start + breakAt;
}

function splitChunksSafe(text, maxLen = TELEGRAM_MAX_LENGTH) {
  if (text.length <= maxLen) return [text];

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const breakAt = nextSafeBreak(text, start, maxLen);
    chunks.push(text.slice(start, breakAt).trim());
    start = breakAt;
    while (start < text.length && (text[start] === "\n" || text[start] === " ")) start++;
  }

  return chunks.filter(Boolean);
}

function markdownToTelegramHtmlConservative(text) {
  let out = escapeHtml(text);
  out = out.replace(/^##\s+(.+)$/gm, "<b>$1</b>");
  out = out.replace(/\*\*([^*\n]{1,80})\*\*/g, "<b>$1</b>");
  out = out.replace(/(?<!\w)`([^`]+)`(?!\w)/g, "<code>$1</code>");
  return out;
}

/**
 * Main pipeline: fence protect → normalize + tables → split (safe) → per-chunk optional HTML.
 * @param {string} text
 * @param {{ style?: 'telegramPlain'|'telegramHtml', toHtml?: boolean, maxChunkLength?: number, split?: boolean }} options
 * @returns {{ chunks: string[], parseMode: 'HTML' | null }}
 */
export function preprocess(text, options = {}) {
  const {
    style: styleOpt,
    toHtml: toHtmlLegacy,
    maxChunkLength = TELEGRAM_MAX_LENGTH,
    split = true,
  } = options;
  const style = styleOpt ?? (toHtmlLegacy ? "telegramHtml" : "telegramPlain");
  const toHtml = style === "telegramHtml";
  if (typeof text !== "string") return { chunks: [""], parseMode: null };

  const { text: withoutFences, blocks } = extractFencedBlocks(text);
  let content = convertTablesToBullets(withoutFences);
  content = restoreFencedBlocks(content, blocks, false);

  const chunks = split ? splitChunksSafe(content, maxChunkLength) : [content];
  const finalChunks = toHtml
    ? chunks.map((chunk) => {
        const { text: noF, blocks: b } = extractFencedBlocks(chunk);
        const transformed = markdownToTelegramHtmlConservative(noF);
        return restoreFencedBlocks(transformed, b, true);
      })
    : chunks;

  const parseMode = toHtml ? "HTML" : null;
  return { chunks: finalChunks, parseMode };
}

// CLI
function main() {
  const args = process.argv.slice(2);
  const jsonOut = args.includes("--json");
  const style = args.includes("--html") ? "telegramHtml" : "telegramPlain";

  let inputText = "";
  // Check for --text flag first
  const textIdx = args.findIndex((a) => a === "--text");
  if (textIdx >= 0 && textIdx < args.length - 1) {
    inputText = args[textIdx + 1];
  } else if (process.stdin && !process.stdin.isTTY) {
    // Read from stdin if piped
    inputText = fs.readFileSync(0, "utf8");
  }
  // If TTY and no --text, input stays empty

  const result = preprocess(inputText, { style, split: true });
  if (jsonOut) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const out = result.chunks.join("\n\n---\n\n");
    if (out.length > 0) console.log(out);
  }
}

// Entry point
const __filename = fileURLToPath(import.meta.url);
const entryArg = process.argv && process.argv[1] ? process.argv[1] : "";
const isEntryScript =
  entryArg.length > 0 &&
  (entryArg === __filename ||
    entryArg.endsWith("telegram-format-preprocessor.mjs") ||
    entryArg.endsWith("index.mjs"));

// Always call main if this script is run directly (has arguments)
const shouldCallMain = isEntryScript || (process.argv && process.argv.length > 1);

if (shouldCallMain) {
  main();
}
