const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');

let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  process.stderr.write(`Optional nodemailer not available: ${e.message}\n`);
}

const scrypt = promisify(crypto.scrypt);
const PORT = Number(process.env.PORT || 4000);
const secretPath = path.join(__dirname, '..', '.campuslink-secret');
let SECRET = process.env.CAMPUSLINK_AUTH_SECRET || '';
if (!SECRET) {
  try {
    const fsSync = require('node:fs');
    SECRET = fsSync.readFileSync(secretPath, 'utf8').trim();
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    SECRET = crypto.randomBytes(32).toString('hex');
    try { require('node:fs').writeFileSync(secretPath, SECRET, { mode: 0o600 }); } catch {}
  }
}
const STORE_DIR = process.env.CAMPUSLINK_DATA_DIR || path.join(__dirname, 'data');
const STORE_FILE = path.join(STORE_DIR, 'students.json');
const SESSION_FILE = path.join(STORE_DIR, 'sessions.json');
const RESET_TOKENS_FILE = path.join(STORE_DIR, 'reset_tokens.json');
const APPLICATIONS_FILE = path.join(STORE_DIR, 'applications.json');
const JOBS_FILE = path.join(STORE_DIR, 'jobs.json');
const DRIVES_FILE = path.join(STORE_DIR, 'drives.json');
const DIST_DIR = path.join(__dirname, '..', 'dist');

async function readJsonFile(filePath, defaultValue = []) {
  await fs.mkdir(STORE_DIR, { recursive: true });
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch (error) {
    return defaultValue;
  }
}

async function writeJsonFile(filePath, data) {
  await fs.mkdir(STORE_DIR, { recursive: true });
  const tempFile = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tempFile, filePath);
}

const sessions = new Map();
const resetTokens = new Map();
const loginAttempts = new Map();

let transactionQueue = Promise.resolve();
let sessionWriteQueue = Promise.resolve();
let resetTokenWriteQueue = Promise.resolve();

const PASSWORD_POLICY = { N: 1 << 17, r: 8, p: 1, keylen: 64 };

if (Buffer.byteLength(SECRET) < 32) {
  process.stderr.write('Set CAMPUSLINK_AUTH_SECRET to a random secret of at least 32 bytes. See README.md.\n');
  process.exit(1);
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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

async function loadSessions() {
  await fs.mkdir(STORE_DIR, { recursive: true });
  try {
    const content = await fs.readFile(SESSION_FILE, 'utf8');
    const storedSessions = JSON.parse(content);
    const now = Math.floor(Date.now() / 1000);
    for (const [id, session] of storedSessions) {
      if (session.expiresAt > now) sessions.set(id, session);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

function persistSessions() {
  const snapshot = JSON.stringify([...sessions]);
  const transaction = sessionWriteQueue.then(async () => {
    const tempFile = `${SESSION_FILE}.${process.pid}.tmp`;
    await fs.writeFile(tempFile, snapshot, { encoding: 'utf8', mode: 0o600 });
    await fs.rename(tempFile, SESSION_FILE);
  });
  sessionWriteQueue = transaction.then(() => undefined, () => undefined);
  return transaction;
}

async function loadResetTokens() {
  await fs.mkdir(STORE_DIR, { recursive: true });
  try {
    const content = await fs.readFile(RESET_TOKENS_FILE, 'utf8');
    const parsed = JSON.parse(content);
    const now = Date.now();
    for (const [token, data] of parsed) {
      if (data && data.expiresAt > now) resetTokens.set(token, data);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') process.stderr.write(`Could not load reset tokens: ${error.message}\n`);
  }
}

function persistResetTokens() {
  const now = Date.now();
  for (const [token, data] of resetTokens) {
    if (data.expiresAt <= now) resetTokens.delete(token);
  }
  const snapshot = JSON.stringify([...resetTokens]);
  const transaction = resetTokenWriteQueue.then(async () => {
    const tempFile = `${RESET_TOKENS_FILE}.${process.pid}.tmp`;
    await fs.writeFile(tempFile, snapshot, { encoding: 'utf8', mode: 0o600 });
    await fs.rename(tempFile, RESET_TOKENS_FILE);
  });
  resetTokenWriteQueue = transaction.then(() => undefined, () => undefined);
  return transaction;
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
  return {
    id: user.id,
    name: user.name,
    role: user.role || 'Student',
    company: user.company || '',
    college: user.college || '',
    designation: user.designation || '',
    email: user.email,
  };
}

function json(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, PATCH, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

function html(res, status, content) {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(content);
}

async function serveStatic(res, pathname) {
  try {
    let filePath = path.join(DIST_DIR, pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, ''));
    let stats;
    try {
      stats = await fs.stat(filePath);
      if (stats.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
        stats = await fs.stat(filePath);
      }
    } catch {
      filePath = path.join(DIST_DIR, 'index.html');
      stats = await fs.stat(filePath);
    }
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.webp': 'image/webp',
      '.woff2': 'font/woff2',
      '.woff': 'font/woff',
      '.ttf': 'font/ttf',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const content = await fs.readFile(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000',
    });
    res.end(content);
    return true;
  } catch {
    return false;
  }
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
function normalizePassword(value) {
  const p = String(value || '');
  return p.length < 15 ? `${p}#CLPassphrase15` : p;
}

function registrationDigest(registrationNo) {
  return crypto.createHmac('sha256', SECRET).update(`student-registration:${registrationNo}`).digest('hex');
}

async function issueToken(user) {
  const now = Math.floor(Date.now() / 1000);
  for (const [id, session] of sessions) if (session.expiresAt <= now) sessions.delete(id);
  const claims = { sub: user.id, jti: crypto.randomUUID(), iat: now, exp: now + 30 * 24 * 60 * 60 };
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const unsigned = `${header}.${payload}`;
  const signature = crypto.createHmac('sha256', SECRET).update(unsigned).digest('base64url');
  sessions.set(claims.jti, { userId: user.id, expiresAt: claims.exp });
  await persistSessions();
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

function getBaseUrl(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, '');
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || (req.socket.encrypted ? 'https' : 'http');
  const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
  return `${proto}://${host}`;
}

function createMailTransporter() {
  if (!nodemailer) return null;
  const user = process.env.SMTP_USER || process.env.CAMPUSLINK_EMAIL_USER || '';
  const pass = process.env.SMTP_PASS || process.env.CAMPUSLINK_EMAIL_PASS || '';
  if (!user || !pass) return null;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || (host === 'smtp.gmail.com' ? 465 : 587));
  const secure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

async function sendResetEmail({ email, resetUrl }) {
  const transporter = createMailTransporter();
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset your CampusLink password</title>
</head>
<body style="margin:0;padding:24px;background-color:#0B1024;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#FFFFFF;">
  <div style="max-width:480px;margin:0 auto;background:#131E33;border-radius:16px;padding:32px 24px;border:1px solid #233454;">
    <div style="color:#75E6DE;font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;">CAMPUSLINK · PASSWORD RECOVERY</div>
    <h2 style="margin:0 0 16px;color:#FFFFFF;font-size:22px;font-weight:800;">Reset your password</h2>
    <p style="color:#CBD5E1;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Hello,<br/><br/>
      We received a request to reset the password for your CampusLink account (<strong>${escapeHtml(email)}</strong>).
      Click the button below to enter and confirm your new password:
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${resetUrl}" style="background-color:#5865F2;color:#FFFFFF;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">Reset Password &rarr;</a>
    </div>
    <p style="color:#94A3B8;font-size:12px;line-height:1.5;margin:0 0 16px;">
      If the button above doesn't work, copy and paste this link in your browser:<br/>
      <a href="${resetUrl}" style="color:#75E6DE;word-break:break-all;">${resetUrl}</a>
    </p>
    <p style="color:#64748B;font-size:11px;margin:0;border-top:1px solid #1E2D4A;padding-top:16px;line-height:1.4;">
      This link will expire in 1 hour. If you did not request this, you can safely ignore this email; your password will remain unchanged.
    </p>
  </div>
</body>
</html>`;

  if (!transporter) {
    process.stdout.write(`[CampusLink Mail] SMTP credentials not configured. Password reset link for ${email}: ${resetUrl}\n`);
    return { sent: false, reason: 'smtp_not_configured' };
  }

  try {
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || process.env.CAMPUSLINK_EMAIL_USER;
    await transporter.sendMail({
      from: `"CampusLink" <${fromAddress}>`,
      to: email,
      subject: 'CampusLink - Password Reset Link',
      text: `Hello,\n\nYou requested a password reset for ${email}.\nOpen this link to enter and confirm your new password:\n${resetUrl}\n\nThis link expires in 1 hour.\nIf you did not request this, please ignore this email.`,
      html: htmlContent,
    });
    process.stdout.write(`[CampusLink Mail] Password reset email delivered to ${email}\n`);
    return { sent: true };
  } catch (error) {
    process.stderr.write(`[CampusLink Mail] Could not send email to ${email}: ${error.message}\n`);
    return { sent: false, error: error.message };
  }
}

function renderResetFormPage({ token, email }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password - CampusLink</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: #0B1024; color: #FFFFFF; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { background: #131E33; border: 1px solid #233454; border-radius: 20px; max-width: 440px; width: 100%; padding: 32px 26px; box-shadow: 0 24px 48px rgba(0,0,0,0.5); }
    .brand-row { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; }
    .brand-icon { width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #3269E8, #75E6DE); display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 18px; color: #0B1024; }
    .brand-name { font-size: 15px; font-weight: 800; letter-spacing: 1px; color: #FFFFFF; }
    .brand-name span { color: #75E6DE; }
    h1 { font-size: 24px; font-weight: 800; margin-bottom: 6px; color: #FFFFFF; }
    p.sub { font-size: 13px; color: #94A3B8; margin-bottom: 20px; line-height: 1.5; }
    .email-box { background: rgba(117, 230, 222, 0.08); border: 1px solid rgba(117, 230, 222, 0.25); border-radius: 10px; padding: 12px 14px; margin-bottom: 22px; }
    .email-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: #75E6DE; font-weight: 700; margin-bottom: 3px; }
    .email-val { font-size: 14px; color: #FFFFFF; font-weight: 600; word-break: break-all; }
    label { display: block; font-size: 13px; font-weight: 600; color: #E2E8F0; margin-bottom: 7px; }
    .input-wrap { position: relative; margin-bottom: 16px; }
    input { width: 100%; background: #0A1224; border: 1px solid #2A3B5C; border-radius: 10px; padding: 14px 44px 14px 14px; color: #FFFFFF; font-size: 15px; outline: none; transition: border-color 0.2s; }
    input:focus { border-color: #5865F2; }
    .eye-btn { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #94A3B8; cursor: pointer; padding: 6px; font-size: 16px; user-select: none; }
    .hint { font-size: 12px; color: #64748B; margin-top: -8px; margin-bottom: 22px; line-height: 1.4; }
    .btn { width: 100%; background: #5865F2; color: #FFFFFF; border: none; border-radius: 12px; padding: 15px; font-size: 15px; font-weight: 700; cursor: pointer; transition: background 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .btn:hover { background: #4752C4; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .alert { display: none; padding: 12px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 18px; line-height: 1.4; }
    .alert-err { background: rgba(225, 29, 72, 0.15); border: 1px solid #E11D48; color: #FDA4AF; }
    .success-card { display: none; text-align: center; padding: 10px 0; }
    .success-icon { font-size: 48px; margin-bottom: 14px; }
    .success-title { font-size: 20px; font-weight: 800; color: #75E6DE; margin-bottom: 10px; }
    .success-desc { font-size: 14px; color: #CBD5E1; line-height: 1.6; margin-bottom: 24px; }
    .app-link { display: inline-block; background: #3269E8; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand-row">
      <div class="brand-icon">C</div>
      <div class="brand-name">CAMPUS<span>LINK</span></div>
    </div>
    <div id="form-section">
      <h1>Reset your password</h1>
      <p class="sub">Choose a new password to restore access to your account.</p>
      <div class="email-box">
        <div class="email-label">Account</div>
        <div class="email-val">${escapeHtml(email)}</div>
      </div>
      <div id="alert-box" class="alert alert-err"></div>
      <form id="reset-form">
        <label for="newPass">New Password</label>
        <div class="input-wrap">
          <input type="password" id="newPass" placeholder="Enter new password (min 8 chars)" required minlength="8" />
          <button type="button" class="eye-btn" onclick="togglePass('newPass')">👁️</button>
        </div>
        <label for="confPass">Confirm New Password</label>
        <div class="input-wrap">
          <input type="password" id="confPass" placeholder="Re-enter new password" required minlength="8" />
          <button type="button" class="eye-btn" onclick="togglePass('confPass')">👁️</button>
        </div>
        <p class="hint">Choose a secure password with at least 8 characters. Make sure both passwords match.</p>
        <button type="submit" id="submit-btn" class="btn">Update Password &rarr;</button>
      </form>
    </div>
    <div id="success-section" class="success-card">
      <div class="success-icon">✅</div>
      <div class="success-title">Password Successfully Updated!</div>
      <p class="success-desc">
        Aapka naya password save ho gaya hai.<br/><br/>
        Ab aap apne mobile phone par <strong>CampusLink</strong> app khol kar naye password se login kar sakte hain.
      </p>
      <a href="campuslink://" class="app-link">Open CampusLink App &rarr;</a>
    </div>
  </div>
  <script>
    function togglePass(id) {
      var el = document.getElementById(id);
      el.type = el.type === 'password' ? 'text' : 'password';
    }
    var form = document.getElementById('reset-form');
    var btn = document.getElementById('submit-btn');
    var alertBox = document.getElementById('alert-box');
    var formSection = document.getElementById('form-section');
    var successSection = document.getElementById('success-section');

    function showError(msg) {
      alertBox.textContent = msg;
      alertBox.style.display = 'block';
    }

    form.onsubmit = function(e) {
      e.preventDefault();
      alertBox.style.display = 'none';
      var newPass = document.getElementById('newPass').value;
      var confPass = document.getElementById('confPass').value;
      if (newPass.length < 8) {
        showError('New password must have at least 8 characters.');
        return;
      }
      if (newPass !== confPass) {
        showError('New password and confirmation password do not match.');
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Updating password...';

      fetch('/api/auth/reset-password-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: '${escapeHtml(token)}', newPassword: newPass })
      })
      .then(function(res) {
        return res.json().then(function(data) {
          if (!res.ok) throw new Error(data.error || 'Failed to reset password.');
          return data;
        });
      })
      .then(function() {
        formSection.style.display = 'none';
        successSection.style.display = 'block';
      })
      .catch(function(err) {
        btn.disabled = false;
        btn.innerHTML = 'Update Password &rarr;';
        showError(err.message || 'Something went wrong.');
      });
    };
  </script>
</body>
</html>`;
}

function renderInvalidResetPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invalid Link - CampusLink</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: #0B1024; color: #FFFFFF; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { background: #131E33; border: 1px solid #233454; border-radius: 20px; max-width: 440px; width: 100%; padding: 36px 28px; text-align: center; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 800; color: #FF8790; margin-bottom: 12px; }
    p { font-size: 14px; color: #94A3B8; line-height: 1.6; margin-bottom: 24px; }
    .brand { font-size: 12px; font-weight: 800; letter-spacing: 1px; color: #75E6DE; text-transform: uppercase; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">CampusLink</div>
    <div class="icon">⚠️</div>
    <h1>Link Expired or Invalid</h1>
    <p>
      Yeh password reset link expire ho chuka hai ya pehle hi use ho chuka hai.<br/><br/>
      Kripya CampusLink mobile app me jakar <strong>Forgot Password</strong> option se naya reset link request karein.
    </p>
  </div>
</body>
</html>`;
}

async function handle(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, PATCH, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, 'http://localhost');

  if (req.method === 'GET' && parsedUrl.pathname === '/health') return json(res, 200, { ok: true });

  if (req.method === 'GET' && parsedUrl.pathname === '/reset-password') {
    const token = parsedUrl.searchParams.get('token');
    const record = token ? resetTokens.get(token) : null;
    const now = Date.now();
    if (!token || !record || record.expiresAt <= now) {
      return html(res, 400, renderInvalidResetPage());
    }
    return html(res, 200, renderResetFormPage({ token, email: record.email }));
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/api/auth/register') {
    const data = await bodyJson(req);
    const role = data.role === 'Recruiter' ? 'Recruiter' : data.role === 'Placement' ? 'Placement' : 'Student';
    const name = String(data.name || '').trim();
    const email = normalizeEmail(data.email);
    const password = String(data.password || '');

    if (name.length < 2 || name.length > 100) return json(res, 400, { error: 'Enter your full name.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return json(res, 400, { error: 'Enter a valid email address.' });
    if ([...password].length < 8 || [...password].length > 128) return json(res, 400, { error: 'Use a password with at least 8 characters.' });

    let company = '';
    let college = '';
    let designation = String(data.designation || '').trim();
    let regDigest = null;

    if (role === 'Recruiter') {
      company = String(data.company || '').trim();
      if (company.length < 2 || company.length > 100) return json(res, 400, { error: 'Enter your company or organization name.' });
    } else if (role === 'Placement') {
      college = String(data.college || '').trim();
      if (college.length < 3 || college.length > 180) return json(res, 400, { error: 'Choose or enter your college or institution name.' });
    } else {
      college = String(data.college || '').trim();
      const registrationNo = normalizeRegistration(data.registrationNo);
      if (college.length < 3 || college.length > 180) return json(res, 400, { error: 'Choose or enter your college.' });
      if (registrationNo.length < 3 || registrationNo.length > 40) return json(res, 400, { error: 'Enter a valid registration number.' });
      regDigest = registrationDigest(registrationNo);
    }

    const salt = crypto.randomBytes(16);
    const passwordHash = await scrypt(password, salt, PASSWORD_POLICY.keylen, {
      N: PASSWORD_POLICY.N, r: PASSWORD_POLICY.r, p: PASSWORD_POLICY.p, maxmem: 256 * 1024 * 1024,
    });
    const user = {
      id: crypto.randomUUID(),
      role,
      name,
      email,
      company,
      college,
      designation,
      registrationDigest: regDigest,
      passwordHash: passwordHash.toString('hex'),
      passwordSalt: salt.toString('hex'),
      passwordParams: PASSWORD_POLICY,
      createdAt: new Date().toISOString(),
    };
    const result = await transactUsers((users) => {
      if (users.some((item) => item.email === email)) return { status: 409, error: 'An account already exists for that email. Try logging in.' };
      if (regDigest && users.some((item) => item.registrationDigest === regDigest)) return { status: 409, error: 'That student registration number is already in use.' };
      users.push(user);
      return { save: true, status: 201, user };
    });
    if (result.status !== 201) return json(res, result.status, { error: result.error });
    return json(res, 201, { user: publicUser(result.user), token: await issueToken(result.user) });
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/api/auth/login') {
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
    return json(res, 200, { user: publicUser(user), token: await issueToken(user) });
  }

  // Request password reset link (dispatches email with link)
  if (req.method === 'POST' && parsedUrl.pathname === '/api/auth/forgot-password') {
    const data = await bodyJson(req);
    const email = normalizeEmail(data.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return json(res, 400, { error: 'Enter a valid registered email address.' });
    }
    const users = await readUsers();
    const user = users.find((candidate) => candidate.email === email);
    if (!user) {
      return json(res, 404, { error: 'No account registered with that email address. Check email or register first.' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour validity
    resetTokens.set(token, { email, expiresAt });
    await persistResetTokens();

    const baseUrl = getBaseUrl(req);
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    const mailResult = await sendResetEmail({ email, resetUrl });

    return json(res, 200, {
      ok: true,
      message: 'Password reset link aapke email par bhej diya gaya hai.',
      resetUrl,
      emailSent: Boolean(mailResult.sent),
    });
  }

  // Update password via reset token submitted from the web page
  if (req.method === 'POST' && parsedUrl.pathname === '/api/auth/reset-password-token') {
    const data = await bodyJson(req);
    const token = String(data.token || '').trim();
    const rawPassword = String(data.newPassword || data.password || '');
    const record = token ? resetTokens.get(token) : null;
    const now = Date.now();
    if (!token || !record || record.expiresAt <= now) {
      return json(res, 400, { error: 'This password reset link is invalid or has expired. Please request a new link.' });
    }
    if ([...rawPassword].length < 8 || [...rawPassword].length > 128) {
      return json(res, 400, { error: 'Use a password with at least 8 characters.' });
    }
    const newPassword = normalizePassword(rawPassword);
    const salt = crypto.randomBytes(16);
    const passwordHash = await scrypt(newPassword, salt, PASSWORD_POLICY.keylen, {
      N: PASSWORD_POLICY.N, r: PASSWORD_POLICY.r, p: PASSWORD_POLICY.p, maxmem: 256 * 1024 * 1024,
    });
    const result = await transactUsers((users) => {
      const user = users.find((item) => item.email === record.email);
      if (!user) return { status: 404, error: 'No account found for this reset link.' };
      user.passwordHash = passwordHash.toString('hex');
      user.passwordSalt = salt.toString('hex');
      user.passwordParams = PASSWORD_POLICY;
      user.updatedAt = new Date().toISOString();
      return { save: true, status: 200, user };
    });
    if (result.status !== 200) return json(res, result.status, { error: result.error });

    resetTokens.delete(token);
    await persistResetTokens();
    return json(res, 200, { ok: true, message: 'Password has been updated successfully. You can now log in.' });
  }

  // Legacy direct reset endpoint (kept for backward compatibility)
  if (req.method === 'POST' && parsedUrl.pathname === '/api/auth/reset-password') {
    const data = await bodyJson(req);
    const email = normalizeEmail(data.email);
    const rawPassword = String(data.newPassword || data.password || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return json(res, 400, { error: 'Enter a valid email address.' });
    }
    if ([...rawPassword].length < 8 || [...rawPassword].length > 128) {
      return json(res, 400, { error: 'Use a password with at least 8 characters.' });
    }
    const newPassword = normalizePassword(rawPassword);
    const salt = crypto.randomBytes(16);
    const passwordHash = await scrypt(newPassword, salt, PASSWORD_POLICY.keylen, {
      N: PASSWORD_POLICY.N, r: PASSWORD_POLICY.r, p: PASSWORD_POLICY.p, maxmem: 256 * 1024 * 1024,
    });
    const result = await transactUsers((users) => {
      const user = users.find((item) => item.email === email);
      if (!user) return { status: 404, error: 'No account registered with that email address. Check email or register first.' };
      user.passwordHash = passwordHash.toString('hex');
      user.passwordSalt = salt.toString('hex');
      user.passwordParams = PASSWORD_POLICY;
      user.updatedAt = new Date().toISOString();
      return { save: true, status: 200, user };
    });
    if (result.status !== 200) return json(res, result.status, { error: result.error });
    return json(res, 200, { ok: true, message: 'Password reset successfully. You can now log in.', user: publicUser(result.user) });
  }

  if (req.method === 'GET' && parsedUrl.pathname === '/api/auth/me') {
    const auth = authenticate(req);
    if (!auth) return json(res, 401, { error: 'Please log in again.' });
    const user = (await readUsers()).find((item) => item.id === auth.claims.sub);
    return user ? json(res, 200, { user: publicUser(user) }) : json(res, 401, { error: 'Please log in again.' });
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/api/auth/logout') {
    const auth = authenticate(req);
    if (auth) {
      sessions.delete(auth.claims.jti);
      await persistSessions();
    }
    return json(res, 200, { ok: true });
  }

  // --- Students Roster for Recruiters and Placement Officers ---
  if (req.method === 'GET' && parsedUrl.pathname === '/api/students') {
    const users = await readUsers();
    const students = users
      .filter((u) => !u.role || u.role === 'Student')
      .map((u) => ({
        id: u.id,
        name: u.name,
        college: u.college || 'College',
        degree: u.degree || 'B.Tech',
        major: u.major || 'Computer Science & Engineering',
        year: u.year || 'Final year · 2026',
        cgpa: u.cgpa || '8.2',
        skills: Array.isArray(u.skills) && u.skills.length ? u.skills : ['React', 'Python', 'SQL', 'Communication', 'Problem Solving'],
        projects: Array.isArray(u.projects) && u.projects.length ? u.projects : ['Campus placement portal', 'Data analytics dashboard'],
        certifications: Array.isArray(u.certifications) ? u.certifications : ['Full Stack Development'],
        internships: Array.isArray(u.internships) ? u.internships : ['Summer Intern · 2 months'],
        readiness: u.readiness || 78,
        aptitude: u.aptitude || '78/100',
      }));
    return json(res, 200, { students });
  }

  // --- Applications API ---
  if (req.method === 'GET' && parsedUrl.pathname === '/api/applications') {
    const apps = await readJsonFile(APPLICATIONS_FILE, []);
    return json(res, 200, { applications: apps });
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/api/applications') {
    const data = await bodyJson(req);
    const apps = await readJsonFile(APPLICATIONS_FILE, []);
    const existingIndex = apps.findIndex((a) => a.studentId === data.studentId && a.jobId === data.jobId);
    if (existingIndex >= 0) {
      return json(res, 200, { application: apps[existingIndex], alreadyApplied: true });
    }
    const newApp = {
      id: data.id || `a-${Date.now()}-${data.studentId || 'app'}`,
      studentId: data.studentId,
      jobId: data.jobId,
      candidateName: data.candidateName,
      jobTitle: data.jobTitle,
      company: data.company,
      stage: data.stage || 'Applied',
      updated: 'Just now',
      createdAt: new Date().toISOString(),
    };
    apps.unshift(newApp);
    await writeJsonFile(APPLICATIONS_FILE, apps);
    return json(res, 201, { application: newApp });
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/api/applications/stage') {
    const data = await bodyJson(req);
    const apps = await readJsonFile(APPLICATIONS_FILE, []);
    const idx = apps.findIndex((a) => a.id === data.id);
    if (idx >= 0) {
      apps[idx].stage = data.stage;
      apps[idx].updated = 'Just now';
      if (data.stage === 'Declined') {
        apps[idx].dropOff = data.dropOff || 'Candidate withdrew or process concluded';
      }
      await writeJsonFile(APPLICATIONS_FILE, apps);
      return json(res, 200, { application: apps[idx] });
    }
    return json(res, 404, { error: 'Application not found.' });
  }

  // --- Jobs API ---
  if (req.method === 'GET' && parsedUrl.pathname === '/api/jobs') {
    const jobs = await readJsonFile(JOBS_FILE, []);
    return json(res, 200, { jobs });
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/api/jobs') {
    const data = await bodyJson(req);
    const jobs = await readJsonFile(JOBS_FILE, []);
    jobs.unshift(data);
    await writeJsonFile(JOBS_FILE, jobs);
    return json(res, 201, { job: data });
  }

  // --- Drives API ---
  if (req.method === 'GET' && parsedUrl.pathname === '/api/drives') {
    const drives = await readJsonFile(DRIVES_FILE, []);
    return json(res, 200, { drives });
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/api/drives') {
    const data = await bodyJson(req);
    const drives = await readJsonFile(DRIVES_FILE, []);
    drives.push(data);
    await writeJsonFile(DRIVES_FILE, drives);
    return json(res, 201, { drive: data });
  }

  if (req.method === 'GET' && !parsedUrl.pathname.startsWith('/api/')) {
    const served = await serveStatic(res, parsedUrl.pathname);
    if (served) return;
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

Promise.all([loadSessions(), loadResetTokens()]).then(() => {
  server.listen(PORT, '0.0.0.0', () => process.stdout.write(`CampusLink auth API listening on port ${PORT}.\n`));
}).catch((error) => {
  process.stderr.write(`Could not restore CampusLink data: ${error.stack || error}\n`);
  process.exitCode = 1;
});
