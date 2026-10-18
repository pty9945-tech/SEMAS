import { test, expect } from '@playwright/test';
import { readFile, rm, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const adminEmail = 'owner@example.test';
const mailPath = (email) => resolve('.data/e2e/mail', `${createHash('sha256').update(email).digest('hex')}.json`);
let adminState;
const assumedQuestionIds = ['employees', 'industry', 'smallEnterprise', 'retainedStatus', 'businessForm'];
const assumptionNotice = '소상공인 기본요건 충족을 전제로 상담합니다.';

// The fixture supplies answers, never eligibility decisions. Every subsequent
// question comes from the real /api/evaluate response and is clicked in the UI.
const baseline = {
  purpose: ['operations'], businessStatus: 'active',
  exclusionStatus: 'clear', taxStatus: 'clear', delinquency: 'clear',
  directRecentDelinquency: 'clear',
  agencyRestrictions: 'clear', directRestrictions: 'clear', loanHistory: 'clear',
  generalFrequency: 'clear', disabledProof: 'no', disabledDetails: 'no',
  businessAge: 'from3To7', ownerAge: 'fortyPlus', youthEmployment: 'none',
  salesDrop: 'below15', hardshipException: ['none'], annualRevenue: 'from104To197m',
  creditScore: 'from840', creditAge: 'atLeast90', creditEducation: 'no', creditGrade: 'oneToEight',
  creditBalance: 'enough', disasterCertificate: 'no', disasterPause: 'no',
  innovationPaths: ['none'], investment: 'no', restartPaths: ['none'], restartVerified: 'no',
};

async function login(page, email) {
  await rm(mailPath(email), { force: true });
  await page.goto('/');
  await page.getByLabel('이메일 주소', { exact: true }).fill(email);
  await page.getByRole('button', { name: '인증번호 받기', exact: true }).click();
  await expect.poll(async () => {
    try { return JSON.parse(await readFile(mailPath(email), 'utf8')).code.length; } catch { return 0; }
  }).toBe(8);
  const { code } = JSON.parse(await readFile(mailPath(email), 'utf8'));
  await page.getByLabel('인증번호', { exact: true }).fill(code);
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByTestId('question-card')).toBeVisible();
}

async function choose(page, questionId, values) {
  await expect(page.getByTestId('question-card')).toHaveAttribute('data-question-id', questionId);
  for (const value of Array.isArray(values) ? values : [values]) await page.getByTestId(`option-${value}`).click();
  const pending = page.waitForResponse((response) => response.url().endsWith('/api/evaluate') && response.request().method() === 'POST');
  await page.getByTestId('next-button').click();
  const response = await pending;
  expect(response.status()).toBe(200);
  return response.json();
}

async function walk(page, overrides = {}, { result = null, stopBefore = null } = {}) {
  let current = result || { nextQuestion: { id: await page.getByTestId('question-card').getAttribute('data-question-id') }, complete: false };
  const visited = new Set();
  for (let index = 0; !current.complete && index < 60; index += 1) {
    const questionId = current.nextQuestion.id;
    expect(assumedQuestionIds, `basic eligibility must be assumed: ${questionId}`).not.toContain(questionId);
    if (questionId === stopBefore) return current;
    expect(visited.has(questionId), `question repeated: ${questionId}`).toBe(false);
    visited.add(questionId);
    const value = Object.hasOwn(overrides, questionId) ? overrides[questionId] : baseline[questionId];
    expect(value, `browser fixture missing requested question: ${questionId}`).not.toBeUndefined();
    current = await choose(page, questionId, value);
  }
  expect(current.complete, 'the adaptive browser path should finish').toBe(true);
  return current;
}

async function restart(page) {
  await page.getByRole('button', { name: '다시 상담하기', exact: true }).first().click();
  await expect(page.getByTestId('question-card')).toHaveAttribute('data-question-id', 'purpose');
}

test.beforeAll(async ({ browser }) => {
  await mkdir(resolve('artifacts'), { recursive: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/');
  await page.getByLabel('이메일 주소', { exact: true }).waitFor();
  await page.screenshot({ path: 'artifacts/login.png', fullPage: true });
  await login(page, adminEmail);
  adminState = await context.storageState();
  await context.close();
});

test.beforeEach(async ({ context, page }) => {
  await context.addCookies(adminState.cookies);
  await page.goto('/');
  await expect(page.getByTestId('question-card')).toBeVisible();
});

test('normal consultation, copy, print, no answer persistence and retained login', async ({ page, context }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.screenshot({ path: 'artifacts/desktop.png', fullPage: true });
  const questionReference = page.getByTestId('question-reference');
  await questionReference.locator('summary').click();
  await expect(questionReference).toContainText('운용지침');
  await expect(page.getByTestId('assumption-notice').first()).toBeVisible();
  const pending = await walk(page, {}, { stopBefore: 'directRestrictions' });
  await expect(questionReference).not.toHaveAttribute('open');
  await questionReference.locator('summary').click();
  await expect(questionReference).toContainText('대출제한대상');
  const result = await walk(page, {}, { result: pending });
  expect(result.complete).toBe(true);
  expect(result.candidates.filter((fund) => fund.status !== 'ineligible').map((fund) => fund.id)).toEqual(['general']);
  await expect(page.getByTestId('results')).toBeVisible();
  await expect(page.getByTestId('results')).toContainText('일반경영안정자금');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: '결과 복사', exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('일반경영안정자금');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('2026');
  expect(copied).toContain(assumptionNotice);
  await expect(page.getByTestId('results')).toContainText(assumptionNotice);
  expect(copied).toContain('영업 중');
  expect(copied).toContain('추가 안내:');
  expect(copied).toContain('현재 접수 확인 필요');
  expect(copied).not.toMatch(/시연|가상 자금|DEMO-/);
  expect(copied).not.toContain(adminEmail);
  await page.evaluate(() => { window.__printCalled = false; window.print = () => { window.__printCalled = true; }; });
  await page.getByRole('button', { name: '인쇄', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__printCalled)).toBe(true);
  await page.emulateMedia({ media: 'print' });
  const printableResources = page.locator('.result-resources').first();
  await expect(printableResources).toBeVisible();
  expect(await printableResources.innerText()).toContain('필요 서류');
  await expect(page.locator('.print-summary')).toBeVisible();
  await expect(page.locator('.user-menu')).not.toBeVisible();
  await page.pdf({ path: 'artifacts/result.pdf', format: 'A4', printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  await page.screenshot({ path: 'artifacts/results.png', fullPage: true });
  const storage = await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage), search: location.search, hash: location.hash }));
  expect(storage).toEqual({ local: [], session: [], search: '', hash: '' });
  await page.reload();
  await expect(page.getByTestId('question-card')).toHaveAttribute('data-question-id', 'purpose');
  expect(errors).toEqual([]);
});

test('multiple candidates and revising a prior answer recalculate the downstream path', async ({ page }) => {
  const result = await walk(page, { disabledProof: 'yes', disabledDetails: 'yes', businessAge: 'from2To3', ownerAge: 'under40' });
  expect(result.candidates.filter((fund) => fund.status === 'reviewing').map((fund) => fund.id)).toEqual(['general', 'disabled', 'youth']);
  await expect(page.getByTestId('results')).toBeVisible();
  await page.getByTestId('edit-purpose').click();
  await expect(page.getByTestId('question-card')).toHaveAttribute('data-question-id', 'purpose');
  const next = await choose(page, 'purpose', ['equipment']);
  expect(next.answers.disabledProof).toBeUndefined();
  expect(next.answers.businessAge).toBeUndefined();
  expect(next.answers.innovationPaths).toBeUndefined();
  expect(next.candidates.filter((fund) => fund.status !== 'ineligible').map((fund) => fund.id)).toEqual(['innovation', 'investment']);
  const revised = await walk(page, { innovationPaths: ['smart'], investment: 'no' }, { result: next });
  expect(revised.complete).toBe(true);
  expect(revised.candidates.filter((fund) => fund.status !== 'ineligible').map((fund) => fund.id)).toEqual(['innovation']);
  const policyDetails = page.getByTestId('policy-details-innovation');
  await policyDetails.locator('summary').click();
  await expect(policyDetails).toContainText('스마트기술 도입·활용');
  await expect(policyDetails).toContainText('사업계획서·실사');
  await expect(policyDetails).toContainText('혁신성장촉진자금 운용지침');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: '결과 복사', exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('유형·특별 조건: 스마트기술 도입·활용');
});

test('no candidates, unknown follow-up, and exclusive multi-select unknown', async ({ page }) => {
  await choose(page, 'purpose', ['operations']);
  const none = await choose(page, 'businessStatus', 'closed');
  expect(none.complete).toBe(true);
  expect(none.candidates.every((fund) => fund.status === 'ineligible')).toBe(true);
  await expect(page.getByTestId('results')).toBeVisible();
  await restart(page);
  // Choosing unknown clears the known purpose in the browser as well as server.
  await page.getByTestId('option-operations').click();
  const unknown = await choose(page, 'purpose', ['unknown']);
  expect(unknown.answers.purpose).toEqual(['unknown']);
  expect(unknown.nextQuestion.id).toBe('purposeConfirm');
  await choose(page, 'purposeConfirm', ['operations']);
  await choose(page, 'businessStatus', 'unknown');
  const confirmed = await choose(page, 'businessStatusConfirm', 'unknown');
  const result = await walk(page, {}, { result: confirmed });
  expect(result.candidates.find((fund) => fund.id === 'general').status).toBe('needs_info');
  await expect(page.getByTestId('results')).toContainText('추가 확인 필요');
});

test('administrator invites, uninvited visitor blocked, member denied administration, revocation removes active access', async ({ page, browser }) => {
  await page.getByRole('button', { name: '접근 관리', exact: true }).click();
  await page.getByLabel('초대할 이메일', { exact: true }).fill('counselor@example.test');
  await page.getByRole('button', { name: '초대 추가', exact: true }).click();
  await expect(page.getByText('counselor@example.test', { exact: true })).toBeVisible();
  const memberContext = await browser.newContext();
  const member = await memberContext.newPage();
  await login(member, 'counselor@example.test');
  expect((await member.request.get('/api/admin/invites')).status()).toBe(403);
  await expect(member.getByRole('button', { name: '접근 관리', exact: true })).toHaveCount(0);

  const outsiderContext = await browser.newContext();
  const outsider = await outsiderContext.newPage();
  await outsider.goto('/consultation');
  await expect(outsider.getByLabel('이메일 주소', { exact: true })).toBeVisible();
  expect((await outsider.request.get('/api/catalog')).status()).toBe(401);
  const denied = await outsider.request.post('/api/evaluate', { data: { answers: {} }, headers: { Origin: 'http://127.0.0.1:3100' } });
  expect(denied.status()).toBe(401);
  await outsider.getByLabel('이메일 주소', { exact: true }).fill('stranger@example.test');
  await outsider.getByRole('button', { name: '인증번호 받기', exact: true }).click();
  await expect(outsider.getByLabel('인증번호', { exact: true })).toBeVisible();
  await outsider.getByLabel('인증번호', { exact: true }).fill('00000000');
  await outsider.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(outsider.getByTestId('question-card')).toHaveCount(0);

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '권한 회수', exact: true }).click();
  expect((await member.request.get('/api/catalog')).status()).toBe(401);
  await member.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(member.getByLabel('이메일 주소', { exact: true })).toBeVisible();
  await expect(member.getByTestId('question-card')).toHaveCount(0);
  await outsiderContext.close();
  await memberContext.close();
});

test('mobile layout fits screen and supports keyboard selection through results', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('question-card')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/mobile.png', fullPage: true });
  await choose(page, 'purpose', ['operations']);
  await page.getByTestId('option-closed').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('next-button').click();
  await expect(page.getByTestId('results')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('guide dialog contains keyboard focus and restores it when Escape closes the dialog', async ({ page }) => {
  const trigger = page.getByRole('button', { name: '이용 안내', exact: true }).first();
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const close = page.getByRole('button', { name: '이용 안내 닫기', exact: true });
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: '확인했어요', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
