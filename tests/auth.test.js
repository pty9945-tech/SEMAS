import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
import { createApp, CODE_TTL, SESSION_TTL } from '../server/app.js';

const ADMIN = 'owner@example.test';
const MEMBER = 'counselor@example.test';
const ORIGIN = 'http://127.0.0.1:3000';

async function harness(t, options = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'semas-auth-'));
  const dbPath = join(dir, 'auth.sqlite');
  const staticDir = join(dir, 'dist');
  await mkdir(staticDir);
  await writeFile(join(staticDir, 'index.html'), '<!doctype html><title>Consultation</title>');
  let stamp = Date.UTC(2026, 9, 14);
  const deliveries = [];
  const appOptions = {
    dbPath,
    adminEmail: ADMIN,
    origin: ORIGIN,
    secureCookies: false,
    now: () => stamp,
    staticDir,
    mailer: async (mail) => { deliveries.push(mail); },
    catalog: { version: 'test', funds: [{ id: 'test-fund' }] },
    evaluateAnswers: (answers) => {
      if (Object.keys(answers).some((key) => key !== 'businessStatus')) throw new TypeError('Unknown question');
      return { candidates: [{ id: 'test-fund', status: 'review' }], answers };
    },
    ...options,
  };
  const created = await createApp(appOptions);
  let server = created.app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  let closeDb = created.close;
  let base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await closeDb();
    await rm(dir, { recursive: true, force: true });
  });

  async function request(path, { method = 'GET', body, cookie, headers = {}, redirect = 'manual' } = {}) {
    const mutation = !['GET', 'HEAD'].includes(method);
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { ...(mutation ? { Origin: appOptions.origin, 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: mutation ? JSON.stringify(body ?? {}) : undefined,
      redirect,
    });
    const raw = await response.text();
    let payload;
    try { payload = JSON.parse(raw); } catch { payload = raw; }
    return { status: response.status, headers: response.headers, body: payload, cookie: response.headers.get('set-cookie')?.split(';')[0] };
  }
  async function login(email = ADMIN) {
    const requested = await request('/api/auth/request', { method: 'POST', body: { email } });
    assert.equal(requested.status, 200);
    const mail = deliveries.findLast((item) => item.to === email);
    assert.ok(mail, 'Authentication was delivered only through the injected transport');
    const verified = await request('/api/auth/verify', { method: 'POST', body: { email, code: mail.code } });
    assert.equal(verified.status, 200);
    assert.ok(verified.cookie);
    return verified;
  }
  async function invite(cookie, email = MEMBER) {
    const result = await request('/api/admin/invites', { method: 'POST', cookie, body: { email } });
    assert.equal(result.status, 201);
    return result.body.invite;
  }
  return {
    request, login, invite, deliveries, dbPath,
    advance: (ms) => { stamp += ms; },
    restart: async () => {
      await new Promise((resolve) => server.close(resolve));
      await closeDb();
      const restarted = await createApp(appOptions);
      closeDb = restarted.close;
      server = restarted.app.listen(0, '127.0.0.1');
      await once(server, 'listening');
      base = `http://127.0.0.1:${server.address().port}`;
    },
  };
}

test('unauthenticated API and protected pages reject access; public health leaks no configuration', async (t) => {
  const h = await harness(t);
  for (const path of ['/api/session', '/api/catalog', '/api/admin/invites']) {
    const result = await h.request(path);
    assert.equal(result.status, 401);
    assert.equal(result.headers.get('cache-control'), 'no-store');
  }
  assert.equal((await h.request('/api/evaluate', { method: 'POST', body: { answers: {} } })).status, 401);
  for (const path of ['/consultation', '/consultation/private', '/admin']) {
    const result = await h.request(path);
    assert.equal(result.status, 302);
    assert.equal(result.headers.get('location'), '/login');
  }
  assert.deepEqual((await h.request('/healthz')).body, { status: 'ok' });
});

test('invited administrator and member can authenticate; uninvited requests have the same generic response', async (t) => {
  const h = await harness(t);
  const invitedRequest = await h.request('/api/auth/request', { method: 'POST', body: { email: ADMIN } });
  const strangerRequest = await h.request('/api/auth/request', { method: 'POST', body: { email: 'stranger@example.test' } });
  assert.equal(invitedRequest.status, strangerRequest.status);
  assert.deepEqual(invitedRequest.body, strangerRequest.body);
  assert.equal(h.deliveries.length, 1);
  assert.match(h.deliveries[0].code, /^\d{8}$/);
  const admin = await h.request('/api/auth/verify', { method: 'POST', body: { email: ADMIN, code: h.deliveries[0].code } });
  assert.equal(admin.status, 200);
  assert.equal(admin.body.user.role, 'admin');
  const created = await h.invite(admin.cookie);
  assert.equal(created.active, true);
  const member = await h.login(MEMBER);
  assert.equal(member.body.user.role, 'member');
  assert.equal((await h.request('/consultation', { cookie: member.cookie })).status, 200);
  assert.equal((await h.request('/api/catalog', { cookie: member.cookie })).status, 200);
  assert.equal((await h.request('/api/auth/verify', { method: 'POST', body: { email: 'stranger@example.test', code: h.deliveries[0].code } })).status, 401);
});

test('member cannot list, add or revoke invitations and cannot load admin page', async (t) => {
  const h = await harness(t);
  const admin = await h.login();
  const invitation = await h.invite(admin.cookie);
  const member = await h.login(MEMBER);
  assert.equal((await h.request('/api/admin/invites', { cookie: member.cookie })).status, 403);
  assert.equal((await h.request('/api/admin/invites', { method: 'POST', cookie: member.cookie, body: { email: 'extra@example.test' } })).status, 403);
  assert.equal((await h.request(`/api/admin/invites/${invitation.id}`, { method: 'DELETE', cookie: member.cookie })).status, 403);
  assert.equal((await h.request('/admin', { cookie: member.cookie })).status, 403);
});

test('revocation immediately invalidates existing sessions and outstanding codes and persists after restart', async (t) => {
  const h = await harness(t);
  const admin = await h.login();
  const invitation = await h.invite(admin.cookie);
  const member = await h.login(MEMBER);
  await h.request('/api/auth/request', { method: 'POST', body: { email: MEMBER } });
  const pendingCode = h.deliveries.at(-1).code;
  assert.equal((await h.request(`/api/admin/invites/${invitation.id}`, { method: 'DELETE', cookie: admin.cookie })).status, 204);
  assert.equal((await h.request('/api/session', { cookie: member.cookie })).status, 401);
  assert.equal((await h.request('/api/evaluate', { method: 'POST', cookie: member.cookie, body: { answers: {} } })).status, 401);
  assert.equal((await h.request('/api/auth/verify', { method: 'POST', body: { email: MEMBER, code: pendingCode } })).status, 401);
  await h.restart();
  assert.equal((await h.request('/api/session', { cookie: member.cookie })).status, 401);
  const list = await h.request('/api/admin/invites', { cookie: admin.cookie });
  assert.equal(list.body.invites.find((item) => item.id === invitation.id).active, false);
  await h.invite(admin.cookie);
  const reinvited = await h.login(MEMBER);
  assert.equal((await h.request('/api/session', { cookie: reinvited.cookie })).status, 200);
  assert.equal((await h.request('/api/session', { cookie: member.cookie })).status, 401);
});

test('bootstrap does not reactivate a revoked existing owner record', async (t) => {
  const h = await harness(t);
  const admin = await h.login();
  const db = new DatabaseSync(h.dbPath);
  db.prepare('UPDATE users SET active = 0 WHERE email = ?').run(ADMIN);
  db.close();
  await h.restart();
  assert.equal((await h.request('/api/session', { cookie: admin.cookie })).status, 401);
  const count = h.deliveries.length;
  await h.request('/api/auth/request', { method: 'POST', body: { email: ADMIN } });
  assert.equal(h.deliveries.length, count);
});

test('administrators cannot revoke their own access', async (t) => {
  const h = await harness(t);
  const admin = await h.login();
  const result = await h.request(`/api/admin/invites/${admin.body.user.id}`, { method: 'DELETE', cookie: admin.cookie });
  assert.equal(result.status, 409);
  assert.equal((await h.request('/api/session', { cookie: admin.cookie })).status, 200);
});

test('codes are one-time, expire at the exact TTL and replacement invalidates an earlier code', async (t) => {
  const h = await harness(t);
  await h.request('/api/auth/request', { method: 'POST', body: { email: ADMIN } });
  const oldCode = h.deliveries.at(-1).code;
  await h.request('/api/auth/request', { method: 'POST', body: { email: ADMIN } });
  const newCode = h.deliveries.at(-1).code;
  if (oldCode !== newCode) assert.equal((await h.request('/api/auth/verify', { method: 'POST', body: { email: ADMIN, code: oldCode } })).status, 401);
  assert.equal((await h.request('/api/auth/verify', { method: 'POST', body: { email: ADMIN, code: newCode } })).status, 200);
  assert.equal((await h.request('/api/auth/verify', { method: 'POST', body: { email: ADMIN, code: newCode } })).status, 401);
  await h.request('/api/auth/request', { method: 'POST', body: { email: ADMIN } });
  const expired = h.deliveries.at(-1).code;
  h.advance(CODE_TTL);
  assert.equal((await h.request('/api/auth/verify', { method: 'POST', body: { email: ADMIN, code: expired } })).status, 401);
});

test('simultaneous use of one code creates only one authenticated session', async (t) => {
  const h = await harness(t);
  await h.request('/api/auth/request', { method: 'POST', body: { email: ADMIN } });
  const code = h.deliveries.at(-1).code;
  const results = await Promise.all([1, 2].map(() => h.request('/api/auth/verify', { method: 'POST', body: { email: ADMIN, code } })));
  assert.deepEqual(results.map((item) => item.status).sort(), [200, 401]);
});

test('five wrong attempts invalidate the code, including a later correct attempt', async (t) => {
  const h = await harness(t);
  await h.request('/api/auth/request', { method: 'POST', body: { email: ADMIN } });
  const code = h.deliveries.at(-1).code;
  const wrong = code === '00000000' ? '11111111' : '00000000';
  for (let index = 0; index < 5; index++) {
    assert.equal((await h.request('/api/auth/verify', { method: 'POST', body: { email: ADMIN, code: wrong } })).status, 401);
  }
  assert.equal((await h.request('/api/auth/verify', { method: 'POST', body: { email: ADMIN, code } })).status, 401);
});

test('session cookies are HttpOnly, SameSite Strict, HTTPS Secure and use __Host prefix', async (t) => {
  const h = await harness(t, { secureCookies: true, origin: 'https://counseling.example.test' });
  const loggedIn = await h.login();
  const cookie = loggedIn.headers.get('set-cookie');
  assert.match(cookie, /^__Host-semas_session=/);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/i);
  assert.match(cookie, /SameSite=Strict/i);
  assert.match(cookie, /Path=\//i);
  assert.match(cookie, /Max-Age=604800/i);
  assert.doesNotMatch(cookie, /Domain=/i);
});

test('sessions expire at seven days without indefinite sliding, and logout invalidates them', async (t) => {
  const h = await harness(t);
  const first = await h.login();
  h.advance(SESSION_TTL - 1);
  assert.equal((await h.request('/api/session', { cookie: first.cookie })).status, 200);
  h.advance(1);
  assert.equal((await h.request('/api/session', { cookie: first.cookie })).status, 401);
  const second = await h.login();
  assert.equal((await h.request('/api/auth/logout', { method: 'POST', cookie: second.cookie })).status, 204);
  assert.equal((await h.request('/api/session', { cookie: second.cookie })).status, 401);
});

test('mutation endpoints enforce exact origin and JSON including invitation deletion and logout', async (t) => {
  const h = await harness(t);
  const admin = await h.login();
  for (const origin of ['', 'null', 'https://evil.example.test', `${ORIGIN}.evil.example.test`]) {
    assert.equal((await h.request('/api/auth/request', { method: 'POST', body: { email: ADMIN }, headers: { Origin: origin } })).status, 403);
    assert.equal((await h.request('/api/auth/logout', { method: 'POST', cookie: admin.cookie, headers: { Origin: origin } })).status, 403);
    assert.equal((await h.request('/api/admin/invites/1', { method: 'DELETE', cookie: admin.cookie, headers: { Origin: origin } })).status, 403);
  }
  assert.equal((await h.request('/api/auth/request', { method: 'POST', body: { email: ADMIN }, headers: { 'Content-Type': 'text/plain' } })).status, 415);
  assert.equal((await h.request('/api/session', { cookie: admin.cookie })).status, 200);
});

test('rate limits persist across restarts, bound email sending and reject excess IP requests', async (t) => {
  const h = await harness(t);
  for (let index = 0; index < 4; index++) {
    assert.equal((await h.request('/api/auth/request', { method: 'POST', body: { email: ADMIN } })).status, 200);
  }
  assert.equal(h.deliveries.length, 3);
  await h.restart();
  for (let index = 0; index < 6; index++) {
    assert.equal((await h.request('/api/auth/request', { method: 'POST', body: { email: `unknown-${index}@example.test` } })).status, 200);
  }
  assert.equal((await h.request('/api/auth/request', { method: 'POST', body: { email: ADMIN } })).status, 429);
  h.advance(15 * 60_000);
  assert.equal((await h.request('/api/auth/request', { method: 'POST', body: { email: ADMIN } })).status, 200);
  assert.equal(h.deliveries.length, 4);
});

test('no email transport fails closed and provider failure cannot produce a usable code', async (t) => {
  const h = await harness(t, { mailer: null });
  for (const email of [ADMIN, 'unknown@example.test']) {
    assert.equal((await h.request('/api/auth/request', { method: 'POST', body: { email } })).status, 503);
  }
  assert.equal((await h.request('/api/auth/verify', { method: 'POST', body: { email: ADMIN, code: '00000000' } })).status, 401);
});

test('SMTP delivery errors invalidate the pending code without exposing provider details', async (t) => {
  let pendingCode;
  const h = await harness(t, { mailer: async ({ code }) => { pendingCode = code; throw new Error('secret provider diagnostic'); } });
  const result = await h.request('/api/auth/request', { method: 'POST', body: { email: ADMIN } });
  assert.equal(result.status, 200);
  assert.doesNotMatch(JSON.stringify(result.body), /secret provider/);
  assert.equal((await h.request('/api/auth/verify', { method: 'POST', body: { email: ADMIN, code: pendingCode } })).status, 401);
});

test('HTTP response does not wait for SMTP and shutdown drains the tracked delivery queue', async (t) => {
  let releaseDelivery;
  const deliveryGate = new Promise((resolve) => { releaseDelivery = resolve; });
  const h = await harness(t, { mailer: async () => deliveryGate });
  let timer;
  try {
    const response = await Promise.race([
      h.request('/api/auth/request', { method: 'POST', body: { email: ADMIN } }),
      new Promise((_resolve, reject) => { timer = setTimeout(() => reject(new Error('HTTP waited for SMTP')), 2000); }),
    ]);
    assert.equal(response.status, 200);
    clearTimeout(timer);
    let restartFinished = false;
    const restarting = h.restart().then(() => { restartFinished = true; });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(restartFinished, false);
    releaseDelivery();
    await restarting;
    assert.equal(restartFinished, true);
  } finally {
    clearTimeout(timer);
    releaseDelivery();
  }
});

test('counseling answers are evaluated only in memory; authentication database stores only auth records', async (t) => {
  const h = await harness(t);
  const admin = await h.login();
  const result = await h.request('/api/evaluate', { method: 'POST', cookie: admin.cookie, body: { answers: { businessStatus: 'operating' } } });
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  const db = new DatabaseSync(h.dbPath);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all().map((item) => item.name).sort();
  assert.deepEqual(tables, ['login_codes', 'metadata', 'rate_limits', 'sessions', 'users']);
  for (const table of tables) {
    assert.doesNotMatch(JSON.stringify(db.prepare(`SELECT * FROM ${table}`).all()), /businessStatus|operating|test-fund/);
  }
  const session = db.prepare('SELECT token_hash FROM sessions').get();
  assert.match(session.token_hash, /^[a-f0-9]{64}$/);
  assert.ok(!session.token_hash.includes(admin.cookie.split('=')[1]));
  assert.equal(db.prepare('SELECT count(*) AS count FROM login_codes').get().count, 0);
  db.close();
});

test('evaluation rejects malformed payloads and unknown answers with 400', async (t) => {
  const h = await harness(t);
  const admin = await h.login();
  for (const body of [{}, { answers: null }, { answers: [] }, { answers: { unknown: 'value' } }]) {
    assert.equal((await h.request('/api/evaluate', { method: 'POST', cookie: admin.cookie, body })).status, 400);
  }
});
