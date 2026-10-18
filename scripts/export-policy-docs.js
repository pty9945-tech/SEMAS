import { writeFile } from 'node:fs/promises';
import { catalog, conditions, questionFlow } from '../policy/catalog.js';

const escape = value => String(value??'').replaceAll('|','\\|').replaceAll('\n',' ');
const title = id => catalog.questions.find(q=>q.id===id)?.title??id;
function expression(rule) {
  if(rule.all||rule.any) return '('+(rule.all??rule.any).map(expression).join(rule.all?' AND ':' OR ')+')';
  return `${rule.questionId} ${rule.op} ${JSON.stringify(rule.value)}${rule.unknownValues?.length?` (확인 필요: ${rule.unknownValues.join(',')})`:''}`;
}
let conditionsDoc = '# 2026년 정책자금 조건표\n\n확인일: 2026-10-15. 사용자가 제공한 12개 문서를 근거로 대리대출 4종·직접대출 6종을 검토한다. 현재 접수 상태·예산·기준금리 숫자는 확인하지 않았다. 가산금리·고정금리는 첨부 문서 값이다.\n\n';
conditionsDoc+='자동 조건식은 `policy/rules.js`, 질문·선택지는 `policy/questions.js`, 문서별 상세는 `policy/agency-data.js`와 `policy/direct-data.js`에 있다. 복잡한 예외·증빙은 상담직원이 해당 기준을 확인한 답변으로 평가한다. 미확인 답변으로 충족을 추정하지 않는다.\n\n';
conditionsDoc+=`상담 전제: **${catalog.meta.assumptionNotice}** ${catalog.meta.assumedRequirements.join(' · ')}은 재질문하거나 가상 답변으로 채우지 않는다. 자금별 추가 매출·청년 고용·졸업후보 기준과 융자제한은 별도로 판단한다.\n\n`;
conditionsDoc+='| 자금 | 한도 | 금리 | 기간 | 조건 ID |\n| --- | --- | --- | --- | --- |\n';
for(const fund of catalog.funds) conditionsDoc+=`| ${escape(fund.name)} | ${escape(fund.terms.limit)} | ${escape(fund.terms.rate)} | ${escape(fund.terms.period)} | ${fund.conditionIds.join(', ')} |\n`;
conditionsDoc+='\n## 명시적인 판단 조건과 근거\n\n`eq`는 일치, `in`은 구간 목록 포함, `contains`는 복수선택 항목 포함이다. AND는 모두 충족, OR는 한 경로 충족이다. 미응답·모름·미충족은 별개 상태다. 확정적인 미충족이 없는 미확인 조건은 추가 확인으로 남긴다.\n\n| ID | 판단 | 조건식 | 문서·항목 |\n| --- | --- | --- | --- |\n';
for(const [id,c] of Object.entries(conditions)) conditionsDoc+=`| ${id} | ${escape(c.label)} | ${escape(expression(c.rule))} | ${escape(c.evidence.document)} · ${escape(c.evidence.item)} |\n`;
conditionsDoc+='\n## 범위와 제한\n\n- 지원 가능액·승인 확률을 계산하지 않는다. 제시된 한도는 문서상 최고한도이며 기존 잔액·기업평가·관계기업 합산 등 확인이 필요하다.\n- 복합 경로의 일부 조건만 확인했다면 모름·확인 필요로 답해야 한다. 특히 재도전 경로·사관학교 제한업종·졸업후보의 지위유지 제외·지역 지정기간은 서류 확인을 요구한다.\n- 첨부에 없는 대환 등은 이 도구의 검토 범위 밖이며 다른 자금이 존재하지 않는다고 결론내리지 않는다.\n- 원문 파일은 공개 정적 경로와 Git에서 제외한다. 근거는 문서명·페이지 또는 항목으로 연결한다.\n';
await writeFile(new URL('../docs/conditions.md',import.meta.url),conditionsDoc);

let flow='# 질문 분기표\n\n`policy/questions.js`의 순서를 우선하되, 살아 있는 후보의 아직 결론 나지 않은 조건에 필요한 질문만 요청한다. 모든 질문을 고정 순서로 끝까지 묻지 않는다.\n\n';
flow+=`상담 전제: **${catalog.meta.assumptionNotice}** 기본 근로자·업종별 소기업 매출·사업자 형태·지위유지 확인은 생략하며, 자금 목적부터 묻는다.\n\n`;
flow+='| 우선순위 | 질문 ID | 질문 | 응답 형태 | 관련 자금 |\n| --- | --- | --- | --- | --- |\n';
const atoms=rule=>rule.all||rule.any?(rule.all??rule.any).flatMap(atoms):[rule];
for(const [index,step] of questionFlow.entries()) {
 const q=catalog.questions.find(q=>q.id===step.questionId);
 const funds=catalog.funds.filter(f=>f.conditionIds.some(id=>atoms(conditions[id].rule).some(a=>a.questionId===q.id||a.confirmationId===q.id))).map(f=>f.name);
 flow+=`| ${index+1} | ${q.id} | ${escape(title(q.id))} | ${q.type==='multi'?'복수 선택':'단일 선택'} | ${escape(funds.join(', '))} |\n`;
}
flow+='\n## 분기 원칙\n\n1. 현재 답변으로 자금별 AND/OR 조건을 평가한다. 어느 필수조건이 확정 미충족이면 그 자금의 나머지 질문을 생략한다.\n2. OR에서 한 경로가 충족되면 다른 경로를 확인할 필요가 없다. 청년 대표 요건을 충족하면 청년 고용 질문을 생략할 수 있다.\n3. 사업상태 또는 자금용도가 불명확하면 한 번 더 확인한다. 확인 후에도 모름이면 결과의 추가 확인사항으로 남긴다.\n4. 기본 소상공인 요건은 충족을 전제로 생략한다. 삭제된 질문에 임의 답변을 채우지 않는다. 청년고용·일시경영 직접 매출·혁신 졸업후보 등 자금별 추가 요건은 계속 확인한다.\n5. 다른 후보가 남아 있으면 선택한 특별자금 하나 때문에 그 후보를 제거하지 않는다.\n6. 답변 변경 시 화면이 변경 지점 이후 답변을 제거한다. 서버도 경로를 처음부터 재생하여 빠진 새 질문 이후의 답변과 무관한 질문을 무시한다.\n7. 다음에 필요한 질문이 없으면 종료한다. 남은 미확인 조건이 있는 후보를 충족으로 승격하지 않는다.\n8. 모름과 해당 없음은 복수선택에서도 단독 선택이다. 모름은 미충족으로 바꾸지 않는다.\n\n```mermaid\nflowchart TD\n A[자금 사용 목적] --> B{검토 후보가 남아 있나요?}\n B -- 없음 --> R[미충족 이유와 다음 확인사항]\n B -- 있음 --> C[공통 제한 및 자금별 세부 질문]\n C --> D{조건을 구분할 질문이 남았나요?}\n D -- 있음 --> C\n D -- 없음 --> E[후보·충족 조건·추가 확인·근거]\n C -- 이전 답변 변경 --> A\n```\n';
await writeFile(new URL('../docs/question-flow.md',import.meta.url),flow);
console.log(`Exported ${catalog.funds.length} funds, ${Object.keys(conditions).length} conditions and ${questionFlow.length} questions.`);
