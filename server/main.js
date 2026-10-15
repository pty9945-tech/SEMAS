import { resolve } from 'node:path';
import nodemailer from 'nodemailer';
import { createApp } from './app.js';

const production = !['development', 'test'].includes(process.env.NODE_ENV);
const origin = process.env.APP_ORIGIN;
const adminEmail = process.env.ADMIN_EMAIL;
const dataDir = process.env.DATA_DIR;
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3000);

if (!origin || !adminEmail || !dataDir) {
  throw new Error('Set APP_ORIGIN, ADMIN_EMAIL and DATA_DIR. Authentication data must use persistent storage outside the checkout.');
}
if (production && !origin.startsWith('https://')) throw new Error('Production APP_ORIGIN must use HTTPS.');
if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port.');
if (process.env.TRUST_PROXY !== undefined && !['0', '1'].includes(process.env.TRUST_PROXY)) {
  throw new Error('TRUST_PROXY must be 0 or 1. Use 1 only behind one trusted proxy with the backend isolated.');
}

let mailer = null;
let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_FROM) {
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  if (!Number.isSafeInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) throw new Error('SMTP_PORT must be a valid TCP port.');
  if (Boolean(process.env.SMTP_USER) !== Boolean(process.env.SMTP_PASS)) throw new Error('Set both SMTP_USER and SMTP_PASS, or neither.');
  const secure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure,
    requireTLS: !secure,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
    logger: false,
    debug: false,
  });
  mailer = async ({ to, code }) => {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject: '[소담] 로그인 인증번호',
      text: `소담 정책자금 상담 도우미 로그인 인증번호는 ${code} 입니다.\n\n10분 안에 입력해 주세요. 요청하지 않았다면 이 메일을 무시해 주세요.\n상담내용은 이 메일에 포함되지 않습니다.`,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  };
}
if (production && !mailer) throw new Error('Production requires SMTP_HOST and SMTP_FROM, with SMTP credentials when required by the provider.');

const { app, close } = await createApp({
  dbPath: resolve(dataDir, 'auth.sqlite'),
  adminEmail,
  origin,
  mailer,
  secureCookies: production || origin.startsWith('https://'),
  staticDir: resolve('dist'),
  trustProxy: process.env.TRUST_PROXY === '1' ? 1 : false,
});
const server = app.listen(port, host, () => {
  console.info(`Policy consultation server listening on ${host}:${port}.`);
  if (!mailer) console.info('Email authentication is unavailable until SMTP is configured.');
});
function shutdown() {
  server.close(async () => { await close(); transporter?.close(); process.exit(0); });
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
