/** Facts transcribed from the user-supplied 2026 Q4 official notices.
 * These facts are not an approval decision. Current application availability is unknown.
 */
const officialUrl = 'https://ols.semas.or.kr/ols/man/SMAN010M/page.do';
const names = {
  general: '2026년 소상공인정책자금(대리대출) 신청안내자료_일반경영안정자금(4분기).pdf',
  disabled: '2026년 소상공인정책자금(대리대출) 신청안내자료_장애인기업지원자금(4분기).pdf',
  youth: '2026년 소상공인정책자금(대리대출) 신청안내자료_청년고용연계자금(4분기).pdf',
  'temporary-agency': '2026년 소상공인정책자금(대리대출) 신청안내자료_긴급경영안정자금(일시적경영애로)(4분기).pdf',
  common: '소상공인정책자금(대리대출) 운용지침 개정 전문.hwp',
};
export const agencyEvidence = (id, item) => ({ document: names[id], item, url: officialUrl, mode: 'official', sourceId: id });
const commonDocuments = [
  '정책자금 융자신청서, 자가진단 및 유의사항, 정보 수집·이용·제공·조회 동의서, 사전고지 확인서',
  '대표자 실명확인증표, 사업자등록증 사본 또는 사업자등록증명(발급 1개월 이내)',
  '상시근로자 확인자료: 근로자 없는 경우 보험자격득실확인서 또는 유효한 소상공인확인서; 근로자 있는 경우 건강보험 월별 가입자자료 등',
  '유효한 국세·지방세 납세증명서, 주민등록표등본 등 주소 확인자료(1개월 이내)',
  '최근 3년간 부가가치세과세표준증명·표준재무제표증명·면세사업자수입금액증명 중 해당자료',
  '법인인 경우 법인등기사항전부증명서(1개월 이내), 복수 업종인 경우 주업종 확인자료',
];
const procedure = [
  '소상공인 정책자금 누리집에서 대표자 본인이 지원대상 확인서를 신청합니다. 디지털 소외 소상공인은 공단 지역센터 방문 접수가 가능합니다.',
  '보증서부 대출은 지역신용보증재단·신용보증기금·기술보증기금에서 신용·사업성 평가 후 보증서를 발급받습니다. 순수신용·물적담보는 취급은행이 평가합니다.',
  '대리대출 취급 금융기관이 심사·약정 후 대출을 실행합니다. 지원대상 확인서가 대출을 보증하지 않으며 금액이 줄거나 대출이 거절될 수 있습니다.',
];
const applicationStatus = { status: 'unknown', label: '현재 접수 확인 필요', description: '공고상 신청 시작: 2026년 10월 6일 10:00, 예산 소진 시까지. 실시간 접수·예산 상태는 확인되지 않았습니다.', announcedStart: '2026-10-06T10:00:00+09:00', verifiedAt: null };
const commonTermsNote = '동일관계기업의 운전자금 잔액한도는 직접대출을 포함하여 총 5억원, 시설자금 포함 시 10억원 이내. 거치 후 대출금 70%는 3개월마다 균등분할상환, 30%는 만기 일시상환이 원칙입니다.';
const preferenceNote = '정책우대 0.1%p·정책배려 0.1%p·사회안전망 0.1%p·성실상환 0.3%p·지역격차해소 0.2%p, 최대 0.8%p. 같은 유형 안에서는 중복 불가. 실제 적용 여부·증빙은 별도 확인합니다.';
const base = (id, name, description, terms, extraDocuments, pages) => ({
  id, name, description, mode: 'official', year: 2026, verifiedAt: '2026-10-15', loanType: 'agency',
  terms: { ...terms, notes: commonTermsNote },
  documents: [...commonDocuments, ...extraDocuments],
  documentsNote: '신청인의 동의에 따라 마이데이터로 일부 서류를 확인할 수 있으며 추가 제출이 필요할 수 있습니다. 이 상담 도구는 서류나 개인정보를 수집하지 않습니다.',
  procedure, procedureNote: '4분기 지원대상 확인서 유효기간은 2026년 12월 23일까지이며 연장 불가합니다.',
  links: [{ label: '소상공인 정책자금 공식 누리집', url: officialUrl }],
  sources: [agencyEvidence(id, pages), agencyEvidence('common', '2026.10.06 개정 · 7. 대출 제한기준 및 확인 방법 / 11. 대출한도 운용방법 / 세부자금별 지침')],
  sourceNote: '사용자가 제공한 공식 자료를 기준으로 정리했습니다. 현재 접수 상태와 정책자금 기준금리의 숫자 값은 별도 확인이 필요합니다.',
  applicationStatus: { ...applicationStatus },
});
export const agencyFunds = [
  base('general', '일반경영안정자금', '업력에 관계없이 소상공인의 제품생산·기업경영에 필요한 운전자금을 지원하는 대리대출입니다.',
    { limit: '동일관계기업 당 연간 7천만원 이내', rate: '정책자금 기준금리(분기별 변동) + 0.6%p', period: '5년: 2년 거치 후 3년 분할상환', preference: `${preferenceNote} 착한임대인 특례는 우대금리 제외.` },
    ['금리우대 해당 시 증빙자료', '착한임대인 특례: 가족관계증명서, 착한임대인 증서·재산세 감면 증빙 또는 임대차계약서·임대료 인하증빙 등(p12)', '부동산 중개·대리업 및 분양대행업은 6개월 이상 영업 확인자료(사업장 임대차계약서 등)'],
    'p2~4 신청대상·융자조건·착한임대인 특례 / p6 유의사항 / p7~9 지원대상·제한 / p10~12 제출서류 / p13~20 소상공인 기준·제외업종'),
  base('disabled', '장애인기업지원자금', '장애인기업확인서 등 신청대상 증빙을 갖춘 장애 소상공인의 경영안정을 위한 운전자금입니다.',
    { limit: '동일관계기업 당 최고 1억원 이내(해당 자금 대출잔액 합산)', rate: '고정금리 연 2.0%', period: '7년: 2년 거치 후 5년 분할상환' },
    ['장애인복지카드 또는 장애인증명서, 국가유공자·국가보훈등록증 카드, 장애인기업확인서 등 해당 증빙(p11)', '공동소유 사업체는 장애인기업확인서를 소지하거나 공동대표 모두 장애인복지카드를 소지해야 합니다(p2).', '국가유공자는 상이등급이 있어야 합니다(p2).'],
    'p2 신청대상 / p3 융자조건·접수 / p4 절차 / p6 유의사항 / p7~9 지원대상·제한 / p10~12 제출서류'),
  base('youth', '청년고용연계자금', '청년 대표자 또는 청년 근로자 고용 요건 중 하나를 충족하는 소상공인의 운전자금입니다.',
    { limit: '동일관계기업 당 최고 7천만원 이내(해당 자금 대출잔액 합산)', rate: '정책자금 기준금리(분기별 변동)', period: '5년: 2년 거치 후 3년 분할상환', preference: preferenceNote },
    ['청년 근로자 고용 사업자: 최근 1개월 이내 4대 사회보험 사업장 가입자 명부 또는 사업장 가입자 명부(p11)', '최근 1년 이내 청년 근로자 고용 사업자: 청년 고용 유지 서약서(p11·붙임6). 해당 청년의 고용을 1년 이상 유지하는 내용입니다.', '금리우대 해당 시 증빙자료(p12)'],
    'p2 신청대상 ①~③ / p3 융자조건 / p4 접수·절차 / p6 유의사항 / p7~9 지원대상·제한 / p10~12 제출서류'),
  base('temporary-agency', '긴급경영안정자금 · 일시적경영애로(대리대출)', '매출 15% 이상 감소 또는 공고에 정한 매출감소 확인 예외로 긴급지원이 필요한 소상공인의 운전자금입니다.',
    { limit: '동일관계기업 당 최고 7천만원 이내(일시적경영애로 유형 대출잔액 합산)', rate: '정책자금 기준금리(분기별 변동)', period: '5년: 2년 거치 후 3년 분할상환', preference: preferenceNote },
    ['매출감소 유형: 연도·반기·분기·월의 허용 비교기간에 맞는 매출 증빙(p2·p11)', '연도: 최근 2년 표준재무제표증명·부가세과세표준증명·면세사업자수입금액증명 / 반기: 최근 1년 부가세과세표준증명 / 분기·월: 최근 6개월 이내 국세청 과세인프라자료', '중소기업 특별지원지역: 산업단지 입주확인서 / 12·29 여객기참사 피해: 피해자 확인서(p12)', '그 외 공고상 예외지역·인정사유는 공단 직접 확인(p12), 지역 범위·기간은 붙임5(p21~24) 확인', '금리우대 해당 시 증빙자료(p12)'],
    'p2 신청대상·매출비교 / p3 융자조건 / p4 접수·절차 / p6 유의사항 / p7~9 지원대상·제한 / p10~12 제출서류 / p21~24 대상지역'),
];

export const agencySpecialFacts = {
  youth: {
    expression: '(대표 만 나이 <= 39 AND 업력 < 3년) OR (상시근로자 중 만39세 이하 비율 >= 50%) OR (최근 1년 이내 만39세 이하 근로자 >= 1인 고용 AND 현재 유지)',
    evidence: agencyEvidence('youth', 'p2 신청대상 ①~③'),
    boundaryNotes: ['만39세 포함·업력 정확히3년은 첫 경로 미충족', '청년근로자가 없는 0/0을 50% 이상으로 처리하지 않음', '한 경로 미충족이어도 다른 경로는 계속 검토', '업력은 개인 개업일·법인 설립일에서 신청접수일까지(운용지침 2. 용어의 정의 8호)'],
  },
  disabled: {
    expression: '장애인기업확인서 OR (단독 소유 AND 장애인복지카드 등 해당 증빙) OR (공동 소유 AND 모든 공동대표 장애인복지카드)',
    notes: ['국가유공자는 상이등급 필요', '일부 대표만 카드 소지 시 공동사업체 요건을 자동 충족 처리하지 않음', '업종에 따라 일부 지역신보의 신용보증서 발급이 제한될 수 있음'],
    evidence: agencyEvidence('disabled', 'p2 신청대상 및 각주'),
  },
  temporary: {
    minDeclinePercent: 15,
    allowedComparisons: ['직전연도 대 직전전연도', '직전반기 대 직전전반기 또는 전년동반기', '직전분기 대 직전전분기 또는 전년동분기', '신청전월 대 전전월 또는 전년동월'],
    declineExceptions: ['고용위기지역 또는 산업위기대응특별지역', '중소기업 특별지원지역', '상권활성화구역 또는 자율상권구역', '산업위기선제대응지역', '12·29여객기참사 피해자 확인서 발급', '고용위기선제대응지역', '기타 중소벤처기업부장관이 지원 필요 인정'],
    notes: ['직전전 또는 비교기준 매출이 0이면 비율을 산출해 임의 판정하지 않고 확인 필요', '지역 이름만 비슷한 경우가 아니라 지정 범위·지정기간·사업장 소재 확인 필요', '공고 p21의 고용위기지역·산업위기대응특별지역은 해당지역 없음으로 기재'],
    evidence: agencyEvidence('temporary-agency', 'p2 신청대상·매출감소 확인방법 / p21~24 붙임5'),
  },
  landlord: {
    expression: '비주거용건물임대업(68112) AND 매출액<=30억원 AND 근로자<5인 AND 임차인이 소상공인 AND 임차인이 가족관계증명서상 특수관계아님 AND 2020.1~2026.12 기간 임대료인하 AND (인하개월수×월평균감면율(%)>=10 OR 지자체착한임대인기준 충족)',
    notes: ['일반경영안정자금에만 적용하는 특례', '지원시기 2020.12월초~2026.12월', '우대금리 적용 제외'],
    evidence: agencyEvidence('general', 'p4 착한임대인 특례 / p12 증빙'),
  },
};

/** Limits in KRW. Whole-business average revenue is compared with the main-industry limit. */
export const agencyRevenueThresholds = [
  { limit: 14_000_000_000, classifications: ['C19', 'C24'], label: '석유정제품·1차금속 제조업' },
  { limit: 12_000_000_000, classifications: ['C10','C11','C14','C15','C20','C21','C23','C25','C26','C28','C29','C30','C32','D','E36'], label: '식료품·음료 등 해당 제조업·전기가스·수도업' },
  { limit: 10_000_000_000, classifications: ['H','K'], label: '운수창고·금융보험업(별도로 제외업종 검토)' },
  { limit: 8_000_000_000, classifications: ['A','B','C12','C13','C16','C17','C18','C22','C27','C31','C33','F'], label: '농림어업·광업·건설·해당 제조업' },
  { limit: 6_000_000_000, classifications: ['G'], label: '도매·소매업' },
  { limit: 5_000_000_000, classifications: ['J'], label: '정보통신업' },
  { limit: 4_000_000_000, classifications: ['E_except_E36','L'], label: '하수폐기물·원료재생·부동산업' },
  { limit: 3_000_000_000, classifications: ['M','N','R'], label: '전문과학기술·사업지원임대·예술스포츠여가업' },
  { limit: 1_500_000_000, classifications: ['C34','I','P','Q','S_except_S94'], label: '산업장비수리·숙박음식·교육·보건복지·개인서비스' },
];
export const agencyCommonFacts = {
  revenueEvidence: agencyEvidence('general', 'p14 평균매출액 산정 / p17 붙임2(2025.9.1 개정)'),
  revenueExceptions: ['C31202 중 철도차량용 의자 및 C31322 중 항공기용 의자 제조업은 120억원 이하', '착한임대인 특례는 p4의 매출30억원 이하를 따로 확인'],
  employees: { miningManufacturingConstructionTransport: { operator: '<', count: 10 }, other: { operator: '<', count: 5 }, evidence: agencyEvidence('general', 'p7·p15 상시근로자 기준') },
  employeeNotes: ['현재 머릿수가 아니라 정해진 기간의 월말 상시근로자 평균을 적용', '임원·일용근로자·3개월 이내 기간제·인정 연구전담요원·월60시간미만 단시간근로자 제외', '월60시간이상 단시간근로자는1명을0.5명으로 산정(운용지침 제4절 법령 인용)'],
  retainedStatus: { text: '규모초과 사유발생 다음연도부터 3년간 지위유지 가능. 소기업 외 기업과 합병, 법령상 제외사유, 상시근로자20명이상 등은 제외. 초과만으로 즉시 탈락시키지 말고 확인.', evidence: agencyEvidence('general','p16 소상공인 지위 유지 등') },
  businessType: { text: '영업중 개인사업자·영리법인 본점. 비영리라도 인증사회적기업(예비 제외), 법령상 협동조합 등이 중소기업 기준 충족 시 예외 가능. 외국법인 본·지점·영리법인 지점 제외.', evidence: agencyEvidence('general','p2·p7·p13 사업구분 및 예외') },
  restrictions: { text: '국세·지방세 체납, 신용도판단정보·공공정보 등록, 현재 연체, 휴·폐업, 제외업종, 공단 대출제한 관리, 허위·부정신청, 사회적 물의. 신청자 외 공동대표 적용범위는 p9 각주 확인.', evidence: agencyEvidence('general','p9 대출제한대상') },
  disasterPauseException: { text: '대리대출 운용지침 제7절은 재해를 직접원인으로 휴업중인 소상공인을 융자대상에 포함. PDF의 휴업제한만으로 일괄 탈락시키지 말고 해당 경로와 사실을 추가 확인.', evidence: agencyEvidence('common','7. 대출 제한기준 및 확인 방법 ④ 휴·폐업') },
  repeatLoan: { text: '최근5년 정책자금3회이상 지원 제한. 특별경영안정자금은 제외하며 횟수에도 미포함. 시설자금 또는 직접대출 성실상환 해당 시1회 추가지원 예외. 이4개 중 일반에 횟수확인, 나머지3개는 운용지침상 특별경영안정자금.', evidence: agencyEvidence('common','7. 대출 제한기준 및 확인 방법 ⑦ / 대리대출 세부자금별 지침 2. 특별경영안정자금') },
};
