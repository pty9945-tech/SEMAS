import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyEmployees, evaluateExpression } from '../policy/engine.js';

const atom = (questionId, op = 'eq', value = 'yes', extra = {}) => ({ questionId, op, value, ...extra });
const status = (rule, answers) => evaluateExpression(rule, answers).status;

test('employee bands distinguish statutory and retained-status boundaries', () => {
  for (const [count, expected] of [[0, 'under5'], [4, 'under5'], [4.5, 'under5'], [5, 'fiveToNine'], [9, 'fiveToNine'], [9.5, 'fiveToNine'], [10, 'tenToNineteen'], [19, 'tenToNineteen'], [19.5, 'tenToNineteen'], [20, 'twentyPlus']]) {
    assert.equal(classifyEmployees(count), expected);
  }
  for (const invalid of [-1, NaN, Infinity, '4', null, {}, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => classifyEmployees(invalid), TypeError);
  }
});

test('four-valued AND/OR truth tables preserve unknown and unanswered separately', () => {
  const values = { met: 'yes', failed: 'no', unknown: 'unknown', unanswered: undefined };
  for (const [left, leftValue] of Object.entries(values)) {
    for (const [right, rightValue] of Object.entries(values)) {
      const answers = { left: leftValue, right: rightValue };
      const children = [atom('left'), atom('right')];
      const pair = [left, right];
      const expectedAll = pair.includes('failed') ? 'failed' : pair.includes('unanswered') ? 'unanswered' : pair.includes('unknown') ? 'unknown' : 'met';
      const expectedAny = pair.includes('met') ? 'met' : pair.includes('unanswered') ? 'unanswered' : pair.includes('unknown') ? 'unknown' : 'failed';
      assert.equal(status({ all: children }, answers), expectedAll, `all(${left},${right})`);
      assert.equal(status({ any: children }, answers), expectedAny, `any(${left},${right})`);
    }
  }
});

test('a satisfied OR does not request a different branch or its unknown confirmation', () => {
  const result = evaluateExpression({ any: [atom('first'), atom('second', 'eq', 'yes', { confirmationId: 'secondConfirm' })] }, { first: 'yes', second: 'unknown' });
  assert.equal(result.status, 'met');
  assert.deepEqual(result.pendingQuestionIds, []);
  assert.deepEqual(result.questionIds, ['first']);
  assert.deepEqual(result.answerLabels, ['yes']);
});

test('failed AND branch prunes pending descendants while another OR branch continues', () => {
  const rule = { any: [{ all: [atom('gate'), atom('irrelevant')] }, atom('alternative')] };
  const result = evaluateExpression(rule, { gate: 'no' });
  assert.equal(result.status, 'unanswered');
  assert.deepEqual(result.pendingQuestionIds, ['alternative']);
  assert.deepEqual(evaluateExpression(rule, { gate: 'no', alternative: 'yes' }).questionIds, ['alternative']);
});

test('unknown values ask a configured confirmation once and use the confirmed answer', () => {
  const rule = atom('original', 'eq', 'yes', { confirmationId: 'confirmed', unknownValues: ['exception'] });
  const initial = evaluateExpression(rule, { original: 'exception' });
  assert.equal(initial.status, 'unknown');
  assert.deepEqual(initial.pendingQuestionIds, ['confirmed']);
  const unresolved = evaluateExpression(rule, { original: 'exception', confirmed: 'unknown' });
  assert.equal(unresolved.status, 'unknown');
  assert.deepEqual(unresolved.pendingQuestionIds, []);
  const confirmed = evaluateExpression(rule, { original: 'exception', confirmed: 'yes' });
  assert.equal(confirmed.status, 'met');
  assert.deepEqual(confirmed.questionIds, ['confirmed']);
  assert.deepEqual(confirmed.answerLabels, ['yes']);
  assert.equal(status(rule, { original: 'no', confirmed: 'yes' }), 'failed', 'confirmation cannot override a known answer');
});

test('a missing main answer cannot be filled by an unrelated confirmation', () => {
  const result = evaluateExpression(atom('original', 'eq', 'yes', { confirmationId: 'confirmed' }), { confirmed: 'yes' });
  assert.equal(result.status, 'unanswered');
  assert.deepEqual(result.pendingQuestionIds, ['original']);
});

test('mixed purpose preserves known matches and unknown additional purpose', () => {
  const answers = { purpose: ['operations', 'other'] };
  assert.equal(status(atom('purpose', 'contains', 'operations'), answers), 'met');
  assert.equal(status(atom('purpose', 'contains', 'operations', { unknownValues: ['other'] }), answers), 'met');
  assert.equal(status(atom('purpose', 'contains', 'equipment'), answers), 'unknown');
  assert.equal(status(atom('purpose', 'contains', 'equipment'), { purpose: ['operations'] }), 'failed');
  assert.equal(status(atom('purpose', 'contains', 'operations'), { purpose: ['unknown', 'operations'] }), 'unknown');
});

test('numeric comparisons implement strict and inclusive boundaries without string coercion', () => {
  for (const boundary of [3, 5, 10, 39, 839]) {
    for (const value of [boundary - 1, boundary, boundary + 1]) {
      for (const [op, expected] of [['lt', value < boundary], ['lte', value <= boundary], ['gt', value > boundary], ['gte', value >= boundary]]) {
        assert.equal(status(atom('number', op, boundary), { number: value }), expected ? 'met' : 'failed', `${value} ${op} ${boundary}`);
      }
    }
  }
  for (const invalid of ['839', NaN, Infinity, null, {}]) {
    assert.equal(status(atom('number', 'lte', 839), { number: invalid }), 'unknown');
  }
});

test('membership is explicit and unknown never means no', () => {
  const rule = atom('category', 'in', ['a', 'b']);
  assert.equal(status(rule, { category: 'a' }), 'met');
  assert.equal(status(rule, { category: 'c' }), 'failed');
  assert.equal(status(rule, { category: 'unknown' }), 'unknown');
  assert.equal(status(rule, {}), 'unanswered');
});

test('malformed rules throw instead of fabricating an eligibility result', () => {
  for (const rule of [null, {}, { all: [] }, { any: [] }, { all: [atom('a')], any: [atom('a')] }, atom('a', 'unsupported')]) {
    assert.throws(() => evaluateExpression(rule, { a: 'yes' }));
  }
});
