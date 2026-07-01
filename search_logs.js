const fs = require('fs');
const readline = require('readline');

async function run() {
  const logPath = 'C:/Users/colla/.gemini/antigravity-ide/brain/7c9c519a-7714-43d8-9bed-885863de2957/.system_generated/logs/transcript.jsonl';
  
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    const entry = JSON.parse(line);
    if (entry.step_index >= 390 && entry.step_index <= 600) {
      if (entry.type === 'USER_INPUT') {
        console.log(`\n=== Step ${entry.step_index} USER ===`);
        console.log(entry.content);
      } else if (entry.source === 'MODEL' && entry.type === 'PLANNER_RESPONSE') {
        console.log(`\n=== Step ${entry.step_index} thinking ===`);
        console.log(entry.thinking);
      } else if (entry.type === 'WALKTHROUGH' || entry.type === 'IMPLEMENTATION_PLAN') {
        console.log(`\n=== Step ${entry.step_index} ${entry.type} ===`);
        console.log(entry.content);
      }
    }
  }
}

run().catch(console.error);
