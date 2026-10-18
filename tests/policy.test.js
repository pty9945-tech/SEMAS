import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog, conditions, questionFlow } from '../policy/catalog.js';
import { evaluateAnswers, normalizeAnswers } from '../policy/engine.js';

// Each answer is supplied only when the engine actually requests its question.
// This exercises adaptive paths rather than assuming a static form order.
const baseline = {
  purpose: ['operations'], businessStatus: 'active',
  exclusionStatus: 'clear', taxStatus: 'clear', delinquency: 'clear',
  directRecentDelinquency: 'clear',
  agencyRestrictions: 'clear', directRestrictions: 'clear', loanHistory: 'clear',
  generalFrequency: 'clear', disabledProof: 'no', disabledDetails: 'no',
  businessAge: 'from3To7', ownerAge: 'fortyPlus', youthEmployment: 'none',
  salesDrop: 'below15', salesDropAnnual: 'no', hardshipException: ['none'], annualRevenue: 'from104To197m',
  creditScore: 'from840', creditAge: 'atLeast90', creditEducation: 'no', creditGrade: 'oneToEight',
  creditBalance: 'enough', disasterCertificate: 'no', disasterPause: 'no',
  innovationPaths: ['none'], graduationVerified: 'no', academyRestrictions: 'clear', investment: 'no', restartPaths: ['none'], restartVerified: 'no',
};

const assumedQuestionIds = ['employees', 'industry', 'smallEnterprise', 'retainedStatus', 'businessForm'];

function walk(overrides = {}, fillUnknown = false) {
  let result = evaluateAnswers();
  const visited = new Set();
  for (let index = 0; !result.complete && index < catalog.questions.length + 2; index += 1) {
    const question = result.nextQuestion;
    assert.ok(!assumedQuestionIds.includes(question.id), `basic eligibility must be assumed: ${question.id}`);
    assert.ok(!visited.has(question.id), `question repeated: ${question.id}`);
    visited.add(question.id);
    const value = Object.hasOwn(overrides, question.id) ? overrides[question.id]
      : fillUnknown ? (question.type === 'multi' ? ['unknown'] : 'unknown') : baseline[question.id];
    assert.notEqual(value, undefined, `test fixture missing requested question: ${question.id}`);
    result = evaluateAnswers({ ...result.answers, [question.id]: value });
  }
  assert.equal(result.complete, true, 'valid answers must eventually reach a result');
  assert.deepEqual(normalizeAnswers(result.answers), result.answers);
  return result;
}
const viable = (result) => result.candidates.filter((fund) => fund.status !== 'ineligible');
const fundByName = (result, text) => {
  const matches = result.candidates.filter((fund) => fund.name.includes(text));
  assert.equal(matches.length, 1, `expected one fund matching ${text}`);
  return matches[0];
};

function atomicRules(rule) {
  return rule.all || rule.any ? (rule.all ?? rule.any).flatMap(atomicRules) : [rule];
}

test('catalog conditions and adaptive flow reference real source-linked questions', () => {
  const ids = new Set(catalog.questions.map((question) => question.id));
  assert.equal(ids.size, catalog.questions.length);
  assert.equal(new Set(questionFlow.map((step) => step.questionId)).size, questionFlow.length);
  for (const step of questionFlow) assert.ok(ids.has(step.questionId));
  for (const [conditionId, condition] of Object.entries(conditions)) {
    assert.ok(condition.label, conditionId);
    assert.ok(condition.evidence.document, conditionId);
    assert.ok(condition.evidence.item || condition.evidence.page, conditionId);
    assert.notEqual(condition.evidence.mode, 'demo');
    for (const rule of atomicRules(condition.rule)) {
      assert.ok(ids.has(rule.questionId), `${conditionId}: ${rule.questionId}`);
      assert.ok(questionFlow.some((step) => step.questionId === rule.questionId));
      if (rule.confirmationId) assert.ok(ids.has(rule.confirmationId));
    }
  }
  for (const fund of catalog.funds) for (const id of fund.conditionIds) assert.ok(conditions[id], `${fund.id}: ${id}`);
});

test('empty consultation starts with funding purpose and retains all candidates', () => {
  const result = evaluateAnswers();
  assert.equal(result.nextQuestion.id, 'purpose');
  assert.equal(result.complete, false);
  assert.deepEqual(result.answers, {});
  assert.equal(viable(result).length, catalog.funds.length);
});

test('closed business ends without asking irrelevant downstream questions', () => {
  const result = evaluateAnswers({ businessStatus: 'closed', purpose: ['operations'], employees: 'under5' });
  assert.equal(result.complete, true);
  assert.deepEqual(result.answers, { purpose: ['operations'], businessStatus: 'closed' });
  assert.equal(viable(result).length, 0);
  assert.ok(result.candidates.every((fund) => fund.reasons.some((reason) => reason.status === 'failed')));
});

test('unknown answers reach a result with additional checks and never fabricate failure', () => {
  const result = walk({}, true);
  assert.equal(viable(result).length, catalog.funds.length);
  assert.ok(result.candidates.every((fund) => fund.status === 'needs_info'));
  assert.ok(result.candidates.every((fund) => !fund.reasons.some((reason) => reason.status === 'failed')));
  assert.equal(result.progress.answered, result.progress.totalRelevant);
});

test('unknown business status asks one confirmation and records the answer actually used', () => {
  const pending = evaluateAnswers({ purpose: ['operations'], businessStatus: 'unknown' });
  assert.equal(pending.nextQuestion.id, 'businessStatusConfirm');
  const result = walk({ businessStatus: 'unknown', businessStatusConfirm: 'active' });
  const matching = result.candidates.flatMap((fund) => fund.reasons).filter((reason) => reason.questionIds.includes('businessStatusConfirm'));
  assert.ok(matching.length > 0);
  assert.ok(matching.every((reason) => reason.answerLabel.includes('영업 중')));
});

test('changing a common answer recalculates all candidates and removes stale later answers', () => {
  const before = walk();
  assert.ok(Object.keys(before.answers).length > 1);
  const changed = evaluateAnswers({ ...before.answers, businessStatus: 'closed' });
  assert.equal(viable(changed).length, 0);
  assert.deepEqual(changed.answers, { purpose: ['operations'], businessStatus: 'closed' });
});

test('newly required confirmation clears all answers after the missing step', () => {
  const before = walk();
  const changed = evaluateAnswers({ ...before.answers, businessStatus: 'unknown' });
  assert.equal(changed.nextQuestion.id, 'businessStatusConfirm');
  assert.deepEqual(changed.answers, { purpose: ['operations'], businessStatus: 'unknown' });
});

test('invalid values, personal fields and injected shapes do not enter consultation state', () => {
  for (const invalid of [null, [], 'active', 4]) assert.deepEqual(normalizeAnswers(invalid), {});
  assert.deepEqual(normalizeAnswers({ purpose: 'operations', businessStatus: 'active' }), {});
  assert.deepEqual(normalizeAnswers({ purpose: ['unrecognized'] }), {});
  assert.deepEqual(normalizeAnswers({ purpose: ['operations'], businessStatus: ['active'] }), { purpose: ['operations'] });
  assert.deepEqual(normalizeAnswers({ purpose: ['operations'], businessStatus: 'unrecognized' }), { purpose: ['operations'] });
  const before = walk();
  const withPersonal = normalizeAnswers({ ...before.answers, personalName: 'discard', phone: 'discard', businessRegistration: 'discard' });
  assert.deepEqual(withPersonal, before.answers);
  assert.deepEqual(normalizeAnswers({ businessStatus: 'active', employees: ['under5'], purpose: ['operations'] }), { purpose: ['operations'], businessStatus: 'active' });
});

test('source metadata reports the uploaded 2026 documents without claiming live applications', () => {
  assert.equal(catalog.meta.year, 2026);
  assert.notEqual(catalog.meta.mode, 'demo');
  assert.match(catalog.meta.verifiedAt, /^2026-\d\d-\d\d$/);
  const result = walk();
  for (const fund of result.candidates) {
    assert.doesNotMatch(fund.name, /시연용/);
    assert.equal(fund.year, 2026);
    assert.equal(fund.applicationStatus.status, 'unknown');
    assert.ok(fund.sources.length > 0);
    assert.ok(fund.terms.limit && fund.terms.rate && fund.terms.period);
    assert.ok(fund.documents.length > 0);
    assert.ok(fund.procedure.length > 0);
    assert.ok(fund.links.some((link) => link.url.startsWith('https://ols.semas.or.kr/')));
    assert.ok(fund.reasons.every((reason) => reason.evidence.document && reason.questionId && reason.answerLabel));
  }
});

test('ordinary operating path retains general management funding and skips failed special branches', () => {
  const result = walk();
  assert.equal(fundByName(result, '일반경영안정자금').status, 'reviewing');
  assert.ok(fundByName(result, '일반경영안정자금').reasons.every((reason) => reason.status === 'met'));
  assert.equal(fundByName(result, '장애인기업지원자금').status, 'ineligible');
  assert.equal(result.answers.disabledDetails, undefined);
  assert.equal(result.answers.creditEducation, undefined);
  assert.equal(result.answers.restartVerified, undefined);
});

test('multiple special qualifications retain general, disabled and youth funding together', () => {
  const result = walk({ disabledProof: 'yes', disabledDetails: 'yes', businessAge: 'from2To3', ownerAge: 'under40' });
  for (const name of ['일반경영안정자금', '장애인기업지원자금', '청년고용연계자금']) {
    assert.equal(fundByName(result, name).status, 'reviewing', name);
  }
});

test('youth owner path excludes age 40 and business age 3 years, while hiring is an alternative', () => {
  for (const [businessAge, ownerAge, expected] of [
    ['from2To3', 'under40', 'reviewing'], ['from3To7', 'under40', 'ineligible'],
    ['from2To3', 'fortyPlus', 'ineligible'],
  ]) {
    const result = walk({ businessAge, ownerAge });
    assert.equal(fundByName(result, '청년고용연계자금').status, expected, `${businessAge}/${ownerAge}`);
  }
  const noEmployment = walk({ businessAge: 'sevenPlus', ownerAge: 'fortyPlus', youthEmployment: 'none' });
  assert.equal(noEmployment.answers.youthEmployment, 'none');
  assert.equal(fundByName(noEmployment, '청년고용연계자금').status, 'ineligible');
  for (const youthEmployment of ['majority', 'recent']) {
    const result = walk({ businessAge: 'sevenPlus', ownerAge: 'fortyPlus', youthEmployment });
    assert.equal(result.answers.youthEmployment, youthEmployment);
    assert.equal(fundByName(result, '청년고용연계자금').status, 'reviewing');
  }
  const ownerPath = walk({ businessAge: 'from2To3', ownerAge: 'under40' });
  assert.equal(ownerPath.answers.youthEmployment, undefined, 'met owner branch prunes an unnecessary employment question');
});

test('basic small-business eligibility is an explicit assumption, never a requested answer', () => {
  assert.match(catalog.meta.assumptionNotice, /소상공인 기본요건 충족을 전제로 상담합니다/);
  assert.ok(Array.isArray(catalog.meta.assumedRequirements) && catalog.meta.assumedRequirements.length > 0);
  for (const id of assumedQuestionIds) {
    assert.ok(!catalog.questions.some((question) => question.id === id), id);
    assert.ok(!questionFlow.some((step) => step.questionId === id), id);
  }
  for (const id of ['SIZE-EMP', 'SIZE-REV', 'FORM']) assert.equal(conditions[id], undefined, id);
  const before = walk();
  const changed = evaluateAnswers({
    ...before.answers,
    employees: 'twentyPlus', industry: 'other', smallEnterprise: 'no',
    retainedStatus: 'no', businessForm: 'excluded',
  });
  assert.deepEqual(changed, before, 'old basic-eligibility answers cannot affect candidates or summaries');
  assert.ok(assumedQuestionIds.every((id) => !Object.hasOwn(changed.answers, id)));
});

test('purpose clarification precedes remaining conditions and a purpose edit clears its later path', () => {
  const pending = evaluateAnswers({ purpose: ['unknown'] });
  assert.equal(pending.nextQuestion.id, 'purposeConfirm');
  const confirmed = evaluateAnswers({ purpose: ['unknown'], purposeConfirm: ['operations'] });
  assert.equal(confirmed.nextQuestion.id, 'businessStatus');
  const changed = evaluateAnswers({ purpose: ['equipment'], employees: 'twentyPlus', smallEnterprise: 'no' });
  assert.deepEqual(changed.answers, { purpose: ['equipment'] });
  assert.equal(changed.nextQuestion.id, 'businessStatus');
  assert.equal(changed.candidates.find((fund) => fund.id === 'general').status, 'ineligible');
});

test('NCB 839/840 and 90-day boundary affect credit-vulnerable funding', () => {
  const qualifying = { businessAge: 'from90To2', creditScore: 'upTo839', creditEducation: 'yes' };
  assert.equal(fundByName(walk(qualifying), '신용취약소상공인자금').status, 'reviewing');
  for (const override of [{ creditAge: 'under90' }, { creditScore: 'from840' }, { creditEducation: 'no' }, { creditBalance: 'insufficient' }]) {
    assert.equal(fundByName(walk({ ...qualifying, ...override }), '신용취약소상공인자금').status, 'ineligible');
  }
  const unknown = walk({ ...qualifying, creditScore: 'unknown' });
  assert.equal(fundByName(unknown, '신용취약소상공인자금').status, 'needs_info');
});

test('credit grade 9/10 revenue boundary is different from personal credit score', () => {
  const qualifying = { businessAge: 'from90To2', creditScore: 'upTo839', creditEducation: 'yes', creditGrade: 'nineToTen' };
  assert.equal(fundByName(walk({ ...qualifying, annualRevenue: 'from104To197m' }), '신용취약소상공인자금').status, 'ineligible');
  const confirmed = walk({ ...qualifying, annualRevenue: 'atLeast197m' });
  assert.equal(confirmed.answers.creditGrade, 'nineToTen');
  assert.equal(confirmed.answers.annualRevenue, 'atLeast197m');
  assert.equal(fundByName(confirmed, '신용취약소상공인자금').status, 'reviewing');
});

test('refinance-only purpose never invents an unattached refinancing program', () => {
  const result = walk({ purpose: ['refinance'] });
  assert.equal(viable(result).length, 0);
});

test('known purposes skip clarification while unspecified additional purposes are checked without losing known matches', () => {
  const known = walk({ purpose: ['operations'] });
  assert.equal(known.answers.purposeConfirm, undefined);
  const pending = evaluateAnswers({ purpose: ['operations', 'other'] });
  assert.equal(pending.nextQuestion.id, 'purposeConfirm');
  const mixed = walk({ purpose: ['operations', 'other'], purposeConfirm: ['unknown'] });
  assert.equal(fundByName(mixed, '일반경영안정자금').status, 'reviewing');
  assert.deepEqual(mixed.answers.purposeConfirm, ['unknown']);
  const unresolved = walk({ purpose: ['other'], purposeConfirm: ['unknown'] });
  assert.deepEqual(unresolved.answers.purposeConfirm, ['unknown']);
  assert.equal(fundByName(unresolved, '일반경영안정자금').status, 'needs_info');
});

test('none and unknown multi-selection are exclusive even in forged requests', () => {
  const none = walk({ innovationPaths: ['smart', 'none'] });
  assert.deepEqual(none.answers.innovationPaths, ['none']);
  const unknown = walk({ innovationPaths: ['smart', 'unknown'] });
  assert.deepEqual(unknown.answers.innovationPaths, ['unknown']);
});

test('normalization is deterministic, idempotent and does not mutate the request', () => {
  const result = walk({ disabledProof: 'yes', disabledDetails: 'yes' });
  const input = structuredClone(result.answers);
  const before = structuredClone(input);
  assert.deepEqual(normalizeAnswers(input), input);
  assert.deepEqual(input, before);
  assert.deepEqual(evaluateAnswers(input), evaluateAnswers(input));
});

test('temporary difficulty preserves agency route at direct revenue and seven-year boundaries', () => {
  const base = { salesDrop:'atLeast15', annualRevenue:'under104m', businessAge:'from3To7' };
  const status=(result,id)=>result.candidates.find(f=>f.id===id).status;
  const confirmed = walk(base);
  assert.equal(confirmed.answers.annualRevenue, 'under104m');
  assert.equal(status(confirmed,'temporary-direct'),'reviewing');
  assert.equal(status(walk(base),'temporary-agency'),'reviewing');
  for(const change of [{annualRevenue:'from104To197m'},{businessAge:'sevenPlus'}]) {
    const result=walk({...base,...change});
    assert.equal(status(result,'temporary-direct'),'ineligible');
    assert.equal(status(result,'temporary-agency'),'reviewing');
  }
  const exempt=walk({...base,salesDrop:'below15',hardshipException:['flight1229']});
  assert.equal(status(exempt,'temporary-direct'),'reviewing');
  assert.equal(status(exempt,'temporary-agency'),'reviewing');
});

test('disaster direct loan needs the specific tax measure and permits disaster-caused pause', () => {
  const base={purpose:['recovery'],disasterCertificate:'yes',taxStatus:'seizure'};
  const status=result=>result.candidates.find(f=>f.id==='emergency-direct').status;
  assert.equal(status(walk(base)),'reviewing');
  assert.equal(status(walk({...base,taxStatus:'deferred'})),'ineligible');
  assert.equal(status(walk({...base,businessStatus:'paused',businessStatusConfirm:'paused',disasterPause:'yes'})),'reviewing');
  assert.equal(status(walk({...base,businessStatus:'paused',businessStatusConfirm:'paused',disasterPause:'no'})),'ineligible');
});

test('academy facility exclusion and route-specific restrictions leave other innovation routes intact', () => {
  const status=result=>result.candidates.find(f=>f.id==='innovation').status;
  assert.equal(status(walk({innovationPaths:['academy'],academyRestrictions:'clear'})),'reviewing');
  assert.equal(status(walk({innovationPaths:['academy'],academyRestrictions:'blocked'})),'ineligible');
  assert.equal(status(walk({purpose:['equipment'],innovationPaths:['academy']})),'ineligible');
  const alternative=walk({purpose:['equipment'],innovationPaths:['academy','smart'],academyRestrictions:'blocked'});
  assert.equal(status(alternative),'reviewing');
  assert.equal(alternative.answers.academyRestrictions,undefined);
});

test('graduation-specific revenue, employee band and retained-status verification remains required', () => {
  const status = (result) => result.candidates.find((fund) => fund.id === 'innovation').status;
  const selected = { innovationPaths: ['graduation'] };
  const confirmed = walk({ ...selected, graduationVerified: 'yes' });
  assert.equal(status(confirmed), 'reviewing');
  assert.equal(confirmed.answers.graduationVerified, 'yes');
  assert.equal(status(walk({ ...selected, graduationVerified: 'no' })), 'ineligible');
  assert.equal(status(walk({ ...selected, graduationVerified: 'unknown' })), 'needs_info');
  const alternative = walk({ innovationPaths: ['graduation', 'export'], graduationVerified: 'no' });
  assert.equal(status(alternative), 'reviewing');
  assert.equal(alternative.answers.graduationVerified, undefined, 'another proven innovation path makes graduation confirmation unnecessary');
  const question = catalog.questions.find((item) => item.id === 'graduationVerified');
  for (const detail of ['30%', '3명', '5명', '8명', '10명', '지위유지']) assert.ok(question.description.includes(detail), detail);
});

test('investment and restart require their actual evidence, not just a selected label', () => {
  const investment=walk({purpose:['equipment'],investment:'yes'}).candidates.find(f=>f.id==='investment');
  assert.equal(investment.status,'reviewing');
  const restart=walk({restartPaths:['early'],restartVerified:'unknown'}).candidates.find(f=>f.id==='restart');
  assert.equal(restart.status,'needs_info');
  assert.equal(walk({restartPaths:['early'],restartVerified:'yes'}).candidates.find(f=>f.id==='restart').status,'reviewing');
});

test('a restriction awaiting fund-specific exception review is not a blanket rejection', () => {
  const result=walk({directRestrictions:'exception',investment:'yes',innovationPaths:['smart']});
  for(const id of ['investment','innovation']) assert.equal(result.candidates.find(f=>f.id===id).status,'needs_info');
  assert.equal(result.candidates.find(f=>f.id==='general').status,'reviewing');
});
