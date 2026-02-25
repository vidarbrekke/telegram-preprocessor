/**
 * Regression tests for Telegram format preprocessor.
 * Run: npm test  or  node test.mjs
 */

import { preprocess } from "./index.mjs";
import fs from "node:fs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function eq(a, b, msg) {
  if (a !== b) throw new Error(`${msg}\n  expected: ${JSON.stringify(b)}\n  actual:   ${JSON.stringify(a)}`);
}

function includes(str, sub, msg) {
  if (!str.includes(sub)) throw new Error(`${msg}\n  string: ${JSON.stringify(str)}\n  missing: ${JSON.stringify(sub)}`);
}

function notIncludes(str, sub, msg) {
  if (str.includes(sub)) throw new Error(`${msg}\n  string: ${JSON.stringify(str)}\n  should not contain: ${JSON.stringify(sub)}`);
}

// 1) Converts a real markdown table to bullets
{
  const input = `| Name | Price |
|---|---|
| A | 1 |
| B | 2 |`;
  const { chunks, parseMode } = preprocess(input, { split: false });
  eq(chunks.length, 1, "one chunk");
  includes(chunks[0], "• Name: A · Price: 1", "table row 1");
  includes(chunks[0], "• Name: B · Price: 2", "table row 2");
  notIncludes(chunks[0], "|", "no pipe in output");
  console.log("✓ converts real markdown table to bullets");
}

// 2) Does not convert a table inside ``` fence
{
  const input = `text before
\`\`\`
| A | B |
|---|---|
| 1 | 2 |
\`\`\`
text after`;
  const { chunks } = preprocess(input, { split: false });
  eq(chunks.length, 1, "one chunk");
  includes(chunks[0], "| A | B |", "fenced table preserved");
  includes(chunks[0], "| 1 | 2 |", "fenced table data preserved");
  notIncludes(chunks[0], "• A: 1", "table inside fence not converted");
  console.log("✓ does not convert table inside \`\`\` fence");
}

// 3) Chunking does not split &amp; mid-entity (safe split)
{
  const long = "a".repeat(4080) + " &amp; b";
  const { chunks } = preprocess(long, { split: true });
  assert(chunks.length >= 1, "at least one chunk");
  const hasAmp = chunks.some((c) => c.includes("&amp;"));
  assert(hasAmp, "some chunk has &amp;");
  chunks.forEach((c) => {
    if (c.includes("&")) {
      const idx = c.indexOf("&");
      const rest = c.slice(idx);
      assert(rest.startsWith("&amp;") || /^&#\d+;/.test(rest) || /^&\w+;/.test(rest), "& not split mid-entity");
    }
  });
  console.log("✓ chunking does not split &amp; mid-entity");
}

// 4) Chunking does not break <pre> blocks (pre block stays in one chunk)
{
  const codeBody = "x".repeat(100);
  const preBlock = "<pre><code>" + codeBody + "</code></pre>";
  const long = "a".repeat(4050) + "\n\n" + preBlock;
  const { chunks } = preprocess(long, { style: "telegramHtml", split: true });
  const chunkWithCode = chunks.find((c) => c.includes(codeBody));
  assert(chunkWithCode != null, "some chunk has the code body");
  assert(chunkWithCode.includes(codeBody) && chunkWithCode.indexOf(codeBody) + codeBody.length <= chunkWithCode.length, "code body not split across chunks");
  console.log("✓ chunking does not break <pre> blocks");
}

// 5) Conservative HTML does not italicize foo_bar_baz
{
  const input = "foo_bar_baz and another_thing_here";
  const { chunks } = preprocess(input, { style: "telegramHtml", split: false });
  eq(chunks.length, 1, "one chunk");
  notIncludes(chunks[0], "<i>", "no italic tag from underscores");
  includes(chunks[0], "foo_bar_baz", "text preserved");
  console.log("✓ _italic_ does not italicize foo_bar_baz");
}

// 6) Preserves blank table cells
{
  const input = `| A | B | C |
|---|---|---|
| 1 |  | 3 |`;
  const { chunks } = preprocess(input, { split: false });
  eq(chunks.length, 1, "one chunk");
  includes(chunks[0], "B: —", "empty cell as —");
  includes(chunks[0], "• A: 1 · B: — · C: 3", "row with empty cell");
  console.log("✓ preserves blank table cells");
}

// 7) Pipe-y content that is not a table is not converted
{
  const input = `some log line | with pipes
another | line
no separator here`;
  const { chunks } = preprocess(input, { split: false });
  eq(chunks.length, 1, "one chunk");
  includes(chunks[0], "some log line | with pipes", "pipe line preserved");
  notIncludes(chunks[0], "•", "no bullets from non-table");
  console.log("✓ pipe-y non-table not converted");
}

// 8) Fenced block restored correctly with toHtml
{
  const input = "Hello\n```\ncode here\n```\nWorld";
  const { chunks, parseMode } = preprocess(input, { style: "telegramHtml", split: false });
  eq(parseMode, "HTML", "parseMode HTML");
  includes(chunks[0], "<pre><code>", "fence as pre/code");
  includes(chunks[0], "code here", "code body");
  includes(chunks[0], "</code></pre>", "closed pre/code");
  console.log("✓ fenced block restored as <pre><code> in HTML mode");
}

console.log("\nAll 8 tests passed.");
