import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('visitors can download the standalone HTML and ZIP', async ({ page, browser }) => {
  await page.goto('./download.html');
  await expect(page).toHaveTitle('동작센터 정책자금 상담 도우미 · HTML 다운로드');
  const [htmlDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'HTML 파일 받기', exact: true }).click(),
  ]);
  expect(await htmlDownload.failure()).toBeNull();
  expect(htmlDownload.suggestedFilename()).toBe('동작센터-정책자금-상담-도우미.html');
  const html = await readFile(await htmlDownload.path(), 'utf8');
  expect(html).toContain('<title>동작센터 정책자금 상담 도우미</title>');
  expect(html).not.toMatch(/<script\b[^>]*\bsrc\s*=/i);
  expect(html).not.toMatch(/<link\b[^>]*\brel\s*=\s*["']stylesheet["']/i);

  const [zipDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'ZIP 파일 받기', exact: true }).click(),
  ]);
  expect(await zipDownload.failure()).toBeNull();
  const zip = await readFile(await zipDownload.path());
  expect(zip.subarray(0, 4).toString('hex')).toBe('504b0304');
  expect(zip.includes(Buffer.from('동작센터-정책자금-상담-도우미.html'))).toBe(true);

  // Check the actual downloaded HTML without an HTTP server or network access.
  const offline = await browser.newContext({ offline: true });
  try {
    const document = await offline.newPage();
    const requests = [], errors = [];
    document.on('request', (request) => requests.push(request.url()));
    document.on('pageerror', (error) => errors.push(error.message));
    await document.setContent(html);
    await expect(document.getByTestId('question-card')).toHaveAttribute('data-question-id', 'purpose');
    await document.getByTestId('option-operations').click();
    await document.getByTestId('next-button').click();
    await document.getByTestId('option-closed').click();
    await document.getByTestId('next-button').click();
    await expect(document.getByTestId('results')).toBeVisible();
    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
  } finally {
    await offline.close();
  }
});
