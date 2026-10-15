/** Uploaded 2026 operating-guideline facts. HWP references use section names, not inferred pages. */
import { sources } from './sources.js';

const evidence = (id, section) => ({ ...sources[id], sourceId: id, section });
const commonDocuments = [
  '신청 자가진단·윤리준수 약속·대출신청서·정보제공 동의서',
  '대표자 실명확인증표, 사업자등록증 또는 최근 1개월 이내 사업자등록증명',
  '상시근로자 확인자료(건강보험자격득실확인서 또는 월별 근로자 자료)',
  '국세·지방세 납세증명서, 주소 및 사업장·거주주택 등기/임대차 확인자료',
  '최근 3년 매출·재무 증빙(사업자 유형 및 업력에 따라 제출 가능 기간·대체서류 확인)',
  '법인은 법인인감·등기·주주 및 주식변동 자료, 보험료 완납 자료 등 추가 확인',
];
const caution = '신청일 현재 접수·예산 및 공단 심사 결과를 별도 확인해야 합니다. 분기별 기준금리 수치는 첨부 지침에서 확정할 수 없어 계산하지 않습니다.';
const facts = (id, name, revisionDate, detail) => ({
  id, name, method: 'direct', year: 2026,
  source: { ...evidence(id, '1. 개요 — 지원대상·자금용도·대출조건'), revisionDate },
  applicationStatus: '접수 여부 확인 필요',
  officialUrl: 'https://ols.semas.or.kr/ols/man/SMAN010M/page.do',
  documents: commonDocuments,
  documentEvidence: evidence(id, '3. 제출서류'),
  procedure: ['소상공인정책자금 누리집 또는 안내된 지역센터에서 신청', '지원대상·제한사항 및 제출서류 확인', '공단 심사·한도 결정', '약정·실행 및 용도 사후관리'],
  procedureEvidence: evidence(id, '4. 대출절차'),
  cautions: [caution],
  ...detail,
});

export const directFundsFacts = [
  facts('innovation', '혁신성장촉진자금', '2026-08-04', {
    purposes: ['operations', 'equipment'],
    criteria: [
      { id: 'innovation-path', kind: 'anyOf', label: '일반형 또는 혁신형 중 하나 이상 해당', evidence: evidence('innovation', '1. 개요 — 지원대상 1. 유형①~②'), detail: '아래 경로는 OR 조건입니다. 하나의 경로를 선택해도 다른 경로를 제외하지 않습니다.' },
      { id: 'innovation-restrictions', kind: 'manual', label: '자금별 대출제한 및 현장·증빙 심사 확인', evidence: evidence('innovation', '2. 대출제한대상') },
    ],
    paths: [
      { id: 'longstanding', type: 'general', label: '백년소상공인', detail: '백년가게·백년소공인 지정서 유효기간 이내', evidence: evidence('innovation', '1. 개요 — 지원대상 1.①➊') },
      { id: 'social', type: 'general', label: '사회연대경제 조직', detail: '협동조합, 사회적기업(예비 포함), 마을기업 또는 자활기업', evidence: evidence('innovation', '1. 개요 — 지원대상 1.①➋') },
      { id: 'academy', type: 'general', label: '신사업창업사관학교 수료', detail: '수료한 대표자(법인은 대표이사)가 수료일부터 1년 이내 1회 신청; 운전자금만 지원', evidence: evidence('innovation', '1. 개요 — 지원대상 1.①➌ 및 자금용도') },
      { id: 'smart', type: 'general', label: '스마트기술 도입·활용', detail: '도입 후 적극 활용해 경영효율화를 달성하고 지속적인 매출 시현을 사업계획서·실사로 확인', evidence: evidence('innovation', '1. 개요 — 지원대상 1.①➍') },
      { id: 'export', type: 'innovative', label: '최근 1년 수출 1천 달러 이상', detail: '신청일 기준 최근 1년 이내 직·간접 수출실적; 공인 발급기관 수출실적증명원 기준', evidence: evidence('innovation', '1. 개요 — 지원대상 1.②➊') },
      { id: 'growth', type: 'innovative', label: '최근 2년 연속 매출 10% 이상 증가', detail: '2023년 대비 2024년, 2024년 대비 2025년 모두 10% 이상 증가; 2023년 매출 5천만원 이상(연환산 불가)', evidence: evidence('innovation', '1. 개요 — 지원대상 1.②➋') },
      { id: 'factory', type: 'innovative', label: '스마트공장 도입', detail: '스마트공장 보급·확산 사업 참여 도입기업 또는 스마트공장 수준확인 Level 1~5', evidence: evidence('innovation', '1. 개요 — 지원대상 1.②➌') },
      { id: 'local', type: 'innovative', label: '강한소상공인·로컬크리에이터 선정', detail: '해당 성장지원사업 또는 지역기반 로컬크리에이터 활성화 지원사업 선정', evidence: evidence('innovation', '1. 개요 — 지원대상 1.②➍') },
      { id: 'graduating', type: 'innovative', label: '소상공인 졸업후보기업', detail: '평균매출액이 업종 소기업 기준의 30% 이상이며 근로자수는 업종 상한보다 최대 2명 적은 범위(일반 3명 이상 5명 미만, 10명 업종 8명 이상 10명 미만); 지위유지 기간 기업 제외', evidence: evidence('innovation', '1. 개요 — 지원대상 1.②➎') },
      { id: 'faithful', type: 'innovative', label: '소진공 직접대출 성실상환', detail: '신청일 기준 최근 3년 이내 연속 10일 이상 연체 없이 원금분할상환 중 또는 완제; 사고기업·자율상환제·손실보상선지급 계좌 제외', evidence: evidence('innovation', '1. 개요 — 지원대상 1.②➏') },
    ],
    terms: { limit: '일반형: 연간 운전 1억원·시설 5억원 / 혁신형: 연간 운전 2억원·시설 10억원 이내', interest: '정책자금 기준금리 + 0.4%p(변동); 요건별 우대 최대 0.8%p', duration: '운전 5년(거치 0~2년), 시설 8년(거치 0~3년), 거치는 연 단위 선택', minimum: '최소 1천만원, 100만원 단위', repayment: '거치 후 매월 원금균등분할상환, 중도상환수수료 면제' },
    documents: [...commonDocuments, '기업현황 및 사업계획서', '선정·지정·수료·인증 자료, 수출실적증명원 또는 매출증빙 등 선택 경로 입증자료', '스마트설비 계약·영수증, 시설자금은 시설투자계획·견적/매매계약·사양서 등'],
    cautions: [caution, '사관학교 경로만 충족한 경우 시설자금 제외. 지침은 해당 항목을 일부 위치에서 ❹로 표기하지만 실제 지원대상 목록은 ➌이며 항목명 기준으로 확인했습니다.', '신용정보 등록 예외: 사관학교 수료 경로의 워크아웃 합의·개인회생 인가·파산면책 및 특수채무 완납 여부 확인(2. 대출제한대상 2).', '졸업후보기업 추가지원은 연간 운전 2억원 한도, 동일연도 6개월 재신청 제한 예외 확인(1. 개요 대출조건, 2. 대출제한대상 6).'],
  }),
  facts('emergency-direct', '긴급경영안정자금(재해·직접대출)', '2026-10-06', {
    purposes: ['recovery'],
    criteria: [
      { id: 'disaster-proof', kind: 'required', label: '신청일 유효한 재해 중소기업(소상공인) 확인증', detail: '관할기관이 인정한 자연재난·사회재난 피해', evidence: evidence('emergency-direct', '1. 개요 — 지원대상 ②') },
      { id: 'tax-deferment', kind: 'anyOf', label: '압류·매각 유예, 체납처분 유예 또는 징수특례', detail: '국세징수법 제105조, 조세특례제한법 제99조의10 또는 지방세징수법 제105조 중 하나 이상; 단순 납부기한 연장·징수유예는 이 조건에 해당하지 않음', evidence: evidence('emergency-direct', '1. 개요 — 지원대상 ①; 2. 대출제한대상 1') },
      { id: 'disaster-use', kind: 'required', label: '자연재해·사회재난의 직·간접피해 복구 목적', evidence: evidence('emergency-direct', '1. 개요 — 자금용도') },
    ],
    terms: { limit: '기본 1억원 이내(재해 유형 대출잔액 합산); 특정 특별재난은 3억원 이내', interest: '기본 연 2.0% 고정; 지침 열거 특별지원은 연 1.5% 고정', duration: '기본 5년(2년 거치); 특별지원 유형별 5년·7년·10년', minimum: '최소 100만원, 10만원 단위', repayment: '거치 후 매월 원금균등분할상환, 중도상환수수료 면제' },
    specialTerms: [
      { events: ['2022.10.29 사회재난 용산구', '2022.9.5~6 힌남노 지정 지역', '2022.8.8~17 집중호우 지정 지역'], interest: '연 1.5% 고정', duration: '7년(3년 거치)', evidence: evidence('emergency-direct', '1. 개요 — 대출조건 특별지원 1~3') },
      { events: ['2023.4.11 강릉산불', '2025년 울산·경북·경남 산불 지정 지역', '2025년 광주·경기·세종·충북·충남·전남·경북·경남 호우 지정 지역', '2026년 거제·통영 호우 지정 지역'], limit: '3억원 이내', interest: '연 1.5% 고정', duration: '10년(5년 거치)', evidence: evidence('emergency-direct', '1. 개요 — 대출조건 특별지원 4, 6~8') },
      { events: ['충남 서천특화시장 화재피해'], interest: '연 1.5% 고정', duration: '5년(2년 거치)', evidence: evidence('emergency-direct', '1. 개요 — 대출조건 특별지원 5') },
    ],
    documents: [...commonDocuments, '신청일 유효한 재해 중소기업(소상공인) 확인증', '압류·매각유예·체납처분유예 또는 징수특례 적용 확인자료'],
    procedure: ['온라인 신청 또는 지역센터 현장접수', '재해확인·유예요건·제한사항 확인과 간이심사', '지원결정·약정·대출실행'],
    cautions: [caution, '재해를 직접 원인으로 휴업한 경우 가동 중으로 간주하는 예외가 있습니다(2. 대출제한대상 5).', '일반 통합잔액한도와 별도 운용. 특별재난 지역 소재만으로 특례를 단정하지 않고 해당 사건·피해확인증을 확인합니다.'],
  }),
  facts('temporary-direct', '일시적경영애로자금(직접대출)', '2026-08-04', {
    purposes: ['operations'],
    criteria: [
      { id: 'temporary-revenue', kind: 'required', label: '연매출 1억 400만원 미만', detail: '국세청 신고매출; 직전연도·최근1년·신규창업 연환산 등 지침 산정방법 적용. 1억400만원과 같은 경우 제외', evidence: evidence('temporary-direct', '1. 개요 — 지원대상 ① 및 연매출 산정 방법') },
      { id: 'temporary-age', kind: 'required', label: '신청일 업력 7년 미만', detail: '개인 사업자등록증명 개업일, 법인 회사성립일 기준; 7년과 같은 경우 제외', evidence: evidence('temporary-direct', '1. 개요 — 지원대상 ②') },
      { id: 'temporary-cause', kind: 'anyOf', label: '매출 15% 이상 감소 또는 지정 예외 사유', detail: '연도·반기·분기·월의 인정 비교기간으로 확인. 예외는 고용위기/산업위기대응특별/중소기업특별지원/상권활성화·자율상권/산업위기선제대응/고용위기선제대응 지역, 12·29여객기참사 피해확인 또는 장관 인정 사유', evidence: evidence('temporary-direct', '1. 개요 — 지원대상 ③ 매출감소 확인 방법·확인 예외') },
    ],
    terms: { limit: '7천만원 이내(일시적경영애로 유형 대출잔액 합산)', interest: '정책자금 기준금리(변동); 요건별 우대 최대 0.8%p', duration: '5년(2년 거치 포함)', minimum: '최소 100만원, 100만원 단위', repayment: '거치 후 매월 원금균등분할상환, 중도상환수수료 면제' },
    documents: [...commonDocuments, '15% 감소 비교자료: 연도는 재무제표·과세표준·면세수입증명, 반기는 과세표준증명, 분기·월은 국세청 과세인프라자료', '예외 사유 해당 시 산업단지 입주확인서, 12·29여객기참사 피해자 확인서 등 적용 증빙'],
    cautions: [caution, '일반 통합잔액한도와 별도 운용. 매출감소 확인 예외는 매출상한·업력 조건까지 면제하지 않습니다.'],
  }),
  facts('credit', '신용취약소상공인자금', '2026-08-04', {
    purposes: ['operations'],
    criteria: [
      { id: 'credit-education', kind: 'required', label: '신용관리교육 사전 이수', detail: '소상공인 지식배움터 제휴교육 중 신용회복위원회 신용관리교육', evidence: evidence('credit', '1. 개요 — 지원대상 ①') },
      { id: 'credit-age', kind: 'required', label: '업력 90일 이상', detail: '신청일 기준. 개업일이 사업자등록일 전이면 등록일 전 업력은 최대 20일 인정', evidence: evidence('credit', '1. 개요 — 지원대상 ②') },
      { id: 'credit-score', kind: 'required', label: 'NCB 개인신용평점 839점 이하', detail: '개인은 대표자(주채무자), 법인은 대표이사 중 1인; 다른 신용기관 점수로 대체하지 않음', evidence: evidence('credit', '1. 개요 — 지원대상 ③') },
      { id: 'credit-room', kind: 'required', label: '관련 자금 잔액 차감 후 신청가능금액 1천만원 이상', detail: '2023 소상공인·전통시장, 2024 저신용, 2025·2026 신용취약 자금 합산', evidence: evidence('credit', '1. 개요 — 대출조건 대출한도·산정방식') },
      { id: 'credit-grade', kind: 'required', label: '기업신용등급 9~10등급은 연매출 1억 9700만원 이상', detail: 'NICE SOHO ML 9~10등급이면서 연매출 197백만원 미만이면 대출 불가. 개인 NCB 점수와 별개이며 모르면 확인 필요', evidence: evidence('credit', '1. 개요 — 기업신용등급별 대출한도 표 주석 **') },
    ],
    terms: { limit: '동일관계기업 3천만원 이내; 관련 2023~2026 자금 잔액 합산·기업신용등급별 한도 적용', interest: '정책자금 기준금리 + 1.6%p(변동); 요건별 우대 최대 0.8%p', duration: '5년(2년 거치 포함)', minimum: '최소 1천만원, 100만원 단위', repayment: '거치 후 매월 원금균등분할상환, 중도상환수수료 면제' },
    documents: [...commonDocuments, '기업현황 및 사업계획서(정책우선도 평가 선정 시)', '신용관리교육 이수 확인, NCB 평점 및 NICE SOHO ML 기업등급·관련 자금 잔액 확인'],
    procedure: ['누리집 온라인 신청(지침의 홀짝제 및 실제 접수 안내 확인)', '지원대상·대출제한 시스템 검증', '정책우선도 사전평가', '선정기업 서류 제출·접수', '공단 심사(필요시 실사)·약정·대출실행'],
    cautions: [caution, '기업신용등급별 세부 한도는 병합표를 원문으로 재확인해야 하므로 총상한만 표시합니다.', '대출 후 1년 경과 시 신용점수 70점 이상 상승 또는 840점 이상 회복이면 잔여기간 금리 0.5%p 인하 제도(1. 개요 대출금리).'],
  }),
  facts('investment', '민간투자연계형매칭융자', '2026-09-16', {
    purposes: ['operations', 'equipment'],
    criteria: [
      { id: 'investment-first', kind: 'required', label: '주관기관의 투자금 지원을 받음', evidence: evidence('investment', '1. 개요 — 지원대상') },
      { id: 'investment-letter', kind: 'required', label: '소상공인 선투자 추천서 발급', detail: '추천서 상 추천금액을 초과한 대출 불가', evidence: evidence('investment', '1. 개요 — 지원대상·대출한도') },
    ],
    terms: { limit: '동일관계기업 연간 최대 5억원 및 선투자 추천서상 추천금액 이내(투자·펀딩 최대 5배 매칭)', interest: '정책자금 기준금리 + 0.4%p(변동); 요건별 우대 최대 0.8%p', duration: '8년(거치 0~3년, 연 단위 선택)', minimum: '최소 1천만원, 100만원 단위', repayment: '거치 후 매월 원금균등분할상환, 중도상환수수료 면제' },
    documents: [...commonDocuments, '기업현황 및 사업계획서, 선투자 추천·투자 지원 확인', '시설자금은 시설투자계획서·기계설비 견적/매매계약·사양서 등'],
    procedure: ['지원대상·제한사항·신청서류 확인', '지역센터 기업평가 및 현장실사', '매칭융자 심사위원회 심의', '지원대상 재확인·약정·대출실행', '대출금 사용내역 점검'],
    cautions: [caution, '복수의 투자 추천이 있으면 추천 건별 신청 가능하며 동일연도 6개월 재신청 제한 예외(2. 대출제한대상 6).'],
  }),
  facts('restart', '재도전특별자금', '2026-07-30', {
    purposes: ['operations'],
    criteria: [
      { id: 'restart-path', kind: 'anyOf', label: '일반형·희망형·도약형 중 하나 이상 충족', evidence: evidence('restart', '1. 개요 — 지원대상 1.①~③') },
      { id: 'restart-business', kind: 'required', label: '신청 사업자는 소상공인 사업체여야 함', detail: '재창업 준비라는 이름만으로 사업자 미등록·영업 전 신청자를 포함하지 않음', evidence: evidence('restart', '1. 개요 — 지원대상 2.; 2. 대출제한대상 5. 휴·폐업') },
    ],
    paths: [
      { id: 'training', type: 'general', label: '재창업 준비', detail: '최근 1년 이내 희망리턴패키지 재창업교육 25시간 이상 수료 + 신청 사업자 외 타 사업자 미보유', evidence: evidence('restart', '1. 개요 — 지원대상 1.①➊ 및 주석') },
      { id: 'early', type: 'general', label: '재창업 초기', detail: '재창업 업력 7년 미만, 폐업기업과 대표 동일·지원업종·매출실적(폐업기업 업력3년 이상이면 실적 제외); 또는 3개월 이상 휴업 후 재개/세세분류 업종전환/매출감소로 이전 후 7년 미만. 타 사업자 미보유, 형식적 사업자번호 변경 제외', evidence: evidence('restart', '1. 개요 — 지원대상 1.①➋') },
      { id: 'debt', type: 'general', label: '채무조정 성실이행', detail: '참여기관 인정 + 미납 없이 6회 이상 납입 또는 최근3년 내 완제 + 최근1년 성실상환자 교육20시간; 또는 공단 상환연장/2024년 이후 공단 대환대출을 연속10일 이상 연체 없이 3회 이상 상환 중/완제', evidence: evidence('restart', '1. 개요 — 지원대상 1.①➌') },
      { id: 'hope', type: 'hope', label: '희망형', detail: '2025 희망리턴패키지 재기사업화 완료 또는 2026 재기사업화 선정·협약 완료; 채무조정 소상공인은 3회 이상 성실상환 추가', evidence: evidence('restart', '1. 개요 — 지원대상 1.②') },
      { id: 'jump', type: 'jump', label: '도약형', detail: '위 재창업/재개·전환·이전 사유 후 2년 이상7년 미만 + 매출5%이상 증가(전년 대비 또는 최근2분기 이상) 또는 전년대비 근로자 증가/근로자2명 이상 + 최근3년 직접대출 연속10일 이상 연체 없는 분할상환/완제. 타 사업자 미보유, 형식적 변경 제외', evidence: evidence('restart', '1. 개요 — 지원대상 1.③') },
    ],
    terms: { limit: '일반형 7천만원 / 희망형 1억원 / 도약형 2억원 이내(재도전특별자금 대출잔액 합산)', interest: '정책자금 기준금리 + 일반형 1.6%p / 희망형 0.6%p / 도약형 0.4%p(변동); 요건별 우대 최대 0.8%p', duration: '5년(2년 거치 포함)', minimum: '최소 100만원, 100만원 단위', repayment: '거치 후 매월 원금균등분할상환, 중도상환수수료 면제' },
    documents: [...commonDocuments, '기업현황 및 사업계획서', '유형별 총사업자등록내역·사업자등록변경내역·휴폐업증명·폐업사업자 매출자료', '교육·사업화 선정 및 협약 확인, 채무조정·성실상환 증빙, 도약형 매출/근로자 성장 증빙'],
    cautions: [caution, '채무조정에 따른 신용정보 등록·채무조정 대상 연체는 희망형 또는 일반형 채무조정 경로의 예외를 확인합니다(2. 대출제한대상 2~3).', '교육 수료 등 단일 사실만으로 복합 경로 전체 충족을 단정하지 않습니다.'],
  }),
];

export const directCommonFacts = {
  source: evidence('direct-common', '3. 소상공인 기준 및 확인방법; 5. 대출제한대상'),
  criteria: [
    '영리 개인사업자 또는 영리법인 본점. 비영리·외국법인 본지점·영리법인 지점 등 제외(개별 자금 지침 우선).',
    '주된 업종 기준의 소기업 평균매출액과 상시근로자 기준을 모두 확인. 광업·제조업·건설업·운수업 10명 미만, 그 밖 5명 미만.',
    '상시근로자 수는 단순 현재 직원수가 아닌 지침상 기간 평균. 대표/임원·일용·3개월 이내 계약·연구전담·월60시간 미만 단시간근로자 제외; 월60시간 이상 단시간근로자는 0.5명.',
    '기준 초과 시 소상공인 지위유지 기간(해당사유 다음 연도부터 3년)과 제외조건을 별도 확인. 상시근로자20명 이상 등은 지위유지 제외.',
    '세금체납·신용정보등록·연체·권리침해·휴폐업·동일연도6개월 재신청·한계기업·부채비율·매출초과차입·제한기업·허위부정·제외업종 등을 개별 자금 예외와 함께 확인.',
  ],
  restrictionNotes: [
    '일반 자금의 세금체납 예외: 납부고지유예/납기연장, 압류매각유예/체납처분유예, 징수특례. 긴급재해 직접대출은 유예 종류 적용이 다르므로 개별기준 우선.',
    '연체 기본기준: 현재 연체, 최근3개월 내 연속30일 이상1회 또는 연속10일 이상4회. 예금잔액 충분·예적금담보/보험대출 등 경미사유 및 재도전 채무조정 예외 검토.',
    '한계기업(2년연속 매출50%이상 감소, 적자+자본전액잠식, 3년연속 이자보상배율1미만), 부채비율700% 초과, 매출대비 차입100% 초과는 업력7년 이하 적용제외 등 예외가 있어 일괄 탈락 처리하지 않음.',
    '운전자금 통합잔액5억원, 시설 포함10억원(대리대출 포함) 및 동일관계기업 합산. 긴급재해·일시경영애로는 별도 한도 운용.',
  ],
  verifiedAt: '2026-10-15',
};
