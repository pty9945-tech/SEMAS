import { test, expect } from '@playwright/test';
const assumedQuestionIds=['employees','industry','smallEnterprise','retainedStatus','businessForm'];
const assumptionNotice='소상공인 기본요건 충족을 전제로 상담합니다.';
const baseline={
  businessStatus:'active',businessStatusConfirm:'active',exclusionStatus:'clear',taxStatus:'clear',delinquency:'clear',directRecentDelinquency:'clear',purpose:['operations'],purposeConfirm:['operations'],
  agencyRestrictions:'clear',directRestrictions:'clear',loanHistory:'clear',generalFrequency:'clear',disabledProof:'no',disabledDetails:'no',
  businessAge:'from3To7',ownerAge:'fortyPlus',youthEmployment:'none',salesDrop:'below15',hardshipException:['none'],annualRevenue:'from104To197m',
  creditScore:'from840',creditAge:'atLeast90',creditEducation:'no',creditGrade:'oneToEight',creditBalance:'enough',disasterCertificate:'no',disasterPause:'no',
  innovationPaths:['none'],graduationVerified:'no',academyRestrictions:'clear',investment:'no',restartPaths:['none'],restartVerified:'no',
};
async function choose(page,value) {
  const card=page.getByTestId('question-card');
  const before=await card.getAttribute('data-question-id');
  const type=await card.getAttribute('data-question-type');
  const values=Array.isArray(value)?value:[value];
  if(type==='multi') {
    const selectedIds=await card.locator('.option-button[aria-pressed="true"]').evaluateAll(buttons=>buttons.map(button=>button.dataset.testid));
    for(const id of selectedIds) {
      if(!values.includes(id.slice('option-'.length))) await page.getByTestId(id).click();
    }
    for(const item of values) {
      const button=page.getByTestId(`option-${item}`);
      if(await button.getAttribute('aria-pressed')!=='true') await button.click();
    }
    await page.getByTestId('next-button').click();
  } else if(type==='number'&&typeof value==='number') {
    await page.getByTestId('number-answer').fill(String(value));
    await page.getByTestId('next-button').click();
  } else await page.getByTestId(`option-${value}`).click();
  await expect.poll(()=>card.getAttribute('data-question-id',{timeout:300}).catch(()=>null)).not.toBe(before);
}
async function walk(page,overrides={},unknown=false) {
  for(let i=0;i<50;i++) {
    if(await page.getByTestId('results').count()) return;
    const id=await page.getByTestId('question-card').getAttribute('data-question-id');
    expect(assumedQuestionIds,`basic eligibility must be assumed: ${id}`).not.toContain(id);
    const answer=overrides[id]??(unknown?'unknown':baseline[id]);
    expect(answer,`fixture for ${id}`).toBeDefined();
    await choose(page,answer);
  }
  throw new Error('Consultation did not finish');
}
test('any visitor starts immediately and answers stay inside the tab',async({page,context})=>{
  const apiRequests=[],errors=[];
  page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))apiRequests.push(r.url());});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./');
  await expect(page.getByTestId('question-card')).toHaveAttribute('data-question-id','purpose');
  await expect(page.getByTestId('assumption-notice').first()).toBeVisible();
  await expect(page.getByLabel('이메일 주소',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'접근 관리',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'로그아웃',exact:true})).toHaveCount(0);
  await page.screenshot({path:'artifacts/public-desktop.png',fullPage:true});
  await walk(page);
  const results=page.getByTestId('results');
  await expect(results).toContainText('일반경영안정자금');
  await expect(results).toContainText(assumptionNotice);
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  await page.getByRole('button',{name:'결과 복사',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>navigator.clipboard.readText())).toContain('일반경영안정자금');
  expect(await page.evaluate(()=>navigator.clipboard.readText())).toContain(assumptionNotice);
  await page.evaluate(()=>{window.__printed=false;window.print=()=>{window.__printed=true;};});
  await page.getByRole('button',{name:'인쇄',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.__printed)).toBe(true);
  expect(await page.evaluate(()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage),search:location.search,hash:location.hash}))).toEqual({local:[],session:[],search:'',hash:''});
  expect(await context.cookies()).toEqual([]);
  await page.screenshot({path:'artifacts/public-results.png',fullPage:true});
  await page.reload();
  await expect(page.getByTestId('question-card')).toHaveAttribute('data-question-id','purpose');
  expect(apiRequests).toEqual([]);expect(errors).toEqual([]);
});
test('each choice explains its related funds and expanding names does not select an answer',async({page})=>{
  await page.goto('./');
  const operations=page.getByTestId('option-related-operations');
  await expect(operations.getByText('일반경영안정자금',{exact:true})).toBeVisible();
  await expect(operations.getByText('장애인기업지원자금',{exact:true})).toBeVisible();
  const equipment=page.getByTestId('option-related-equipment');
  await expect(equipment.getByText('혁신성장촉진자금',{exact:true})).toBeVisible();
  await expect(equipment.getByText('민간투자연계형매칭융자',{exact:true})).toBeVisible();
  await expect(equipment).not.toContainText('일반경영안정자금');
  await expect(page.getByTestId('option-related-recovery')).toContainText('긴급경영안정자금(재해·직접대출)');
  await expect(page.getByTestId('option-related-refinance')).toContainText(/자료|범위|대환/);
  await expect(page.getByTestId('option-related-unknown')).toContainText(/확인/);

  const operationsButton=page.getByTestId('option-operations');
  await expect(operationsButton).toHaveAttribute('aria-pressed','false');
  await page.getByTestId('option-related-more-operations').locator('summary').click();
  for(const name of ['청년고용연계자금','긴급경영안정자금 · 일시적경영애로(대리대출)','혁신성장촉진자금','일시적경영애로자금(직접대출)','신용취약소상공인자금','민간투자연계형매칭융자','재도전특별자금']) {
    await expect(operations.getByText(name,{exact:true})).toBeVisible();
  }
  await expect(operations).not.toContainText('긴급경영안정자금(재해·직접대출)');
  await expect(operationsButton).toHaveAttribute('aria-pressed','false');
  await expect(page.getByTestId('next-button')).toBeDisabled();
  await expect(page.getByTestId('question-card')).toHaveAttribute('data-question-id','purpose');
  await operationsButton.click();
  await expect(operationsButton).toHaveAttribute('aria-pressed','true');
  await expect(page.getByTestId('next-button')).toBeEnabled();
  // Toggling the explanatory details must also preserve an existing selection.
  await page.getByTestId('option-related-more-operations').locator('summary').click();
  await expect(operationsButton).toHaveAttribute('aria-pressed','true');
});
test('multiple funds and earlier changes recalculate remaining questions',async({page})=>{
  await page.goto('./');
  await walk(page,{disabledProof:'yes',disabledDetails:'yes',businessAge:'from2To3',ownerAge:'under40'});
  const result=page.getByTestId('results');
  for(const name of ['일반경영안정자금','장애인기업지원자금','청년고용연계자금'])await expect(result).toContainText(name);
  await page.getByTestId('edit-purpose').click();
  await choose(page,['equipment']);
  await expect(page.getByTestId('question-card')).toHaveAttribute('data-question-id','businessStatus');
  await expect(page.getByTestId('edit-disabledProof')).toHaveCount(0);
  await expect(page.getByTestId('edit-ownerAge')).toHaveCount(0);
  await walk(page,{innovationPaths:['smart']});
  await expect(result).toContainText('혁신성장촉진자금');
});
test('closed and unknown paths finish without treating unknown as no',async({page})=>{
  await page.goto('./');await choose(page,['operations']);await choose(page,'closed');
  await expect(page.getByTestId('results')).toBeVisible();
  await page.getByRole('button',{name:'다시 상담하기',exact:true}).first().click();
  await expect(page.getByTestId('question-card')).toHaveAttribute('data-question-id','purpose');
  await walk(page,{},true);
  await expect(page.getByTestId('results')).toContainText('추가 확인 필요');
});
test('single choices advance immediately and previous question restores an answer for correction',async({page})=>{
  await page.goto('./');
  const card=page.getByTestId('question-card');
  await expect(page.getByTestId('back-button')).toBeDisabled();
  await page.getByTestId('option-operations').click();
  await page.getByTestId('option-equipment').click();
  // A multi-select question must wait until both choices have been confirmed.
  await expect(card).toHaveAttribute('data-question-id','purpose');
  await expect(page.getByTestId('option-operations')).toHaveAttribute('aria-pressed','true');
  await expect(page.getByTestId('option-equipment')).toHaveAttribute('aria-pressed','true');
  await page.getByTestId('next-button').click();
  await expect(card).toHaveAttribute('data-question-id','businessStatus');
  await expect(page.getByTestId('next-button')).toHaveCount(0);
  await page.getByTestId('option-active').click();
  await expect(card).toHaveAttribute('data-question-id','exclusionStatus');
  await expect(page.locator('.answer-list li').filter({has:page.getByTestId('edit-businessStatus')})).toContainText('영업 중');

  await page.getByTestId('back-button').click();
  await expect(card).toHaveAttribute('data-question-id','businessStatus');
  await expect(page.getByTestId('option-active')).toHaveAttribute('aria-pressed','true');
  await page.getByTestId('back-button').click();
  await expect(card).toHaveAttribute('data-question-id','purpose');
  await expect(page.getByTestId('option-operations')).toHaveAttribute('aria-pressed','true');
  await expect(page.getByTestId('option-equipment')).toHaveAttribute('aria-pressed','true');
  await page.getByTestId('next-button').click();
  await expect(card).toHaveAttribute('data-question-id','businessStatus');

  // Keyboard activation has the same one-step behavior as clicking.
  await page.getByTestId('option-closed').focus();
  await page.keyboard.press('Enter');
  const results=page.getByTestId('results');
  await expect(results).toContainText('현재 답변에 맞는 후보가 없어요.');
  await expect(results.locator('.fund-result')).toHaveCount(0);
  await expect(page.getByTestId('edit-exclusionStatus')).toHaveCount(0);
  await page.getByTestId('back-button').click();
  await expect(card).toHaveAttribute('data-question-id','businessStatus');
  await expect(page.getByTestId('option-closed')).toHaveAttribute('aria-pressed','true');
  await page.getByTestId('option-unknown').click();
  await expect(card).toHaveAttribute('data-question-id','businessStatusConfirm');
  await page.getByTestId('option-unknown').click();
  await expect(card).toHaveAttribute('data-question-id','exclusionStatus');
  await expect(page.locator('.answer-list li').filter({has:page.getByTestId('edit-businessStatusConfirm')})).toContainText('모름');
  await page.getByTestId('back-button').click();
  await expect(card).toHaveAttribute('data-question-id','businessStatusConfirm');
  await expect(page.getByTestId('option-unknown')).toHaveAttribute('aria-pressed','true');
  await page.getByTestId('option-active').click();
  await expect(card).toHaveAttribute('data-question-id','exclusionStatus');
  await expect(page.locator('.answer-list li').filter({has:page.getByTestId('edit-businessStatusConfirm')})).toContainText('영업 중');
});
test('mobile visitors can complete the consultation with no horizontal overflow',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('./');
  await expect(page.getByTestId('question-card')).toBeVisible();
  await expect(page.getByTestId('option-related-equipment')).toContainText('민간투자연계형매칭융자');
  await page.getByTestId('option-related-more-operations').locator('summary').click();
  await expect(page.getByTestId('option-related-operations').getByText('재도전특별자금',{exact:true})).toBeVisible();
  await expect(page.getByTestId('option-operations')).toHaveAttribute('aria-pressed','false');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'artifacts/public-mobile.png',fullPage:true});
  await choose(page,['operations']);await choose(page,'closed');await expect(page.getByTestId('results')).toBeVisible();
});
test('the same build works beneath a hosting subdirectory',async({page})=>{
  await page.goto('/SEMAS/');
  await expect(page.getByTestId('question-card')).toHaveAttribute('data-question-id','purpose');
  await choose(page,['operations']);await choose(page,'closed');await expect(page.getByTestId('results')).toBeVisible();
});
