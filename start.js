const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const secretPath = path.join(__dirname, '.campuslink-secret');
let localSecret = process.env.CAMPUSLINK_AUTH_SECRET;
if (!localSecret) {
  try {
    localSecret = fs.readFileSync(secretPath, 'utf8').trim();
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    localSecret = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(secretPath, localSecret, { mode: 0o600 });
  }
}

const env = {
  ...process.env,
  CAMPUSLINK_AUTH_SECRET: localSecret,
};

const server = spawn(process.execPath, ['server/server.js'], { stdio: 'inherit', env });
const expo = spawn('npx', ['expo', 'start', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});

let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  server.kill();
  expo.kill();
}

server.on('error', (error) => {
  process.stderr.write(`Could not start CampusLink auth server: ${error.message}\n`);
  stop();
});
server.on('exit', (code) => {
  if (!stopping && code !== 0) {
    process.stderr.write('CampusLink auth server stopped unexpectedly.\n');
    stop();
  }
});
expo.on('error', (error) => {
  process.stderr.write(`Could not start Expo: ${error.message}\n`);
  stop();
});
expo.on('exit', (code) => {
  if (!stopping) {
    stopping = true;
    server.kill();
    process.exitCode = code || 0;
  }
});
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
