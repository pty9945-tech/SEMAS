import { test, expect } from '@playwright/test';

async function openGuide(page) {
  await page.getByTestId('credit-guide-open').click();
  await expect(page.getByTestId('credit-guide')).toBeVisible();
}

test('staff reference opens without answering and preserves consultation answers and unfinished multi-selection', async ({ page, context }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  const question = page.getByTestId('question-card');
  await expect(question).toHaveAttribute('data-question-id', 'purpose');
  const originalUrl = page.url();
  const guideRequests = [];
  page.on('request', request => guideRequests.push(request.url()));

  await openGuide(page);
  await expect(page.getByTestId('credit-guide')).toContainText('839');
  await page.getByTestId('credit-guide-back').click();
  await expect(question).toHaveAttribute('data-question-id', 'purpose');
  await expect(page.getByTestId('option-operations')).toHaveAttribute('aria-pressed', 'false');

  await page.getByTestId('option-operations').click();
  await page.getByTestId('option-equipment').click();
  await openGuide(page);
  await page.getByTestId('credit-guide-back').click();
  await expect(question).toHaveAttribute('data-question-id', 'purpose');
  for (const value of ['operations', 'equipment']) {
    await expect(page.getByTestId(`option-${value}`)).toHaveAttribute('aria-pressed', 'true');
  }
  await page.getByTestId('next-button').click();
  await expect(question).toHaveAttribute('data-question-id', 'businessStatus');
  await page.getByTestId('option-active').click();
  await expect(question).toHaveAttribute('data-question-id', 'exclusionStatus');
  const answersBefore = await page.locator('.answer-list').innerText();
  await openGuide(page);
  await page.getByTestId('credit-guide-search').fill('임차');
  await page.getByTestId('credit-guide-back').click();
  await expect(question).toHaveAttribute('data-question-id', 'exclusionStatus');
  await expect(page.locator('.answer-list')).toHaveText(answersBefore, { useInnerText: true });
  await expect(page.getByTestId('option-clear')).toHaveAttribute('aria-pressed', 'false');
  expect(page.url()).toBe(originalUrl);
  expect(await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage), search: location.search, hash: location.hash })))
    .toEqual({ local: [], session: [], search: '', hash: '' });
  expect(await context.cookies()).toEqual([]);
  expect(guideRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('staff can distinguish source conditions, filter details, and print the full guide with sources', async ({ page }) => {
  await page.goto('./');
  await openGuide(page);
  const guide = page.getByTestId('credit-guide');
  const search = page.getByTestId('credit-guide-search');
  for (const text of ['NCB 839점 이하', '90일 이상', '1,000만원 이상', '기준금리 + 1.6%p', '5년 · 거치 2년 포함']) {
    await expect(guide.locator('.credit-guide-highlights')).toContainText(text);
  }
  await expect(guide.getByRole('heading', { level: 1 })).toBeFocused();
  await page.screenshot({ path: 'artifacts/credit-guide-desktop.png', fullPage: false });
  await guide.getByRole('button', { name: '필요서류', exact: true }).click();
  await expect(page.getByTestId('credit-guide-section-eligibility')).toBeHidden();
  await expect(page.getByTestId('credit-guide-item-online-application')).toContainText('온라인 작성·동의');
  await expect(page.getByTestId('credit-guide-item-selected-plan')).toContainText('선정 후 필수');
  await expect(page.getByTestId('credit-guide-item-supplementary-status')).toContainText('보완 요청 시');
  // This word occurs in an expanded detail, not the row's visible summary.
  await search.fill('임대인');
  const premises = page.getByTestId('credit-guide-item-business-premises');
  await expect(premises).toBeVisible();
  await expect(page.getByTestId('credit-guide-item-online-application')).toBeHidden();
  await premises.locator('summary').click();
  await expect(premises.locator('.credit-guide-item-details')).toContainText('등기서류 제출을 생략');
  await expect(premises.locator('.credit-guide-evidence')).toContainText('신용취약소상공인자금 운용지침');
  const before = await guide.locator('details').evaluateAll(nodes => nodes.map(node => node.open));
  const allItems = await guide.locator('.credit-guide-item').count();
  await page.evaluate(() => {
    window.print = () => {
      const guide = document.querySelector('.credit-guide');
      window.__guidePrint = {
        closed: guide.querySelectorAll('details:not([open])').length,
        visibleItems: [...guide.querySelectorAll('.credit-guide-item')].filter(node => node.getBoundingClientRect().height > 0).length,
        text: guide.innerText,
      };
    };
  });
  await page.getByTestId('credit-guide-print').click();
  await expect.poll(() => page.evaluate(() => window.__guidePrint?.closed)).toBe(0);
  expect(await guide.locator('details').evaluateAll(nodes => nodes.map(node => node.open))).toEqual(before);
  // The actual print stylesheet must include rows hidden by search and category.
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => document.querySelector('[data-testid="credit-guide-print"]').click());
  const printed = await page.evaluate(() => window.__guidePrint);
  expect(printed.visibleItems).toBe(allItems);
  for (const text of ['기업등급 9~10등급', '1억 9,700만원', '세금 체납', '징수유예', '업력 7년 이하', '차기 신용취약소상공인자금 재신청', '원문 병합표', '3. 제출서류']) {
    expect(printed.text).toContain(text);
  }
  await expect(page.getByTestId('question-card')).toHaveCount(0);
  await page.emulateMedia({ media: 'screen' });
  await expect(search).toHaveValue('임대인');
  await expect(page.getByTestId('credit-guide-section-eligibility')).toBeHidden();
  expect(await guide.locator('details').evaluateAll(nodes => nodes.map(node => node.open))).toEqual(before);
});

test('mobile staff can search, expand evidence, and return without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await expect(page.getByTestId('credit-guide-open')).toBeVisible();
  await openGuide(page);
  const guide = page.getByTestId('credit-guide');
  const search = page.getByTestId('credit-guide-search');
  await search.fill('체납');
  await expect(page.getByTestId('credit-guide-section-restrictions')).toBeVisible();
  const firstMatch = guide.locator('.credit-guide-item:visible').first();
  await firstMatch.locator('summary').click();
  await expect(firstMatch.locator('.credit-guide-evidence')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'artifacts/credit-guide-mobile.png', fullPage: true });
  await search.fill('일치하지않는검색어123456');
  await expect(guide.getByRole('heading', { name: '일치하는 안내 항목이 없어요.' })).toBeVisible();
  await guide.getByRole('button', { name: '검색·항목 선택 초기화', exact: true }).click();
  await expect(search).toHaveValue('');
  await expect(guide.getByRole('button', { name: '전체 보기', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('credit-guide-section-eligibility')).toBeVisible();
  await page.getByTestId('credit-guide-back').click();
  await expect(page.getByTestId('question-card')).toHaveAttribute('data-question-id', 'purpose');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
