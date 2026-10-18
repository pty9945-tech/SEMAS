import { sources } from './sources.js';
const eq = (questionId,value,extra={}) => ({questionId,op:'eq',value,...extra});
const inList = (questionId,value,extra={}) => ({questionId,op:'in',value,...extra});
const has = (questionId,value,extra={}) => ({questionId,op:'contains',value,...extra});
const any = (...rules) => ({any:rules});
const all = (...rules) => ({all:rules});
const c = (label,rule,sourceId,item) => ({label,rule,evidence:{...sources[sourceId],sourceId,item}});
const active = (value,extra={}) => eq('businessStatus',value,{confirmationId:'businessStatusConfirm',...extra});
const purpose = value => has('purpose',value,{confirmationId:'purposeConfirm'});
const selected = (q,values) => any(...values.map(v=>has(q,v)));
const exception = {unknownValues:['exception']};
const hardship = any(eq('salesDrop','atLeast15'),selected('hardshipException',['employmentCrisis','smeSpecial','commercialArea','industryPreemptive','flight1229','employmentPreemptive','minister']));
const innovationPaths = ['longstanding','social','academy','smart','export','growth','factory','local','graduation','faithful'];
const innovationPath = id => id === 'graduation' ? all(has('innovationPaths',id),eq('graduationVerified','yes')) : id === 'academy' ? all(has('innovationPaths',id),eq('academyRestrictions','clear',exception)) : has('innovationPaths',id);
const innovationAny = ids => any(...ids.map(innovationPath));
export const conditions = {
  'A-ACTIVE':c('영업 중인 사업체 — 재해 휴업 예외는 별도 확인',active('active',{unknownValues:['paused']}),'agency-common','7. 대출 제한기준 및 확인 방법 ④ 휴·폐업'),
  'D-ACTIVE':c('영업 중인 사업체',active('active'),'direct-common','제6장 대출제한대상 ⑤ 휴·폐업'),
  'E-ACTIVE':c('영업 중 또는 재해로 직접 피해를 입은 휴업',any(active('active'),all(active('paused'),eq('disasterPause','yes'))),'emergency-direct','2. 대출제한대상 — 휴·폐업 예외'),
  'INDUSTRY':c('융자 제외 업종에 해당하지 않음',eq('exclusionStatus','clear',exception),'agency-common','붙임4 소상공인 정책자금 융자제외 대상 업종'),
  'A-TAX':c('대리대출 세금체납 제한 검토',eq('taxStatus','clear',{unknownValues:['deferred','seizure']}),'agency-common','7. 대출 제한기준 및 확인 방법 ① 세금체납'),
  'D-TAX':c('직접대출 세금체납 없음 또는 명시된 유예·특례',inList('taxStatus',['clear','deferred','seizure']),'direct-common','제6장 대출제한대상 ① 세금체납 및 예외'),
  'DELINQUENCY':c('현재 대출 연체 제한 검토',eq('delinquency','clear',exception),'agency-common','7. 대출 제한기준 및 확인 방법 ③ 연체'),
  'D-RECENT':c('직접대출 최근 3개월 연체 제한 검토',eq('directRecentDelinquency','clear',exception),'direct-common','제6장 대출제한대상 ③ 연체 — 30일 1회 / 10일 4회·예외'),
  'A-RESTRICTIONS':c('대리대출 나머지 제한 및 예외 검토',eq('agencyRestrictions','clear',exception),'agency-common','7. 대출 제한기준 및 확인 방법'),
  'D-RESTRICTIONS':c('해당 직접대출의 나머지 제한 및 예외 검토',eq('directRestrictions','clear',exception),'direct-common','제6장 대출제한대상 — 자금별 별도 규정 우선'),
  'BALANCE':c('후보별 기존 잔액·연간 한도·최소 신청액 확인',eq('loanHistory','clear',{unknownValues:['review']}),'agency-common','대출한도 운영방법 / 각 직접대출 지침 1. 개요 — 대출한도'),
  'GENERAL-FREQUENCY':c('최근 5년 3회 이상 지원 제한 또는 명시된 예외 확인',eq('generalFrequency','clear',exception),'agency-common','7. 대출 제한기준 및 확인 방법 ⑦ 최근 5년 정책자금 3회 이상'),
  'DISABLED':c('장애 증빙과 대표자별 세부 요건',all(eq('disabledProof','yes'),eq('disabledDetails','yes')),'disabled','p.2 신청대상 / 제출서류 — 장애인기업 확인'),
  'YOUTH':c('청년 대표·업력 또는 청년 고용 경로',any(all(eq('ownerAge','under40'),inList('businessAge',['under90','from90To2','from2To3'])),inList('youthEmployment',['majority','recent'])),'youth','p.2 신청대상 ①~③'),
  'HARDSHIP':c('인정기간 매출 15% 이상 감소 또는 7개 확인 예외',hardship,'temporary-agency','p.2 신청대상 / 붙임5 신청대상 지역'),
  'HARDSHIP-DIRECT':c('인정기간 매출 15% 이상 감소 또는 7개 확인 예외',hardship,'temporary-direct','1. 개요 — 일시적경영애로 사유 / 매출감소 확인방법(연도·반기·분기·월)'),
  'TEMP-AGE':c('일시적경영애로 직접대출 업력 7년 미만',inList('businessAge',['under90','from90To2','from2To3','from3To7']),'temporary-direct','1. 개요 — 지원대상 ② 업력'),
  'TEMP-REVENUE':c('일시적경영애로 직접대출 연매출 1억 400만원 미만',eq('annualRevenue','under104m'),'temporary-direct','1. 개요 — 지원대상 ① 연매출'),
  'CREDIT-SCORE':c('NCB 개인신용평점 839점 이하',eq('creditScore','upTo839'),'credit','1. 개요 — 지원대상 ③ 중·저신용'),
  'CREDIT-AGE':c('보정된 업력 90일 이상',eq('creditAge','atLeast90'),'credit','1. 개요 — 지원대상 ② 업력 / 등록 전 업력 최대 20일 인정'),
  'CREDIT-EDUCATION':c('지정 신용관리교육 사전 이수',eq('creditEducation','yes'),'credit','1. 개요 — 지원대상 ① 신용관리교육'),
  'CREDIT-GRADE':c('기업등급 9~10등급이면 연매출 1억 9,700만원 이상',any(eq('creditGrade','oneToEight'),all(eq('creditGrade','nineToTen'),eq('annualRevenue','atLeast197m'))),'credit','1. 개요 — 기업신용등급(NICE SOHO ML)별 대출한도 표 주석 **'),
  'CREDIT-BALANCE':c('관련자금 잔액 차감 후 최소 1,000만원 이상 신청 가능',eq('creditBalance','enough'),'credit','1. 개요 — 대출한도 산정방식'),
  'DISASTER':c('유효한 재해 확인증 및 압류·매각유예·징수특례',all(eq('disasterCertificate','yes'),eq('taxStatus','seizure')),'emergency-direct','1. 개요 — 지원대상 ① 체납처분 유예 등 ② 재해피해'),
  'INNOVATION':c('혁신성장 일반형·혁신형 중 한 경로 이상',innovationAny(innovationPaths),'innovation','1. 개요 — 지원대상 ① 일반형 ② 혁신형'),
  'INNOVATION-PURPOSE':c('운전·시설 목적 — 사관학교 단독 경로는 운전자금만',any(purpose('operations'),all(purpose('equipment'),innovationAny(innovationPaths.filter(x=>x!=='academy')))),'innovation','1. 개요 — 자금용도 / 사관학교 수료 시설자금 제외'),
  'INVESTMENT':c('지정 주관기관 선투자 및 소상공인 선투자 추천서',eq('investment','yes'),'investment','1. 개요 — 지원대상'),
  'RESTART':c('재도전의 한 경로 이상 및 그 경로 세부요건 확인',all(selected('restartPaths',['preparation','early','adjustment','hope','leap']),eq('restartVerified','yes')),'restart','1. 개요 — 일반형·희망형·도약형 지원대상 전체 요건'),
};
const shared=['INDUSTRY','DELINQUENCY','BALANCE'];
const agency=['A-ACTIVE',...shared,'A-TAX','A-RESTRICTIONS'];
const direct=['D-ACTIVE',...shared,'D-TAX','D-RECENT','D-RESTRICTIONS'];
const extras={general:['GENERAL-FREQUENCY'],disabled:['DISABLED'],youth:['YOUTH'],'temporary-agency':['HARDSHIP'],'temporary-direct':['TEMP-AGE','TEMP-REVENUE','HARDSHIP-DIRECT'],credit:['CREDIT-SCORE','CREDIT-AGE','CREDIT-EDUCATION','CREDIT-GRADE','CREDIT-BALANCE'],'emergency-direct':['E-ACTIVE','DISASTER'],innovation:['INNOVATION','INNOVATION-PURPOSE'],investment:['INVESTMENT'],restart:['RESTART']};
export function fundConditionIds(id,channel) {
 const base=channel==='agency'?agency:id==='emergency-direct'?direct.filter(x=>!['D-ACTIVE','D-TAX'].includes(x)):direct;
 const ids=[...base,...extras[id]];
 if(id!=='innovation') {
  const key=`${id}-PURPOSE`;
  conditions[key]=c('자금 용도에 해당',id==='investment'?any(purpose('operations'),purpose('equipment')):purpose(id==='emergency-direct'?'recovery':'operations'),id,'개요 — 자금용도');
  ids.push(key);
 }
 return ids;
}
