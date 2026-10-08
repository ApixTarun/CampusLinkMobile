const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);
const PORT = Number(process.env.PORT || 4000);
const SECRET = process.env.CAMPUSLINK_AUTH_SECRET || '';
const STORE_DIR = process.env.CAMPUSLINK_DATA_DIR || path.join(__dirname, 'data');
const STORE_FILE = path.join(STORE_DIR, 'students.json');
const sessions = new Map();
const loginAttempts = new Map();
let transactionQueue = Promise.resolve();
const PASSWORD_POLICY = { N: 1 << 17, r: 8, p: 1, keylen: 64 };

if (Buffer.byteLength(SECRET) < 32) {
  process.stderr.write('Set CAMPUSLINK_AUTH_SECRET to a random secret of at least 32 bytes. See README.md.\n');
  process.exit(1);
}

async function readUsers() {
  await fs.mkdir(STORE_DIR, { recursive: true });
  try {
    const content = await fs.readFile(STORE_FILE, 'utf8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed.users) ? parsed.users : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function transactUsers(action) {
  const transaction = transactionQueue.then(async () => {
    const users = await readUsers();
    const result = await action(users);
    if (!result.save) return result;
    await fs.mkdir(STORE_DIR, { recursive: true });
    const tempFile = `${STORE_FILE}.${process.pid}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify({ users }), { encoding: 'utf8', mode: 0o600 });
    await fs.rename(tempFile, STORE_FILE);
    return result;
  });
  transactionQueue = transaction.then(() => undefined, () => undefined);
  return transaction;
}

function publicUser(user) {
  return { id: user.id, name: user.name, college: user.college, email: user.email };
}

function json(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  });
  res.end(JSON.stringify(data));
}

async function bodyJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > 32 * 1024) throw Object.assign(new Error('Request too large.'), { status: 413 });
  }
  try { return body ? JSON.parse(body) : {}; } catch { throw Object.assign(new Error('Invalid request.'), { status: 400 }); }
}

function normalizeEmail(value) { return String(value || '').trim().toLowerCase(); }
function normalizeRegistration(value) { return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function registrationDigest(registrationNo) {
  return crypto.createHmac('sha256', SECRET).update(`student-registration:${registrationNo}`).digest('hex');
}

function issueToken(user) {
  const now = Math.floor(Date.now() / 1000);
  for (const [id, session] of sessions) if (session.expiresAt <= now) sessions.delete(id);
  const claims = { sub: user.id, jti: crypto.randomUUID(), iat: now, exp: now + 60 * 60 };
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const unsigned = `${header}.${payload}`;
  const signature = crypto.createHmac('sha256', SECRET).update(unsigned).digest('base64url');
  sessions.set(claims.jti, { userId: user.id, expiresAt: claims.exp });
  return `${unsigned}.${signature}`;
}

function authenticate(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const unsigned = `${parts[0]}.${parts[1]}`;
  const expected = crypto.createHmac('sha256', SECRET).update(unsigned).digest();
  let supplied;
  try { supplied = Buffer.from(parts[2], 'base64url'); } catch { return null; }
  if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) return null;
  let claims;
  try { claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')); } catch { return null; }
  const session = sessions.get(claims.jti);
  if (!session || session.userId !== claims.sub || claims.exp <= Date.now() / 1000) return null;
  return { claims, session };
}

function rateLimitKey(req, email) { return `${req.socket.remoteAddress || 'unknown'}:${email}`; }
function checkLoginLimit(key) {
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record || record.resetAt <= now) {
    loginAttempts.set(key, { count: 0, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  return record.count < 5;
}
function recordFailedLogin(key) {
  const record = loginAttempts.get(key);
  if (record) record.count += 1;
}
function clearLoginFailures(key) { loginAttempts.delete(key); }

async function handle(req, res) {
  if (req.method === 'GET' && req.url === '/health') return json(res, 200, { ok: true });

  if (req.method === 'POST' && req.url === '/api/auth/register') {
    const data = await bodyJson(req);
    const name = String(data.name || '').trim();
    const college = String(data.college || '').trim();
    const email = normalizeEmail(data.email);
    const registrationNo = normalizeRegistration(data.registrationNo);
    const password = String(data.password || '');
    if (name.length < 2 || name.length > 100) return json(res, 400, { error: 'Enter a valid student name.' });
    if (college.length < 3 || college.length > 180) return json(res, 400, { error: 'Choose or enter your college.' });
    if (registrationNo.length < 3 || registrationNo.length > 40) return json(res, 400, { error: 'Enter a valid registration number.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return json(res, 400, { error: 'Enter a valid email address.' });
    if ([...password].length < 15 || [...password].length > 128) return json(res, 400, { error: 'Use a passphrase with 15–128 characters.' });

    const regDigest = registrationDigest(registrationNo);
    const salt = crypto.randomBytes(16);
    const passwordHash = await scrypt(password, salt, PASSWORD_POLICY.keylen, {
      N: PASSWORD_POLICY.N, r: PASSWORD_POLICY.r, p: PASSWORD_POLICY.p, maxmem: 256 * 1024 * 1024,
    });
    const user = {
      id: crypto.randomUUID(), name, college, email, registrationDigest: regDigest,
      passwordHash: passwordHash.toString('hex'), passwordSalt: salt.toString('hex'),
      passwordParams: PASSWORD_POLICY,
      createdAt: new Date().toISOString(),
    };
    const result = await transactUsers((users) => {
      if (users.some((item) => item.email === email)) return { status: 409, error: 'An account already exists for that email. Try logging in.' };
      if (users.some((item) => item.registrationDigest === regDigest)) return { status: 409, error: 'That student registration number is already in use.' };
      users.push(user);
      return { save: true, status: 201, user };
    });
    if (result.status !== 201) return json(res, result.status, { error: result.error });
    return json(res, 201, { user: publicUser(result.user), token: issueToken(result.user) });
  }

  if (req.method === 'POST' && req.url === '/api/auth/login') {
    const data = await bodyJson(req);
    const email = normalizeEmail(data.email);
    const password = String(data.password || '');
    const key = rateLimitKey(req, email);
    if (!checkLoginLimit(key)) return json(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' });
    const users = await readUsers();
    const user = users.find((candidate) => candidate.email === email);
    let valid = false;
    if (user && password.length <= 512) {
      const params = user.passwordParams || PASSWORD_POLICY;
      const calculated = await scrypt(password, Buffer.from(user.passwordSalt, 'hex'), params.keylen, {
        N: params.N, r: params.r, p: params.p, maxmem: 256 * 1024 * 1024,
      });
      const expected = Buffer.from(user.passwordHash, 'hex');
      valid = expected.length === calculated.length && crypto.timingSafeEqual(expected, calculated);
    }
    if (!valid) {
      recordFailedLogin(key);
      return json(res, 401, { error: 'Email or password is incorrect.' });
    }
    clearLoginFailures(key);
    return json(res, 200, { user: publicUser(user), token: issueToken(user) });
  }

  if (req.method === 'GET' && req.url === '/api/auth/me') {
    const auth = authenticate(req);
    if (!auth) return json(res, 401, { error: 'Please log in again.' });
    const user = (await readUsers()).find((item) => item.id === auth.claims.sub);
    return user ? json(res, 200, { user: publicUser(user) }) : json(res, 401, { error: 'Please log in again.' });
  }

  if (req.method === 'POST' && req.url === '/api/auth/logout') {
    const auth = authenticate(req);
    if (auth) sessions.delete(auth.claims.jti);
    return json(res, 200, { ok: true });
  }
  return json(res, 404, { error: 'Not found.' });
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((error) => {
    process.stderr.write(`${error.stack || error}\n`);
    if (!res.headersSent) json(res, error.status || 500, { error: error.status ? error.message : 'Request could not be completed.' });
    else res.destroy();
  });
});

server.listen(PORT, '0.0.0.0', () => process.stdout.write(`CampusLink auth API listening on port ${PORT}.\n`));
