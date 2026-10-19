import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../policy/catalog.js';
import { evaluateAnswers } from '../policy/engine.js';

const baseline = {
  purpose: ['operations'], businessStatus: 'active', exclusionStatus: 'clear',
  taxStatus: 'clear', delinquency: 'clear', directRecentDelinquency: 'clear',
  agencyRestrictions: 'clear', directRestrictions: 'clear', loanHistory: 'clear',
  generalFrequency: 'clear', disabledProof: 'no', disabledDetails: 'no',
  businessAge: 'from3To7', ownerAge: 'fortyPlus', youthEmployment: 'none',
  salesDrop: 'below15', hardshipException: ['none'], annualRevenue: 'from104To197m',
  creditScore: 'from840', creditAge: 'atLeast90', creditEducation: 'no',
  creditGrade: 'oneToEight', creditBalance: 'enough', disasterCertificate: 'no',
  disasterPause: 'no', innovationPaths: ['none'], graduationVerified: 'no',
  academyRestrictions: 'clear', investment: 'no', restartPaths: ['none'], restartVerified: 'no',
};

function until(questionId, overrides = {}) {
  let state = evaluateAnswers();
  for (let step = 0; step <= catalog.questions.length && !state.complete; step += 1) {
    if (state.nextQuestion.id === questionId) return state;
    const id = state.nextQuestion.id;
    const value = overrides[id] ?? baseline[id];
    assert.notEqual(value, undefined, `missing answer fixture for ${id}`);
    state = evaluateAnswers({ ...state.answers, [id]: value });
  }
  assert.fail(`question ${questionId} was not reached`);
}
const option = (state, value) => {
  const result = state.nextQuestion.options.find((item) => item.value === value);
  assert.ok(result, `missing option ${state.nextQuestion.id}/${value}`);
  assert.ok(Array.isArray(result.relatedFunds), `${value} must have explicit related funds`);
  return result;
};
const relatedIds = (state, value) => option(state, value).relatedFunds.map((fund) => fund.id).sort();

test('each purpose displays the funds supported by its explicit source rules', () => {
  const state = evaluateAnswers();
  assert.equal(state.nextQuestion.id, 'purpose');
  assert.deepEqual(relatedIds(state, 'operations'), catalog.funds.filter((fund) => fund.id !== 'emergency-direct').map((fund) => fund.id).sort());
  // Facility lending remains related while its separate investment/innovation
  // qualifications have not been answered; it is not a claim of eligibility.
  assert.deepEqual(relatedIds(state, 'equipment'), ['innovation', 'investment']);
  assert.deepEqual(relatedIds(state, 'recovery'), ['emergency-direct']);
  assert.deepEqual(relatedIds(state, 'refinance'), []);
  assert.match(option(state, 'refinance').relationNote, /자료|범위|대환/);
});

test('unknown and unspecified purposes preserve all funds as additional checks', () => {
  const state = evaluateAnswers();
  const allIds = catalog.funds.map((fund) => fund.id).sort();
  for (const value of ['unknown', 'other']) {
    assert.deepEqual(relatedIds(state, value), allIds);
    assert.match(option(state, value).relationLabel, /확인/);
  }
  const confirmation = evaluateAnswers({ purpose: ['unknown'] });
  assert.equal(confirmation.nextQuestion.id, 'purposeConfirm');
  assert.deepEqual(relatedIds(confirmation, 'equipment'), ['innovation', 'investment']);
  assert.deepEqual(relatedIds(confirmation, 'unknown'), allIds);
});

test('credit score choices reference only the credit-vulnerable fund, including failed and unknown choices', () => {
  const state = until('creditScore');
  for (const value of ['upTo839', 'from840', 'unknown']) {
    assert.deepEqual(relatedIds(state, value), ['credit']);
  }
  assert.match(option(state, 'from840').relationLabel, /요건.*확인/);
  assert.match(option(state, 'unknown').relationLabel, /확인/);
});

test('no and none choices still identify the fund whose requirement is being checked', () => {
  const disabled = until('disabledProof');
  assert.deepEqual(relatedIds(disabled, 'yes'), ['disabled']);
  assert.deepEqual(relatedIds(disabled, 'no'), ['disabled']);
  assert.match(option(disabled, 'no').relationLabel, /요건.*확인/);
  const innovation = until('innovationPaths');
  assert.deepEqual(relatedIds(innovation, 'smart'), ['innovation']);
  assert.deepEqual(relatedIds(innovation, 'none'), ['innovation']);
  assert.match(option(innovation, 'none').relationLabel, /요건.*확인/);
});

test('relations omit already excluded candidates and keep only funds relevant to this question', () => {
  const state = evaluateAnswers({ purpose: ['recovery'] });
  assert.equal(state.nextQuestion.id, 'businessStatus');
  assert.equal(state.candidates.filter((fund) => fund.status !== 'ineligible').length, 1);
  for (const value of ['active', 'paused', 'closed', 'unknown']) {
    assert.deepEqual(relatedIds(state, value), ['emergency-direct']);
  }
  const credit = until('creditScore');
  assert.ok(credit.candidates.some((fund) => fund.id === 'general' && fund.status !== 'ineligible'));
  assert.ok(!relatedIds(credit, 'upTo839').includes('general'), 'an unrelated viable fund must not be advertised for this question');
});

test('every annotation has unique real fund names and never restores assumed basic-eligibility questions', () => {
  const originalQuestions = structuredClone(catalog.questions);
  const knownFunds = new Map(catalog.funds.map((fund) => [fund.id, fund.name]));
  const assumed = ['employees', 'industry', 'smallEnterprise', 'retainedStatus', 'businessForm'];
  for (const unknownAnswers of [false, true]) {
    let state = evaluateAnswers();
    for (let step = 0; !state.complete && step <= catalog.questions.length; step += 1) {
      const question = state.nextQuestion;
      assert.ok(!assumed.includes(question.id));
      const viableIds = new Set(state.candidates.filter((fund) => fund.status !== 'ineligible').map((fund) => fund.id));
      for (const item of question.options) {
        const ids = relatedIds(state, item.value);
        assert.equal(ids.length, new Set(ids).size, `${question.id}/${item.value} duplicates`);
        assert.ok(item.relationLabel || item.relationNote, `${question.id}/${item.value} needs a readable explanation`);
        for (const fund of item.relatedFunds) {
          assert.equal(fund.name, knownFunds.get(fund.id));
          assert.ok(viableIds.has(fund.id), `${fund.id} was already excluded`);
        }
      }
      const value = unknownAnswers ? (question.type === 'multi' ? ['unknown'] : 'unknown') : baseline[question.id];
      assert.notEqual(value, undefined, `missing answer fixture for ${question.id}`);
      state = evaluateAnswers({ ...state.answers, [question.id]: value });
    }
    assert.equal(state.complete, true);
  }
  assert.deepEqual(catalog.questions, originalQuestions, 'derived annotations must not mutate the policy catalog');
});
