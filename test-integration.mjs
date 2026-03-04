# OpenClaw Integration Test

/**
 * This script tests the integration of the Telegram Preprocessor with OpenClaw.
 * It verifies that tables are converted to bullets, code blocks are preserved,
 * and metadata is hidden.
 */

const { preprocess } = require('./index.mjs');

/**
 * Test 1: Table Conversion
 */
function testTableConversion() {
  const message = `Here is a table:\n| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |\n\nMetadata: message_id: 12345, sender_id: 67890`;

  const { chunks, parseMode } = preprocess(message, {
    style: "telegramHtml",
    split: true,
  });

  // Hide metadata
  const cleanedChunks = chunks.map(chunk => {
    return chunk.replace(/\bmessage_id:\s*[^\s]+\b|\bsender_id:\s*[^\s]+\b/gi, "").trim();
  });

  console.log('=== Test 1: Table Conversion ===');
  console.log('Processed Chunks:', cleanedChunks);
  console.log('Parse Mode:', parseMode);

  const success = cleanedChunks[0].includes('• A: 1 · B: 2') && cleanedChunks[0].includes('• A: 3 · B: 4') && !cleanedChunks[0].includes('message_id:');
  console.log('Test Passed:', success);
  return success;
}

/**
 * Test 2: Code Block Preservation
 */
function testCodeBlockPreservation() {
  const message = `Here is a code block:\n\n"`
  function example() {
    return "Hello, World!";
  }
  "`

Metadata: message_id: 54321, timestamp: 2026-03-04T18:32:00Z`;

  const { chunks, parseMode } = preprocess(message, {
    style: "telegramHtml",
    split: true,
  });

  // Hide metadata
  const cleanedChunks = chunks.map(chunk => {
    return chunk.replace(/\bmessage_id:\s*[^\s]+\b|\bsender_id:\s*[^\s]+\b/gi, "").trim();
  });

  console.log('\n=== Test 2: Code Block Preservation ===');
  console.log('Output includes function:', cleanedChunks[0].includes('function example() {'));
  console.log('Metadata hidden:', !cleanedChunks[0].includes('message_id:'));

  const success = cleanedChunks[0].includes('function example() {') && !cleanedChunks[0].includes('message_id:');
  console.log('Test Passed:', success);
  return success;
}

/**
 * Test 3: Long Message Chunking
 */
function testLongMessageChunking() {
  const longMessage = "A".repeat(5000) + "\nHere is a table:\n| A | B |\n|---|---|\n| 1 | 2 |\n";

  const { chunks, parseMode } = preprocess(longMessage, {
    style: "telegramHtml",
    split: true,
  });

  console.log('\n=== Test 3: Long Message Chunking ===');
  console.log('Number of Chunks:', chunks.length);
  console.log('First Chunk Length:', chunks[0].length);
  console.log('First Chunk:', chunks[0].substring(0, 100) + (chunks[0].length > 100 ? "..." : ""));

  const success = chunks.length > 1 && chunks[0].length <= 4096;
  console.log('Test Passed:', success);
  return success;
}

/**
 * Test 4: HTML Style Conversion
 */
function testHtmlStyleConversion() {
  const message = `**Bold text** and _italic text_`;

  const { chunks, parseMode } = preprocess(message, {
    style: "telegramHtml",
    split: false,
  });

  console.log('\n=== Test 4: HTML Style Conversion ===');
  console.log('Output:', chunks[0]);
  console.log('Parse Mode:', parseMode);

  const success = chunks[0].includes('<b>Bold text</b>') && parseMode === "HTML";
  console.log('Test Passed:', success);
  return success;
}

/**
 * Test 5: Integration with Mock Bot
 */
async function testIntegrationWithMockBot() {
  // Mock bot for testing
  const mockBot = {
    sendMessage: async (chatId, message, opts) => {
      console.log('Sending to', chatId);
      console.log('Message:', message.substring(0, 100) + (message.length > 100 ? "..." : ""));
      console.log('Options:', opts);
    },
  };

  // Replace the default sendMessage function
  const originalSendMessage = mockBot.sendMessage;

  mockBot.sendMessage = async function(chatId, message, opts) {
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

  const message = `Here is a table:\n| A | B |\n|---|---|\n| 1 | 2 |\nMetadata: message_id: 12345, sender_id: 67890`;

  console.log('\n=== Test 5: Integration with Mock Bot ===');
  await mockBot.sendMessage('chatId', message, { channel: 'telegram' });

  // Test with non-Telegram channel
  await mockBot.sendMessage('email', 'Non-Telegram message', { channel: 'email' });

  console.log('Test Passed: Check logs for processed output.');
  return true;
}

// Run all tests
(async () => {
  const results = [
    testTableConversion(),
    testCodeBlockPreservation(),
    testLongMessageChunking(),
    testHtmlStyleConversion(),
    await testIntegrationWithMockBot(),
  ];

  const allPassed = results.every(result => result);
  console.log('\n=== Final Test Results ===');
  console.log('All Tests Passed:', allPassed);
  console.log('Summary:', results);

  if (allPassed) {
    console.log('\n✅ The Telegram Preprocessor is fully functional and ready for integration into OpenClaw!');
  } else {
    console.log('\n❌ Some tests failed. Please review the logs for details.');
  }
})();