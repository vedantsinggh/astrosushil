const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const logFile = path.resolve(__dirname, '../../test_output.txt');

function log(msg) {
  console.log(msg);
  fs.appendFileSync(logFile, msg + '\n');
}

async function run() {
  fs.writeFileSync(logFile, '--- OPENROUTER TEST START ---\n');
  const apiKey = process.env.OPENROUTER_API_KEY || '';
  const model = process.env.OPENROUTER_MODEL || '';

  log('OPENROUTER_API_KEY exists: ' + Boolean(apiKey && apiKey.trim().length > 0));
  log('OPENROUTER_API_KEY length: ' + apiKey.length);
  log('OPENROUTER_MODEL: ' + model);

  if (!apiKey) {
    log('No OPENROUTER_API_KEY found in .env');
    return;
  }

  const url = 'https://openrouter.ai/api/v1/chat/completions';
  try {
    log('Sending POST request to OpenRouter...');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'minimax/minimax-m3:free',
        messages: [
          {
            role: 'user',
            content: 'Reply with exactly: HELLO'
          }
        ]
      })
    });

    log('HTTP status: ' + response.status + ' ' + response.statusText);
    const json = await response.json();
    if (!response.ok) {
      log('OpenRouter error body: ' + JSON.stringify(json, null, 2));
    } else {
      log('Response model: ' + json.model);
      log('Response content: ' + JSON.stringify(json.choices?.[0]?.message?.content));
      log('Full response JSON: ' + JSON.stringify(json, null, 2));
    }
  } catch (err) {
    log('Fetch error: ' + String(err));
  }
  log('--- OPENROUTER TEST END ---');
}

run();
