// Comprehensive smoke test: register user -> login -> session check
// Русские комментарии согласно принятым правилам.
const { spawn } = require('child_process');
const http = require('http');

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function httpRequest(method, path, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
      ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      ...extraHeaders,
    };
    const options = { hostname: 'localhost', port: 3000, path, method, headers };
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, bodyRaw: raw, body: safeJson(raw) });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function safeJson(str) {
  try { return str ? JSON.parse(str) : null; } catch { return null; }
}

async function waitServer() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await httpRequest('GET', '/', null);
      if (r.status === 200) return true;
    } catch (_) {}
    await wait(250);
  }
  return false;
}

async function run() {
  console.log('[SMOKE-REG] Spawning server...');
  const serverProc = spawn('node', ['backend/server.js'], { stdio: ['pipe', 'pipe', 'pipe'] });
  serverProc.stdout.on('data', d => process.stdout.write('[SERVER] ' + d.toString()));
  serverProc.stderr.on('data', d => process.stderr.write('[SERVER-ERR] ' + d.toString()));
  serverProc.on('exit', code => console.log('[SMOKE-REG] Server exited code', code));

  const ready = await waitServer();
  if (!ready) {
    console.error('[SMOKE-REG] Server not ready');
    serverProc.kill('SIGTERM');
    process.exit(1);
  }
  console.log('[SMOKE-REG] Server ready');

  const email = `smoke+${Date.now()}@test.com`;
  const password = 'pass12345';
  console.log('[SMOKE-REG] Using email', email);

  // 1. Register
  const reg = await httpRequest('POST', '/api/register', { name: 'Smoke User', email, password });
  console.log('[SMOKE-REG] REGISTER status:', reg.status, 'body:', reg.bodyRaw);
  if (reg.status !== 201) {
    console.error('[SMOKE-REG] Registration failed, abort');
    serverProc.kill('SIGTERM');
    process.exit(2);
  }

  // 2. Invalid login attempt (wrong password)
  const badLogin = await httpRequest('POST', '/api/login', { email, password: 'wrong' });
  console.log('[SMOKE-REG] LOGIN bad status:', badLogin.status, 'body:', badLogin.bodyRaw);

  // 3. Valid login
  const goodLogin = await httpRequest('POST', '/api/login', { email, password });
  console.log('[SMOKE-REG] LOGIN good status:', goodLogin.status, 'body:', goodLogin.bodyRaw);
  if (goodLogin.status !== 200) {
    console.error('[SMOKE-REG] Valid login failed');
    serverProc.kill('SIGTERM');
    process.exit(3);
  }

  // 4. Extract cookies
  const setCookie = goodLogin.headers['set-cookie'] || [];
  console.log('[SMOKE-REG] Set-Cookie headers:', setCookie);
  const cookieHeader = setCookie.map(c => c.split(';')[0]).join('; ');

  // 5. Session with cookies
  const session = await httpRequest('GET', '/api/session', null, { Cookie: cookieHeader });
  console.log('[SMOKE-REG] SESSION status:', session.status, 'body:', session.bodyRaw);

  // 6. Duplicate registration (should fail 400 or 409)
  const dup = await httpRequest('POST', '/api/register', { name: 'Smoke User', email, password });
  console.log('[SMOKE-REG] DUP REGISTER status:', dup.status, 'body:', dup.bodyRaw);

  // 7. Logout
  const logout = await httpRequest('POST', '/api/logout', {}, { Cookie: cookieHeader });
  console.log('[SMOKE-REG] LOGOUT status:', logout.status, 'body:', logout.bodyRaw);

  // 8. Session after logout (should be 401)
  const sessionAfter = await httpRequest('GET', '/api/session', null, { Cookie: cookieHeader });
  console.log('[SMOKE-REG] SESSION after logout status:', sessionAfter.status, 'body:', sessionAfter.bodyRaw);

  console.log('[SMOKE-REG] All steps done, terminating server');
  serverProc.kill('SIGTERM');
}

run().catch(e => {
  console.error('[SMOKE-REG] Fatal error', e);
  process.exit(10);
});
