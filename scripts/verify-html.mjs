import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, expect } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = resolve(root, 'dist-html/동작센터-정책자금-상담-도우미.html');
assert.ok(existsSync(htmlPath), 'Run npm run build:html before verifying the HTML export.');
const htmlUrl = pathToFileURL(htmlPath).href;
const html = await readFile(htmlPath, 'utf8');
const siteName = '동작센터 정책자금 상담 도우미';
const assumption = '소상공인 기본요건 충족을 전제로 상담합니다.';
// Keep these representative answers aligned with tests/public-browser/public.spec.js.
const baseline = {
  businessStatus: 'active', businessStatusConfirm: 'active', exclusionStatus: 'clear',
  taxStatus: 'clear', delinquency: 'clear', directRecentDelinquency: 'clear',
  purpose: ['operations'], purposeConfirm: ['operations'], agencyRestrictions: 'clear',
  directRestrictions: 'clear', loanHistory: 'clear', generalFrequency: 'clear',
  disabledProof: 'no', disabledDetails: 'no', businessAge: 'from3To7',
  ownerAge: 'fortyPlus', youthEmployment: 'none', salesDrop: 'below15',
  hardshipException: ['none'], annualRevenue: 'from104To197m', creditScore: 'from840',
  creditAge: 'atLeast90', creditEducation: 'no', creditGrade: 'oneToEight',
  creditBalance: 'enough', disasterCertificate: 'no', disasterPause: 'no',
  innovationPaths: ['none'], graduationVerified: 'no', academyRestrictions: 'clear',
  investment: 'no', restartPaths: ['none'], restartVerified: 'no',
};
const assumedQuestionIds = ['employees', 'industry', 'smallEnterprise', 'retainedStatus', 'businessForm'];

async function choose(page, value) {
  const question = page.getByTestId('question-card');
  const previousId = await question.getAttribute('data-question-id');
  for (const answer of Array.isArray(value) ? value : [value]) {
    await page.getByTestId(`option-${answer}`).click();
  }
  await page.getByTestId('next-button').click();
  await expect.poll(() => question.getAttribute('data-question-id', { timeout: 300 }).catch(() => null))
    .not.toBe(previousId);
}

async function walk(page, overrides = {}, unknown = false) {
  for (let step = 0; step < 50; step++) {
    if (await page.getByTestId('results').count()) return;
    const id = await page.getByTestId('question-card').getAttribute('data-question-id');
    assert.ok(!assumedQuestionIds.includes(id), `Basic eligibility must be assumed: ${id}`);
    const answer = overrides[id] ?? (unknown ? 'unknown' : baseline[id]);
    assert.notEqual(answer, undefined, `Missing representative answer for ${id}`);
    await choose(page, answer);
  }
  throw new Error('The offline consultation did not finish after 50 questions.');
}

// Observe app storage access without providing replacement storage or changing
// browser policy. An inline fallback has an opaque origin where native storage
// is unavailable; detecting zero accesses still verifies the app never uses it.
function installPrivacyProbe() {
  if (window.__htmlPrivacyProbe) return;
  const probe = { accesses: [], read: {} };
  for (const name of ['localStorage', 'sessionStorage']) {
    const descriptor = Object.getOwnPropertyDescriptor(window, name);
    probe.read[name] = () => descriptor.get.call(window);
    Object.defineProperty(window, name, {
      ...descriptor,
      get() { probe.accesses.push(name); return descriptor.get.call(window); },
    });
  }
  window.__htmlPrivacyProbe = probe;
}

let openingMode = 'file://';
async function openHtml(page) {
  if (openingMode === 'file://') {
    try {
      await page.goto(htmlUrl);
      return page;
    } catch (error) {
      if (!error.message.includes('ERR_BLOCKED_BY_ADMINISTRATOR')) throw error;
      openingMode = 'offline inline HTML (file:// blocked by browser administrator policy)';
      console.warn('Direct file:// opening is blocked by the managed browser policy. Verifying the same generated HTML offline with page.setContent; this does not verify native file opening.');
      // The blocked navigation can still be replacing its error document.
      // Use a fresh blank tab rather than racing that administrative error page.
      await page.close();
      page = await context.newPage();
      await page.addInitScript(installPrivacyProbe);
    }
  }
  await page.goto('about:blank');
  await page.evaluate(installPrivacyProbe);
  await page.setContent(html, { waitUntil: 'load' });
  return page;
}

async function assertPrivate(page, context) {
  assert.equal(page.url(), openingMode === 'file://' ? htmlUrl : 'about:blank',
    'Consultation answers must not enter the document URL.');
  const state = await page.evaluate(() => {
    const probe = window.__htmlPrivacyProbe;
    const storage = {};
    for (const name of ['localStorage', 'sessionStorage']) {
      try { storage[name] = Object.keys(probe.read[name]()); }
      catch (error) {
        if (error.name !== 'SecurityError') throw error;
        storage[name] = 'unavailable for this origin';
      }
    }
    return { accesses: probe.accesses, storage, search: location.search, hash: location.hash };
  });
  assert.deepEqual(state.accesses, [], 'The app must not access browser storage.');
  assert.equal(state.search, '');
  assert.equal(state.hash, '');
  for (const keys of Object.values(state.storage)) {
    if (openingMode === 'file://') assert.deepEqual(keys, []);
    else assert.ok(keys === 'unavailable for this origin' || Array.isArray(keys) && keys.length === 0);
  }
  assert.deepEqual(await context.cookies(), []);
}

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
    (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
});
const context = await browser.newContext({ offline: true, viewport: { width: 1440, height: 1000 } });
const requests = [];
const errors = [];
context.on('request', (request) => requests.push({ url: request.url(), type: request.resourceType() }));
context.on('page', (page) => page.on('pageerror', (error) => errors.push(error.message)));
let nativeClipboard = 'not available';

try {
  let page = await context.newPage();
  await page.addInitScript(installPrivacyProbe);
  page = await openHtml(page);
  await expect(page).toHaveTitle(siteName);
  await expect(page.getByTestId('question-card')).toHaveAttribute('data-question-id', 'purpose');
  await expect(page.getByTestId('assumption-notice').first()).toContainText(assumption);
  await expect(page.getByTestId('option-related-operations')).toContainText('일반경영안정자금');
  await expect(page.getByTestId('option-related-equipment')).toContainText('민간투자연계형매칭융자');
  await expect(page.getByLabel('이메일 주소', { exact: true })).toHaveCount(0);
  await mkdir(resolve(root, 'artifacts'), { recursive: true });
  await page.screenshot({ path: resolve(root, 'artifacts/html-offline.png'), fullPage: true });

  await walk(page);
  const results = page.getByTestId('results');
  await expect(results).toContainText('일반경영안정자금');
  await expect(results).toContainText(assumption);
  await expect(results).toContainText('최종 지원 여부');

  // Try the browser clipboard when the document origin exposes it. Also test
  // generated result text deterministically without depending on the OS clipboard.
  if (await page.evaluate(() => Boolean(navigator.clipboard?.writeText))) {
    let nativeText;
    try {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.getByRole('button', { name: '결과 복사', exact: true }).click();
      await expect(page.getByRole('status')).toContainText('결과를 복사했어요');
      nativeText = await page.evaluate(() => navigator.clipboard.readText());
      nativeClipboard = `passed on ${openingMode}`;
    } catch (error) {
      nativeClipboard = `browser limitation: ${error.message.split('\n')[0]}`;
    }
    if (nativeText !== undefined) {
      assert.ok(nativeText.includes(siteName));
      assert.ok(nativeText.includes('일반경영안정자금'));
      assert.ok(nativeText.includes(assumption));
    }
  }
  await page.evaluate(() => {
    window.__copiedResult = null;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text) => { window.__copiedResult = text; } },
    });
  });
  await page.getByRole('button', { name: '결과 복사', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__copiedResult)).toContain(siteName);
  const copied = await page.evaluate(() => window.__copiedResult);
  assert.ok(copied.includes('일반경영안정자금'));
  assert.ok(copied.includes(assumption));
  await page.evaluate(() => {
    window.__printed = false;
    window.print = () => { window.__printed = true; };
  });
  await page.getByRole('button', { name: '인쇄', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__printed)).toBe(true);
  await assertPrivate(page, context);

  // Editing an earlier answer clears affected answers and recalculates the
  // next branch inside the same file, without a server.
  await page.getByTestId('edit-purpose').click();
  await choose(page, ['equipment']);
  await expect(page.getByTestId('question-card')).toHaveAttribute('data-question-id', 'businessStatus');
  await expect(page.getByTestId('edit-ownerAge')).toHaveCount(0);
  await walk(page, { innovationPaths: ['smart'] });
  await expect(results).toContainText('혁신성장촉진자금');
  await assertPrivate(page, context);

  await openHtml(page);
  await expect(page.getByTestId('question-card')).toHaveAttribute('data-question-id', 'purpose');
  await choose(page, ['operations']);
  await choose(page, 'closed');
  await expect(results).toContainText('현재 답변에 맞는 후보가 없어요.');
  await expect(results.locator('.fund-result')).toHaveCount(0);
  await expect(results.locator('.excluded-fund').first()).toBeVisible();

  await page.getByRole('button', { name: '다시 상담하기', exact: true }).first().click();
  await walk(page, {}, true);
  await expect(results.locator('.fund-result .status.needs-info').first()).toBeVisible();
  await assertPrivate(page, context);

  await page.setViewportSize({ width: 390, height: 844 });
  await openHtml(page);
  await expect(page.getByTestId('question-card')).toHaveAttribute('data-question-id', 'purpose');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true,
    'The HTML export must fit a 390px mobile viewport.');
  await choose(page, ['operations']);
  await choose(page, 'closed');
  await expect(results).toBeVisible();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await assertPrivate(page, context);

  assert.deepEqual(errors, [], 'The offline HTML must not raise JavaScript page errors.');
  assert.deepEqual(requests.filter(({ url, type }) => url !== htmlUrl || type !== 'document'), [],
    'The HTML file must not request external scripts, styles, fonts, images, or APIs.');
  console.log(JSON.stringify({
    file: htmlPath,
    openingMode,
    offline: true,
    checks: ['generated HTML launch', 'title and fund relations', 'normal result', 'copy text', 'print',
      'answer edit', 'no matching funds', 'unknown answers', '390px mobile',
      'answers reset on document reload', 'no storage access, cookies, answer URLs, external requests, or page errors'],
    nativeClipboard,
  }, null, 2));
} finally {
  await context.close();
  await browser.close();
}
