import { test, expect } from '@playwright/test';

const baseline = {
  businessStatus: 'active', businessStatusConfirm: 'active', exclusionStatus: 'clear',
  taxStatus: 'clear', delinquency: 'clear', directRecentDelinquency: 'clear',
  purpose: ['operations'], purposeConfirm: ['operations'], agencyRestrictions: 'clear',
  directRestrictions: 'clear', loanHistory: 'clear', generalFrequency: 'clear',
  disabledProof: 'no', disabledDetails: 'no', businessAge: 'from3To7', ownerAge: 'fortyPlus',
  youthEmployment: 'none', salesDrop: 'below15', hardshipException: ['none'],
  annualRevenue: 'from104To197m', creditScore: 'from840', creditAge: 'atLeast90',
  creditEducation: 'no', creditGrade: 'oneToEight', creditBalance: 'enough',
  disasterCertificate: 'no', disasterPause: 'no', innovationPaths: ['none'],
  graduationVerified: 'no', academyRestrictions: 'clear', investment: 'no',
  restartPaths: ['none'], restartVerified: 'no',
};

async function choose(page, value) {
  const question = page.getByTestId('question-card');
  const before = await question.getAttribute('data-question-id');
  const type = await question.getAttribute('data-question-type');
  const values = Array.isArray(value) ? value : [value];
  if (type === 'multi') {
    const selectedIds = await question.locator('.option-button[aria-pressed="true"]').evaluateAll(buttons => buttons.map(button => button.dataset.testid));
    for (const id of selectedIds) {
      if (!values.includes(id.slice('option-'.length))) await page.getByTestId(id).click();
    }
    for (const item of values) {
      const button = page.getByTestId(`option-${item}`);
      if (await button.getAttribute('aria-pressed') !== 'true') await button.click();
    }
    await page.getByTestId('next-button').click();
  } else if (type === 'number' && typeof value === 'number') {
    await page.getByTestId('number-answer').fill(String(value));
    await page.getByTestId('next-button').click();
  } else {
    await page.getByTestId(`option-${value}`).click();
  }
  await expect.poll(() => question.getAttribute('data-question-id', { timeout: 300 }).catch(() => null))
    .not.toBe(before);
}

async function finish(page, overrides = {}) {
  for (let step = 0; step < 50; step++) {
    if (await page.getByTestId('results').count()) return;
    const id = await page.getByTestId('question-card').getAttribute('data-question-id');
    const answer = overrides[id] ?? baseline[id];
    expect(answer, `Answer fixture for ${id}`).toBeDefined();
    await choose(page, answer);
  }
  throw new Error('The consultation did not reach its result.');
}

test('candidate details start collapsed, respect user toggles, and expand as answers accumulate', async ({ page }) => {
  await page.goto('./');
  const toggle = page.getByTestId('candidate-toggle');
  const candidates = page.getByTestId('candidate-list');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(candidates).toBeHidden();
  await expect(page.getByTestId('option-related-operations')).toContainText('일반경영안정자금');
  await expect(page.getByTestId('app-version-info')).toContainText(/(?:웹사이트|HTML 파일) 버전\s*\d{4}\.\d{2}\.\d{2}\.\d+/);
  await expect(page.getByTestId('app-version-info')).toContainText('자료 확인일');
  await expect(page.getByTestId('html-download-link')).toHaveAttribute('href', './download.html');

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(candidates).toBeVisible();
  await expect(candidates.locator('.candidate-item')).toHaveCount(10);
  await choose(page, ['operations']);
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');

  await toggle.click();
  await choose(page, 'active');
  await choose(page, 'clear');
  await choose(page, 'clear');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('button', { name: '다시 상담하기', exact: true }).first().click();
  await expect(page.getByTestId('question-card')).toHaveAttribute('data-question-id', 'purpose');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');

  await choose(page, ['operations']);
  await choose(page, 'active');
  await choose(page, 'clear');
  await choose(page, 'clear');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('html-download-link')).toBeVisible();
  await expect(page.getByTestId('app-version-info')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('result reasons and next steps precede folded details while copy and print retain full information', async ({ page, context }) => {
  await page.goto('./');
  await finish(page);
  const overview = page.getByTestId('result-overview');
  await expect(overview).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('검토할 후보');
  await expect(overview).toContainText('일반경영안정자금');
  const summary = page.getByTestId('fund-summary-general');
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('후보로 남은 이유');
  await expect(summary).toContainText('다음 확인사항');
  for (const section of ['terms', 'reasons', 'resources']) {
    await expect(page.getByTestId(`fund-${section}-general`)).not.toHaveAttribute('open');
  }
  const terms = page.getByTestId('fund-terms-general');
  await terms.locator('summary').click();
  await expect(terms.locator('.term-grid')).toBeVisible();
  await expect(terms).toContainText('대출 금리');
  await terms.locator('summary').click();

  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: '결과 복사', exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('후보로 남은 이유');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  for (const text of ['동작센터 정책자금 상담 도우미', '일반경영안정자금', '다음 확인사항', '한도:', '금리:', '필요 서류:', '근거 문서:']) {
    expect(copied).toContain(text);
  }

  const detailsBefore = await page.locator('.results details').evaluateAll((nodes) => nodes.map((node) => node.open));
  await page.evaluate(() => {
    window.__printSnapshot = null;
    window.print = () => {
      window.__printSnapshot = {
        closed: document.querySelectorAll('.results details:not([open])').length,
        text: document.querySelector('.results').innerText,
      };
    };
  });
  await page.getByRole('button', { name: '인쇄', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__printSnapshot?.closed)).toBe(0);
  const printed = await page.evaluate(() => window.__printSnapshot.text);
  for (const text of ['일반경영안정자금', '대출 한도', '대출 금리', '필요 서류', '공식 근거 자료']) {
    expect(printed).toContain(text);
  }
  expect(await page.locator('.results details').evaluateAll((nodes) => nodes.map((node) => node.open))).toEqual(detailsBefore);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId('results').getByRole('button', { name: '이용 안내', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: '이용 안내 닫기' }).click();
  await expect(overview).toBeVisible();
});

test('one unknown shared condition is grouped across candidates and removed when its answer is corrected', async ({ page, context }) => {
  const special = { taxStatus: 'unknown', disabledProof: 'yes', disabledDetails: 'yes', businessAge: 'from2To3', ownerAge: 'under40' };
  await page.goto('./');
  await finish(page, special);
  const followups = page.getByTestId('followup-checklist');
  const tax = page.getByTestId('followup-item-A-TAX');
  await expect(followups).toBeVisible();
  await expect(tax).toHaveCount(1);
  await expect(tax).toContainText('모름 · 확인 필요');
  for (const name of ['일반경영안정자금', '장애인기업지원자금', '청년고용연계자금']) {
    await expect(tax).toContainText(name);
  }
  await expect(page.locator('.fund-result .status.needs-info')).toHaveCount(3);
  await expect(tax).not.toContainText('신용취약소상공인자금');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: '결과 복사', exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('대리대출 세금체납 제한 검토');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.getByTestId('edit-taxStatus').click();
  await choose(page, 'clear');
  await finish(page, { ...special, taxStatus: 'clear' });
  await expect(page.getByTestId('followup-item-A-TAX')).toHaveCount(0);
  await expect(page.locator('.fund-result .status.needs-info')).toHaveCount(0);
  await expect(page.getByTestId('result-overview')).toContainText('일반경영안정자금');
});
