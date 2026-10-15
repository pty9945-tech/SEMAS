import express from 'express';
import helmet from 'helmet';
import { DatabaseSync } from 'node:sqlite';
import { createHash, createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdirSync, existsSync, chmodSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const MINUTE = 60_000;
const CODE_TTL = 10 * MINUTE;
const SESSION_TTL = 7 * 24 * 60 * MINUTE;
const REQUEST_MESSAGE = '초대된 이메일이면 인증번호가 발송됩니다. 받은편지함을 확인해 주세요.';
const INVALID_CODE = '인증번호가 올바르지 않거나 만료되었습니다. 다시 요청해 주세요.';

function normalizeEmail(value) {
  if (typeof value !== 'string' || value.length > 254) return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function sha256(value) { return createHash('sha256').update(value).digest('hex'); }
function hashCode(code, salt) { return scryptSync(code, salt, 32).toString('hex'); }
function userView(user) { return { id: user.id, email: user.email, role: user.role }; }
function inviteView(user) {
  return { ...userView(user), active: Boolean(user.active), createdAt: new Date(user.created_at).toISOString() };
}

function cookieValue(req, name) {
  const source = req.headers.cookie || '';
  if (source.length > 8192) return null;
  const entries = source.split(';').map((item) => item.trim()).filter((item) => item.startsWith(`${name}=`));
  if (entries.length !== 1) return null;
  const value = entries[0].slice(name.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}

/**
 * Build the actual HTTP app. mailer is an injected async ({ to, code }) function;
 * production supplies SMTP and tests supply an in-memory delivery function.
 * No email preview, auth bypass, counseling storage or request logger is exposed.
 */
export async function createApp({
  dbPath,
  adminEmail,
  origin,
  mailer = null,
  now = Date.now,
  secureCookies = true,
  staticDir = resolve('dist'),
  catalog: suppliedCatalog,
  evaluateAnswers: suppliedEvaluate,
  trustProxy = false,
} = {}) {
  const ownerEmail = normalizeEmail(adminEmail);
  if (!ownerEmail) throw new Error('ADMIN_EMAIL must be a valid email address.');
  const parsedOrigin = new URL(origin);
  if (parsedOrigin.origin !== origin || !['https:', 'http:'].includes(parsedOrigin.protocol)) {
    throw new Error('APP_ORIGIN must contain only a valid HTTP(S) origin without a trailing slash.');
  }
  if (secureCookies && parsedOrigin.protocol !== 'https:') throw new Error('Secure cookies require an HTTPS APP_ORIGIN.');
  if (!dbPath) throw new Error('An authentication database path is required.');
  if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true, mode: 0o700 });
  const catalog = suppliedCatalog ?? (await import('../policy/catalog.js')).catalog;
  const evaluateAnswers = suppliedEvaluate ?? (await import('../policy/engine.js')).evaluateAnswers;
  const db = new DatabaseSync(dbPath);
  if (dbPath !== ':memory:') chmodSync(dbPath, 0o600);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
      active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS login_codes (
      user_id INTEGER PRIMARY KEY REFERENCES users(id),
      code_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_user_id ON sessions(user_id);
    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      attempts INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);
  // Never reactivate or promote an existing record during startup.
  db.prepare('INSERT OR IGNORE INTO users (email, role, active, created_at) VALUES (?, ?, 1, ?)')
    .run(ownerEmail, 'admin', now());
  db.prepare('INSERT OR IGNORE INTO metadata (key, value) VALUES (?, ?)')
    .run('rate_secret', randomBytes(32).toString('hex'));
  const rateSecret = db.prepare('SELECT value FROM metadata WHERE key = ?').get('rate_secret').value;
  const cookieName = secureCookies ? '__Host-semas_session' : 'semas_session';
  const cookieOptions = { httpOnly: true, secure: secureCookies, sameSite: 'strict', path: '/' };
  const dummySalt = randomBytes(16).toString('hex');
  const dummyHash = hashCode('00000000', dummySalt);
  let lastCleanup = -Infinity;
  let closing = false;
  const pendingDeliveries = new Set();

  function transaction(action) {
    db.exec('BEGIN IMMEDIATE');
    try { const result = action(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  }

  function consumeRate(bucket, value, limit, windowMs) {
    const key = createHmac('sha256', rateSecret).update(`${bucket}:${value}`).digest('hex');
    const stamp = now();
    return transaction(() => {
      const row = db.prepare('SELECT attempts, expires_at FROM rate_limits WHERE key = ?').get(key);
      if (!row || row.expires_at <= stamp) {
        db.prepare('INSERT OR REPLACE INTO rate_limits (key, attempts, expires_at) VALUES (?, 1, ?)')
          .run(key, stamp + windowMs);
        return true;
      }
      if (row.attempts >= limit) return false;
      db.prepare('UPDATE rate_limits SET attempts = attempts + 1 WHERE key = ?').run(key);
      return true;
    });
  }

  function lookupUser(req) {
    const token = cookieValue(req, cookieName);
    if (!token) return null;
    return db.prepare(`SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ? AND sessions.expires_at > ? AND users.active = 1`).get(sha256(token), now()) ?? null;
  }

  function requireUser(req, res, next) {
    const user = lookupUser(req);
    if (!user) return res.status(401).json({ error: '초대된 이메일로 로그인해 주세요.' });
    req.authUser = user;
    next();
  }
  function requireAdmin(req, res, next) {
    if (req.authUser.role !== 'admin') return res.status(403).json({ error: '관리자만 이용할 수 있습니다.' });
    next();
  }

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', trustProxy);
  app.use(helmet({
    contentSecurityPolicy: { directives: {
      defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'], fontSrc: ["'self'"], connectSrc: ["'self'"],
      objectSrc: ["'none'"], baseUri: ["'none'"], frameAncestors: ["'none'"], formAction: ["'self'"],
      upgradeInsecureRequests: secureCookies ? [] : null,
    } },
    strictTransportSecurity: secureCookies ? undefined : false,
    referrerPolicy: { policy: 'no-referrer' },
  }));
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (now() - lastCleanup > MINUTE) {
      lastCleanup = now();
      db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now());
      db.prepare('DELETE FROM login_codes WHERE expires_at <= ?').run(now());
      db.prepare('DELETE FROM rate_limits WHERE expires_at <= ?').run(now());
    }
    next();
  });
  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api', (req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      if (req.headers.origin !== origin) return res.status(403).json({ error: '허용되지 않은 요청 출처입니다.' });
      if (!req.is('application/json')) return res.status(415).json({ error: 'JSON 형식으로 요청해 주세요.' });
    }
    next();
  });
  app.use('/api', express.json({ limit: '16kb', strict: true }));

  app.post('/api/auth/request', (req, res) => {
    if (!consumeRate('request-ip', req.ip, 10, 15 * MINUTE)) {
      res.set('Retry-After', '900');
      return res.status(429).json({ error: '요청이 많습니다. 잠시 후 다시 시도해 주세요.' });
    }
    const email = normalizeEmail(req.body?.email);
    if (!email) return res.status(400).json({ error: '올바른 이메일 주소를 입력해 주세요.' });
    // SMTP absence is reported uniformly for invited and uninvited addresses.
    if (!mailer) return res.status(503).json({ error: '이메일 인증 설정이 완료되지 않았습니다. 관리자에게 문의해 주세요.' });
    if (!consumeRate('request-email', email, 3, 15 * MINUTE)) return res.json({ message: REQUEST_MESSAGE });
    if (closing || pendingDeliveries.size >= 32) return res.status(503).json({ error: '인증 요청을 처리 중입니다. 잠시 후 다시 시도해 주세요.' });
    // Do the same expensive cryptographic work regardless of invitation status.
    // SMTP must not delay the HTTP response and reveal who is on the allowlist.
    const code = String(randomInt(0, 100_000_000)).padStart(8, '0');
    const salt = randomBytes(16).toString('hex');
    const codeHash = hashCode(code, salt);
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND active = 1').get(email);
    if (user) {
      db.prepare(`INSERT OR REPLACE INTO login_codes (user_id, code_hash, salt, expires_at, attempts)
        VALUES (?, ?, ?, ?, 0)`).run(user.id, codeHash, salt, now() + CODE_TTL);
    }
    res.json({ message: REQUEST_MESSAGE });
    if (user) {
      // Track the bounded delivery queue; close() drains it before closing SQLite.
      const delivery = new Promise((resolve) => setImmediate(resolve))
        .then(() => mailer({ to: email, code }))
        .catch(() => {
          db.prepare('DELETE FROM login_codes WHERE user_id = ? AND code_hash = ?').run(user.id, codeHash);
          // Do not expose existence, email values, codes or provider errors.
        })
        .finally(() => pendingDeliveries.delete(delivery));
      pendingDeliveries.add(delivery);
    }
  });

  app.post('/api/auth/verify', (req, res) => {
    if (!consumeRate('verify-ip', req.ip, 30, 15 * MINUTE)) {
      res.set('Retry-After', '900');
      return res.status(429).json({ error: '인증 시도가 많습니다. 잠시 후 다시 시도해 주세요.' });
    }
    const email = normalizeEmail(req.body?.email);
    const code = typeof req.body?.code === 'string' ? req.body.code : '';
    if (!email || !/^\d{8}$/.test(code)) return res.status(401).json({ error: INVALID_CODE });
    if (!consumeRate('verify-email', email, 10, 15 * MINUTE)) {
      return res.status(429).json({ error: '인증 시도가 많습니다. 잠시 후 다시 시도해 주세요.' });
    }
    const authenticated = transaction(() => {
      const user = db.prepare('SELECT * FROM users WHERE email = ? AND active = 1').get(email);
      const record = user ? db.prepare('SELECT * FROM login_codes WHERE user_id = ?').get(user.id) : null;
      const attempted = hashCode(code, record?.salt ?? dummySalt);
      const matches = timingSafeEqual(Buffer.from(attempted, 'hex'), Buffer.from(record?.code_hash ?? dummyHash, 'hex'));
      if (!record || record.expires_at <= now() || record.attempts >= 5 || !matches) {
        if (record) {
          if (record.expires_at <= now() || record.attempts >= 4) db.prepare('DELETE FROM login_codes WHERE user_id = ?').run(user.id);
          else db.prepare('UPDATE login_codes SET attempts = attempts + 1 WHERE user_id = ?').run(user.id);
        }
        return null;
      }
      db.prepare('DELETE FROM login_codes WHERE user_id = ?').run(user.id);
      const token = randomBytes(32).toString('base64url');
      // Rotate any session already held by this browser when authenticating again.
      const oldToken = cookieValue(req, cookieName);
      if (oldToken) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(oldToken));
      db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
        .run(sha256(token), user.id, now() + SESSION_TTL);
      return { user, token };
    });
    if (!authenticated) return res.status(401).json({ error: INVALID_CODE });
    res.cookie(cookieName, authenticated.token, { ...cookieOptions, maxAge: SESSION_TTL });
    return res.json({ user: userView(authenticated.user) });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = cookieValue(req, cookieName);
    if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
    res.clearCookie(cookieName, cookieOptions);
    res.status(204).end();
  });
  app.get('/api/session', requireUser, (req, res) => res.json({ user: userView(req.authUser) }));
  app.get('/api/catalog', requireUser, (_req, res) => res.json(catalog));
  app.post('/api/evaluate', requireUser, (req, res) => {
    if (!req.body || !req.body.answers || typeof req.body.answers !== 'object' || Array.isArray(req.body.answers)) {
      return res.status(400).json({ error: '선택한 답변 형식을 확인해 주세요.' });
    }
    try { return res.json(evaluateAnswers(req.body.answers)); }
    catch (error) {
      if (error instanceof TypeError || error instanceof RangeError || error.status === 400 || error.code === 'INVALID_ANSWERS') {
        return res.status(400).json({ error: '선택한 답변이 질문의 허용 범위를 벗어났습니다.' });
      }
      throw error;
    }
  });
  app.use('/api/admin', requireUser, requireAdmin);
  app.get('/api/admin/invites', (_req, res) => {
    const invites = db.prepare('SELECT * FROM users ORDER BY created_at DESC, id DESC').all().map(inviteView);
    res.json({ invites });
  });
  app.post('/api/admin/invites', (req, res) => {
    const email = normalizeEmail(req.body?.email);
    if (!email) return res.status(400).json({ error: '올바른 이메일 주소를 입력해 주세요.' });
    const user = transaction(() => {
      db.prepare(`INSERT INTO users (email, role, active, created_at) VALUES (?, 'member', 1, ?)
        ON CONFLICT(email) DO UPDATE SET active = 1`).run(email, now());
      return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    });
    res.status(201).json({ invite: inviteView(user) });
  });
  app.delete('/api/admin/invites/:id', (req, res) => {
    if (!/^\d+$/.test(req.params.id) || !Number.isSafeInteger(Number(req.params.id))) {
      return res.status(400).json({ error: '올바른 초대 항목을 선택해 주세요.' });
    }
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(req.params.id));
    if (!user) return res.status(404).json({ error: '초대 항목을 찾을 수 없습니다.' });
    if (user.id === req.authUser.id) return res.status(409).json({ error: '현재 로그인한 관리자의 권한은 회수할 수 없습니다.' });
    if (user.role === 'admin' && user.active && db.prepare("SELECT count(*) AS count FROM users WHERE role = 'admin' AND active = 1").get().count <= 1) {
      return res.status(409).json({ error: '마지막 관리자의 권한은 회수할 수 없습니다.' });
    }
    transaction(() => {
      db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(user.id);
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
      db.prepare('DELETE FROM login_codes WHERE user_id = ?').run(user.id);
    });
    res.status(204).end();
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: '요청한 기능을 찾을 수 없습니다.' }));

  app.use((req, res, next) => {
    const protectedPage = req.path === '/consultation' || req.path.startsWith('/consultation/') || req.path === '/admin' || req.path.startsWith('/admin/');
    if (protectedPage) {
      const user = lookupUser(req);
      if (!user) return res.redirect(302, '/login');
      if ((req.path === '/admin' || req.path.startsWith('/admin/')) && user.role !== 'admin') return res.status(403).type('text/plain').send('관리자만 이용할 수 있습니다.');
    }
    next();
  });
  app.use(express.static(staticDir, { index: false, dotfiles: 'deny', etag: false, lastModified: false }));
  app.use((req, res) => {
    if (req.method === 'GET' && ['/', '/login', '/consultation', '/admin'].includes(req.path) && existsSync(resolve(staticDir, 'index.html'))) {
      return res.sendFile(resolve(staticDir, 'index.html'));
    }
    return res.status(404).type('text/plain').send('페이지를 찾을 수 없습니다.');
  });
  app.use((error, _req, res, _next) => {
    if (error.type === 'entity.too.large') return res.status(413).json({ error: '요청 내용이 너무 큽니다.' });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: '올바른 JSON 형식이 아닙니다.' });
    res.status(500).json({ error: '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.' });
  });
  return {
    app,
    close: async () => {
      closing = true;
      await Promise.allSettled([...pendingDeliveries]);
      db.close();
    },
  };
}

export { CODE_TTL, SESSION_TTL };
