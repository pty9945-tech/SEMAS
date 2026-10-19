import { questions as baseQuestions } from './questions.js';
import { conditions, fundConditionIds } from './rules.js';
import { agencyFunds, agencyCommonFacts, agencySpecialFacts } from './agency-data.js';
import { directFundsFacts, directCommonFacts } from './direct-data.js';
import { sources } from './sources.js';
import { SITE_NAME } from './branding.js';
export { conditions };

const descriptions = {
  innovation: '일반형·혁신형의 여러 경로와 운전·시설 목적을 함께 확인합니다.',
  'emergency-direct': '재해 피해 확인증과 법정 체납처분 유예 등의 요건을 확인합니다.',
  'temporary-direct': '연매출·업력 기준과 일시적 경영애로 사유를 함께 확인합니다.',
  credit: 'NCB 점수·업력·교육과 기업등급·기존 잔액을 확인합니다.',
  investment: '지정 주관기관의 선투자와 추천서를 갖춘 소상공인을 검토합니다.',
  restart: '일반형·희망형·도약형의 재도전 경로와 세부 요건을 확인합니다.',
};
const noDocumentUrl = (source) => ({ ...source, item: source.item || source.section, url: undefined });
export const funds = [
  ...agencyFunds.map(fund => ({...fund,channel:'agency',sources:fund.sources.map(noDocumentUrl),conditionIds:fundConditionIds(fund.id,'agency'),cautions:[fund.terms.notes,fund.terms.preference].filter(Boolean)})),
  ...directFundsFacts.map(fund => ({
    id:fund.id,name:fund.name,description:descriptions[fund.id],channel:'direct',mode:'official',year:2026,verifiedAt:'2026-10-15',
    conditionIds:fundConditionIds(fund.id,'direct'),
    terms:{limit:fund.terms.limit,rate:fund.terms.interest,period:fund.terms.duration},
    documents:fund.documents,documentsNote:'핵심 제출자료입니다. 법인·공동대표 여부, 서류 유효기간과 추가자료는 해당 지침 「3. 제출서류」를 확인하세요. 상담 도구에는 서류를 올리지 않습니다.',
    procedure:fund.procedure,procedureNote:'지원대상 검토와 별도로 공단 심사·평가·예산 확인이 필요합니다.',
    links:[{label:'소상공인 정책자금 공식 누리집',url:fund.officialUrl}],
    sources:[noDocumentUrl(fund.source),{...sources['direct-common'],item:'제3~6장 공통 지원대상·제한기준 / 제10장 한도'}],
    sourceNote:'사용자가 제공한 운용지침 기준입니다. 현재 접수·예산 및 이후 변경 여부는 별도 확인해야 합니다.',
    applicationStatus:{...fund.applicationStatus,status:'unknown',label:'현재 접수 확인 필요'},
    cautions:[...fund.cautions,fund.terms.minimum,fund.terms.repayment].filter(Boolean),
    policyDetails:[...(fund.paths??[]).map(path=>({label:path.label||path.name||path.id,detail:path.detail||path.description||'',evidence:noDocumentUrl(path.evidence??fund.source)})),...(fund.specialTerms??[]).map(item=>({label:item.events?.join(' · ')||item.event||item.name||item.label,detail:item.terms||item.detail||[item.limit,item.interest||item.rate,item.duration].filter(Boolean).join(' / '),evidence:noDocumentUrl(item.evidence||fund.source)}))],
  })),
];

const helpers = {
  agencyRestrictions:[agencyCommonFacts.restrictions.text,'적용 대상인 공동대표·관계기업까지 확인했는지 점검하세요. 실제 신용조회 결과가 없다면 모름으로 남겨주세요.'],
  directRestrictions:[...directCommonFacts.restrictionNotes,'2년 연속 매출 50% 이상 감소, 적자와 자본전액잠식, 3년 연속 이자보상배율 1 미만 등은 업력 7년 이하 등 예외를 함께 검토합니다. 해당 자금별 제한표를 전부 확인하지 못했다면 모름으로 남겨주세요.'],
  exclusionStatus:['제외업종표 전체와 산업분류 세세분류를 확인해야 합니다. 일부 예시만으로 해당 없음으로 답하지 마세요.','부동산관리업 6821, 같은 장소 6개월 이상 중개·대리업 68221/분양대행업 68224, 공유오피스·공유주방, 유사의료업, 시각장애인 안마업 등 명시된 예외가 있습니다.','재해자금은 업종 예외가 더 넓습니다. 일반적으로 제외되는 업종이라도 재해자금 예외를 확인하지 않았다면 “예외 검토”를 선택하세요.',agencySpecialFacts.landlord.expression],
  restartVerified: (directFundsFacts.find(f=>f.id==='restart').paths??[]).map(p=>`${p.label||p.name||p.id}: ${p.detail||p.description||''}`),
};
function atoms(rule) {return rule.all||rule.any?(rule.all??rule.any).flatMap(atoms):[rule];}
export const questions = baseQuestions.map(question=>({
  ...question,
  ...(question.id==='directRestrictions'?{description:question.description+' 자금별 예외가 다르므로 일부 후보의 제한을 전체 후보에 적용하지 마세요.',options:question.options.map(option=>option.value==='blocked'?{...option,label:'남은 모든 직접자금에서 제한되고 예외가 없어요'}:option.value==='clear'?{...option,label:'남은 모든 직접자금의 제한사유가 없음을 확인했어요'}:option.value==='exception'?{...option,label:'일부 자금만 제한 · 자금별 확인 필요'}:option)}:{}),
  help:helpers[question.id]??[],
  evidence:Object.values(conditions).filter(c=>atoms(c.rule).some(a=>a.questionId===question.id||a.confirmationId===question.id)).map(c=>c.evidence).filter((v,i,a)=>a.findIndex(x=>x.document===v.document&&x.item===v.item)===i),
}));
export const questionFlow = questions.map(({id})=>({questionId:id}));
export const catalog = {meta:{
  mode:'official',title:SITE_NAME,year:2026,verifiedAt:'2026-10-15',datasetVersion:'2026-uploaded-2-small-business-assumed',updatedAt:'2026-10-19',
  assumptionNotice:'소상공인 기본요건 충족을 전제로 상담합니다.',
  assumedRequirements:['상시근로자 수 기준','업종별 소기업 평균매출액 기준','기본 사업자 형태·영리성 기준'],
  assumptionDetails:'기본 소상공인 여부는 다시 묻지 않습니다. 자금별 추가 매출·청년 고용·졸업후보 요건과 융자 제외 업종·체납·연체 제한은 별도로 확인합니다.',
  notice:'2026년 제공 자료 기준 · 증빙·예외는 추가 확인 · 현재 접수 현황 별도 확인',
  finalNotice:'입력한 답변에 따른 상담 검토용 결과입니다. 최종 지원 여부와 대출금액·금리는 공단·보증기관·은행 심사 및 접수·예산 상황에 따라 결정됩니다.',
  coverage:'첨부된 대리대출 4종·직접대출 6종을 검토합니다. 대환 등 다른 자금이나 이후 변경 공고는 포함하지 않습니다. 예외·증빙을 확인하지 못한 조건은 확인 필요로 남겨주세요.',
},questions,funds};
export default catalog;
