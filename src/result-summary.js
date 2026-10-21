// Presentation only: keep the engine's explicit condition status, wording,
// answers and evidence intact. A shared question can have different rules in
// different funds, so group follow-ups by condition ID rather than question ID.
export function buildResultSummary(evaluation) {
  const candidates = evaluation.candidates || [];
  const occurrences = new Map();
  for (const fund of candidates) {
    for (const reason of fund.reasons || []) {
      occurrences.set(reason.conditionId, (occurrences.get(reason.conditionId) || 0) + 1);
    }
  }
  const followups = new Map();
  const funds = candidates.filter((fund) => fund.status !== 'ineligible').map((fund) => {
    const metReasons = (fund.reasons || []).filter((reason) => reason.status === 'met');
    const remainingReasons = (fund.reasons || []).filter(
      (reason) => reason.status === 'unknown' || reason.status === 'unanswered',
    );
    for (const reason of remainingReasons) {
      let item = followups.get(reason.conditionId);
      if (!item) {
        item = { ...reason, funds: [] };
        followups.set(reason.conditionId, item);
      }
      if (!item.funds.some((related) => related.id === fund.id)) {
        item.funds.push({ id: fund.id, name: fund.name });
      }
    }
    // Show a fund's more specific confirmed conditions first. This ordering
    // affects the two-line preview only, never eligibility or fund ordering.
    const previewReasons = [...metReasons].sort(
      (left, right) => occurrences.get(left.conditionId) - occurrences.get(right.conditionId),
    ).slice(0, 2);
    return { fund, metReasons, remainingReasons, previewReasons };
  });
  return { funds, followups: [...followups.values()] };
}
