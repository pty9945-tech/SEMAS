import { catalog, conditions, questionFlow } from './catalog.js';

const questionById = new Map(catalog.questions.map((question) => [question.id, question]));
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const unique = (values) => [...new Set(values)];

/** Count bands are UI helpers; the applicable industry threshold is a rule. */
export function classifyEmployees(count) {
  if (typeof count !== 'number' || !Number.isFinite(count) || count < 0 || count > Number.MAX_SAFE_INTEGER) {
    throw new TypeError('상시근로자 수는 0 이상인 유한한 숫자여야 합니다.');
  }
  if (count < 5) return 'under5';
  if (count < 10) return 'fiveToNine';
  if (count < 20) return 'tenToNineteen';
  return 'twentyPlus';
}

function sanitizeAnswers(input) {
  const sanitized = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return sanitized;
  for (const question of catalog.questions) {
    if (!hasOwn(input, question.id)) continue;
    const value = input[question.id];
    const options = question.options ?? [];
    const allowed = new Set(options.map((option) => option.value));
    if (question.type === 'number' || question.type === 'numeric') {
      if (value === 'unknown' && question.allowUnknown !== false) {
        sanitized[question.id] = value;
      } else if (
        typeof value === 'number' && Number.isFinite(value)
        && value >= (question.min ?? 0) && value <= (question.max ?? Number.MAX_SAFE_INTEGER)
        && (question.step !== 1 || Number.isSafeInteger(value))
      ) {
        sanitized[question.id] = value;
      }
    } else if (question.type === 'single') {
      if (typeof value === 'string' && allowed.has(value)) sanitized[question.id] = value;
    } else if (
      question.type === 'multi' && Array.isArray(value) && value.length > 0
      && value.length <= options.length
      && value.every((item) => typeof item === 'string' && allowed.has(item))
    ) {
      // Unknown and none remain exclusive for a forged mixed API payload too.
      sanitized[question.id] = value.includes('unknown')
        ? ['unknown']
        : value.includes('none') ? ['none']
          : options.map((option) => option.value).filter((item) => value.includes(item));
    }
  }
  return sanitized;
}

function isUnknown(value) {
  return value === 'unknown' || (Array.isArray(value) && value.includes('unknown'));
}

function answerLabel(questionId, value) {
  if (value === undefined) return '아직 답하지 않음';
  if (isUnknown(value)) return '모름 · 확인 필요';
  const question = questionById.get(questionId);
  if (typeof value === 'number') return `${value}${question?.unit ?? ''}`;
  const values = Array.isArray(value) ? value : [value];
  return values.map((item) => question?.options?.find((option) => option.value === item)?.label ?? String(item)).join(', ');
}

function unresolvedValue(rule, value) {
  if (isUnknown(value)) return true;
  const values = Array.isArray(value) ? value : [value];
  const containsExpected = rule.op === 'contains' && Array.isArray(value) && value.includes(rule.value);
  if ((rule.unknownValues ?? []).some((item) => values.includes(item) && !(item === 'other' && containsExpected))) return true;
  // A known purpose satisfies its own rule even alongside "other"; the
  // unspecified purpose must not exclude a different fund prematurely.
  return rule.op === 'contains' && Array.isArray(value)
    && !containsExpected && value.includes('other');
}

function atomicExpression(rule, answers) {
  if (!rule.questionId) throw new Error('조건에 질문 ID가 없습니다.');
  let questionId = rule.questionId;
  let value = answers[questionId];
  if (unresolvedValue(rule, value) && rule.confirmationId && hasOwn(answers, rule.confirmationId)) {
    questionId = rule.confirmationId;
    value = answers[questionId];
  }
  let status;
  let pendingQuestionIds = [];
  if (value === undefined) {
    status = 'unanswered';
    pendingQuestionIds = [questionId];
  } else if (unresolvedValue(rule, value)) {
    status = 'unknown';
    if (questionId === rule.questionId && rule.confirmationId) pendingQuestionIds = [rule.confirmationId];
  } else {
    let met;
    switch (rule.op) {
      case 'eq': met = value === rule.value; break;
      case 'in':
        if (!Array.isArray(rule.value)) throw new Error('in 조건에는 값 목록이 필요합니다.');
        met = rule.value.includes(value); break;
      case 'contains': met = Array.isArray(value) && value.includes(rule.value); break;
      case 'lt': case 'lte': case 'gt': case 'gte':
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          return { status: 'unknown', questionIds: [questionId], answerLabels: [answerLabel(questionId, value)], pendingQuestionIds: [] };
        }
        if (typeof rule.value !== 'number' || !Number.isFinite(rule.value)) throw new Error('숫자 비교 조건에는 유한한 숫자 기준이 필요합니다.');
        met = rule.op === 'lt' ? value < rule.value
          : rule.op === 'lte' ? value <= rule.value
            : rule.op === 'gt' ? value > rule.value : value >= rule.value;
        break;
      default: throw new Error(`정의되지 않은 조건 연산: ${rule.op}`);
    }
    status = met ? 'met' : 'failed';
  }
  return { status, questionIds: [questionId], answerLabels: [answerLabel(questionId, value)], pendingQuestionIds };
}

/**
 * Explicit four-valued predicates: unmet, met, unknown, or not yet answered.
 * A decisive OR match / AND failure prunes the other branches from questions.
 * No inference, coercion, probability, or implicit exception is applied.
 */
export function evaluateExpression(rule, answers = {}) {
  if (!rule || typeof rule !== 'object') throw new Error('조건식이 없습니다.');
  if (!hasOwn(rule, 'all') && !hasOwn(rule, 'any')) return atomicExpression(rule, answers);
  const conjunction = hasOwn(rule, 'all');
  const children = conjunction ? rule.all : rule.any;
  if (!Array.isArray(children) || children.length === 0 || (hasOwn(rule, 'all') && hasOwn(rule, 'any'))) {
    throw new Error('복합 조건에는 all 또는 any 조건 목록 하나가 필요합니다.');
  }
  const evaluated = children.map((child) => evaluateExpression(child, answers));
  const decisiveStatus = conjunction ? 'failed' : 'met';
  const decisive = evaluated.filter((child) => child.status === decisiveStatus);
  const status = decisive.length ? decisiveStatus
    : evaluated.some((child) => child.status === 'unanswered') ? 'unanswered'
      : evaluated.some((child) => child.status === 'unknown') ? 'unknown'
        : conjunction ? 'met' : 'failed';
  const used = decisive.length ? decisive : evaluated;
  const questionIds = unique(used.flatMap((child) => child.questionIds));
  return {
    status, questionIds,
    answerLabels: questionIds.map((questionId) => answerLabel(questionId, answers[questionId])),
    pendingQuestionIds: decisive.length ? [] : unique(evaluated.flatMap((child) => child.pendingQuestionIds)),
  };
}

function evaluateCondition(conditionId, answers) {
  const condition = conditions[conditionId];
  if (!condition) throw new Error(`정의되지 않은 조건: ${conditionId}`);
  const evaluated = evaluateExpression(condition.rule, answers);
  return {
    conditionId, label: condition.label, status: evaluated.status,
    questionId: evaluated.questionIds[0], questionIds: evaluated.questionIds,
    answerLabel: evaluated.answerLabels.join(' / '), evidence: { ...condition.evidence },
  };
}

function evaluateCandidates(answers) {
  return catalog.funds.map((fund) => {
    const reasons = fund.conditionIds.map((conditionId) => evaluateCondition(conditionId, answers));
    const status = reasons.some((reason) => reason.status === 'failed')
      ? 'ineligible'
      : reasons.some((reason) => reason.status === 'unknown') ? 'needs_info' : 'reviewing';
    return { ...fund, status, reasons };
  });
}

function atoms(rule) {
  return rule.all || rule.any ? (rule.all ?? rule.any).flatMap(atoms) : [rule];
}

function stepAllowed(step, answers, viable) {
  if (hasOwn(answers, step.questionId)) return false;
  if (step.ifUnknown) {
    const value = answers[step.ifUnknown];
    const relevantAtoms = viable.flatMap((fund) => fund.conditionIds)
      .flatMap((id) => atoms(conditions[id].rule)).filter((rule) => rule.questionId === step.ifUnknown);
    if (!isUnknown(value) && !relevantAtoms.some((rule) => unresolvedValue(rule, value))) return false;
  }
  if (step.ifIn) {
    const value = answers[step.ifIn.questionId];
    if (!(Array.isArray(value) ? value.some((item) => step.ifIn.values.includes(item)) : step.ifIn.values.includes(value))) return false;
  }
  if (step.ifUnresolvedPurpose) {
    const value = answers[step.ifUnresolvedPurpose];
    if (!isUnknown(value) && !(Array.isArray(value) && value.includes('other'))) return false;
  }
  return !step.fundIds || viable.some((candidate) => step.fundIds.includes(candidate.id));
}

function relevantQuestions(answers, candidates) {
  const viable = candidates.filter((candidate) => candidate.status !== 'ineligible');
  const pending = new Set(viable.flatMap((candidate) => candidate.conditionIds)
    .flatMap((conditionId) => evaluateExpression(conditions[conditionId].rule, answers).pendingQuestionIds));
  return questionFlow.filter((step) => pending.has(step.questionId) && stepAllowed(step, answers, viable))
    .map((step) => {
      const question = questionById.get(step.questionId);
      if (!question) throw new Error(`분기표에 정의되지 않은 질문: ${step.questionId}`);
      return question;
    });
}

/** Replay the valid path; never retain answers after a missing required step. */
export function normalizeAnswers(input = {}) {
  const supplied = sanitizeAnswers(input);
  const normalized = {};
  for (let index = 0; index < questionFlow.length; index += 1) {
    const next = relevantQuestions(normalized, evaluateCandidates(normalized))[0];
    if (!next || !hasOwn(supplied, next.id)) break;
    normalized[next.id] = supplied[next.id];
  }
  return normalized;
}

export function evaluateAnswers(input = {}) {
  const answers = normalizeAnswers(input);
  const candidates = evaluateCandidates(answers);
  const remaining = relevantQuestions(answers, candidates);
  const nextQuestion = remaining[0] ?? null;
  // A missing source/question mapping must never silently look fully checked.
  if (!nextQuestion) {
    for (const candidate of candidates) {
      if (candidate.status === 'reviewing' && candidate.reasons.some((reason) => reason.status === 'unanswered')) candidate.status = 'needs_info';
    }
  }
  const answered = Object.entries(answers).map(([questionId, value]) => ({
    questionId, title: questionById.get(questionId).title,
    answerLabel: answerLabel(questionId, value), value,
  }));
  return {
    nextQuestion, candidates, answered, complete: nextQuestion === null,
    progress: { answered: answered.length, totalRelevant: answered.length + remaining.length },
    answers,
  };
}
