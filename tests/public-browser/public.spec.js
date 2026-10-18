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
  for(const item of Array.isArray(value)?value:[value]) await page.getByTestId(`option-${item}`).click();
  await page.getByTestId('next-button').click();
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
test('mobile visitors can complete the consultation with no horizontal overflow',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('./');
  await expect(page.getByTestId('question-card')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'artifacts/public-mobile.png',fullPage:true});
  await choose(page,['operations']);await choose(page,'closed');await expect(page.getByTestId('results')).toBeVisible();
});
test('the same build works beneath a hosting subdirectory',async({page})=>{
  await page.goto('/SEMAS/');
  await expect(page.getByTestId('question-card')).toHaveAttribute('data-question-id','purpose');
  await choose(page,['operations']);await choose(page,'closed');await expect(page.getByTestId('results')).toBeVisible();
});
