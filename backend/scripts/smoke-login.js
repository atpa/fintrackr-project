// Smoke test for FinTrackr API (login endpoint)
// Запускает отдельный процесс сервера и делает несколько запросов
// Позволяет увидеть реальные логи без принудительного завершения процесса терминалом

const { spawn } = require('child_process');
const http = require('http');

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data ? Buffer.byteLength(data) : 0,
      }
    };

    const req = http.request(options, (res) => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body: chunks });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  console.log('[SMOKE] Spawning server process...');
  const serverProc = spawn('node', ['backend/server.js'], { stdio: ['ignore', 'pipe', 'pipe'] });

  serverProc.stdout.on('data', d => process.stdout.write('[SERVER] ' + d.toString()));
  serverProc.stderr.on('data', d => process.stderr.write('[SERVER-ERR] ' + d.toString()));

  serverProc.on('exit', (code) => {
    console.log(`[SMOKE] Server exited with code ${code}`);
  });

  // Ждём пока сервер поднимется
  let ready = false;
  for (let i = 0; i < 20; i++) {
    await wait(250);
    try {
      const ping = await request('GET', '/');
      if (ping.status === 200) { ready = true; break; }
    } catch (_) {}
  }

  if (!ready) {
    console.error('[SMOKE] Server did not become ready in time');
    serverProc.kill('SIGTERM');
    process.exit(1);
  }
  console.log('[SMOKE] Server is ready, starting API checks...');

  // 1. session (ожидаем 401)
  try {
    const sessionResp = await request('GET', '/api/session');
    console.log('[SMOKE] GET /api/session =>', sessionResp.status, sessionResp.body);
  } catch (e) {
    console.error('[SMOKE] GET /api/session ERROR', e);
  }

  // 2. login (ожидаем 401 invalid creds или 200 если пользователь существует)
  try {
    const loginResp = await request('POST', '/api/login', { email: 'smoke@test.com', password: 'wrongpass' });
    console.log('[SMOKE] POST /api/login =>', loginResp.status, loginResp.body);
  } catch (e) {
    console.error('[SMOKE] POST /api/login ERROR', e);
  }

  // Завершаем
  console.log('[SMOKE] Killing server process...');
  serverProc.kill('SIGTERM');
}

run().catch(err => {
  console.error('[SMOKE] Fatal error', err);
  process.exit(1);
});
