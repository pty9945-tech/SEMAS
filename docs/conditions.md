# 2026년 정책자금 조건표

확인일: 2026-10-15. 사용자가 제공한 12개 문서를 근거로 대리대출 4종·직접대출 6종을 검토한다. 현재 접수 상태·예산·기준금리 숫자는 확인하지 않았다. 가산금리·고정금리는 첨부 문서 값이다.

자동 조건식은 `policy/rules.js`, 질문·선택지는 `policy/questions.js`, 문서별 상세는 `policy/agency-data.js`와 `policy/direct-data.js`에 있다. 복잡한 예외·증빙은 상담직원이 해당 기준을 확인한 답변으로 평가한다. 미확인 답변으로 충족을 추정하지 않는다.

상담 전제: **소상공인 기본요건 충족을 전제로 상담합니다.** 상시근로자 수 기준 · 업종별 소기업 평균매출액 기준 · 기본 사업자 형태·영리성 기준은 재질문하거나 가상 답변으로 채우지 않는다. 자금별 추가 매출·청년 고용·졸업후보 기준과 융자제한은 별도로 판단한다.

| 자금 | 한도 | 금리 | 기간 | 조건 ID |
| --- | --- | --- | --- | --- |
| 일반경영안정자금 | 동일관계기업 당 연간 7천만원 이내 | 정책자금 기준금리(분기별 변동) + 0.6%p | 5년: 2년 거치 후 3년 분할상환 | A-ACTIVE, INDUSTRY, DELINQUENCY, BALANCE, A-TAX, A-RESTRICTIONS, GENERAL-FREQUENCY, general-PURPOSE |
| 장애인기업지원자금 | 동일관계기업 당 최고 1억원 이내(해당 자금 대출잔액 합산) | 고정금리 연 2.0% | 7년: 2년 거치 후 5년 분할상환 | A-ACTIVE, INDUSTRY, DELINQUENCY, BALANCE, A-TAX, A-RESTRICTIONS, DISABLED, disabled-PURPOSE |
| 청년고용연계자금 | 동일관계기업 당 최고 7천만원 이내(해당 자금 대출잔액 합산) | 정책자금 기준금리(분기별 변동) | 5년: 2년 거치 후 3년 분할상환 | A-ACTIVE, INDUSTRY, DELINQUENCY, BALANCE, A-TAX, A-RESTRICTIONS, YOUTH, youth-PURPOSE |
| 긴급경영안정자금 · 일시적경영애로(대리대출) | 동일관계기업 당 최고 7천만원 이내(일시적경영애로 유형 대출잔액 합산) | 정책자금 기준금리(분기별 변동) | 5년: 2년 거치 후 3년 분할상환 | A-ACTIVE, INDUSTRY, DELINQUENCY, BALANCE, A-TAX, A-RESTRICTIONS, HARDSHIP, temporary-agency-PURPOSE |
| 혁신성장촉진자금 | 일반형: 연간 운전 1억원·시설 5억원 / 혁신형: 연간 운전 2억원·시설 10억원 이내 | 정책자금 기준금리 + 0.4%p(변동); 요건별 우대 최대 0.8%p | 운전 5년(거치 0~2년), 시설 8년(거치 0~3년), 거치는 연 단위 선택 | D-ACTIVE, INDUSTRY, DELINQUENCY, BALANCE, D-TAX, D-RECENT, D-RESTRICTIONS, INNOVATION, INNOVATION-PURPOSE |
| 긴급경영안정자금(재해·직접대출) | 기본 1억원 이내(재해 유형 대출잔액 합산); 특정 특별재난은 3억원 이내 | 기본 연 2.0% 고정; 지침 열거 특별지원은 연 1.5% 고정 | 기본 5년(2년 거치); 특별지원 유형별 5년·7년·10년 | INDUSTRY, DELINQUENCY, BALANCE, D-RECENT, D-RESTRICTIONS, E-ACTIVE, DISASTER, emergency-direct-PURPOSE |
| 일시적경영애로자금(직접대출) | 7천만원 이내(일시적경영애로 유형 대출잔액 합산) | 정책자금 기준금리(변동); 요건별 우대 최대 0.8%p | 5년(2년 거치 포함) | D-ACTIVE, INDUSTRY, DELINQUENCY, BALANCE, D-TAX, D-RECENT, D-RESTRICTIONS, TEMP-AGE, TEMP-REVENUE, HARDSHIP-DIRECT, temporary-direct-PURPOSE |
| 신용취약소상공인자금 | 동일관계기업 3천만원 이내; 관련 2023~2026 자금 잔액 합산·기업신용등급별 한도 적용 | 정책자금 기준금리 + 1.6%p(변동); 요건별 우대 최대 0.8%p | 5년(2년 거치 포함) | D-ACTIVE, INDUSTRY, DELINQUENCY, BALANCE, D-TAX, D-RECENT, D-RESTRICTIONS, CREDIT-SCORE, CREDIT-AGE, CREDIT-EDUCATION, CREDIT-GRADE, CREDIT-BALANCE, credit-PURPOSE |
| 민간투자연계형매칭융자 | 동일관계기업 연간 최대 5억원 및 선투자 추천서상 추천금액 이내(투자·펀딩 최대 5배 매칭) | 정책자금 기준금리 + 0.4%p(변동); 요건별 우대 최대 0.8%p | 8년(거치 0~3년, 연 단위 선택) | D-ACTIVE, INDUSTRY, DELINQUENCY, BALANCE, D-TAX, D-RECENT, D-RESTRICTIONS, INVESTMENT, investment-PURPOSE |
| 재도전특별자금 | 일반형 7천만원 / 희망형 1억원 / 도약형 2억원 이내(재도전특별자금 대출잔액 합산) | 정책자금 기준금리 + 일반형 1.6%p / 희망형 0.6%p / 도약형 0.4%p(변동); 요건별 우대 최대 0.8%p | 5년(2년 거치 포함) | D-ACTIVE, INDUSTRY, DELINQUENCY, BALANCE, D-TAX, D-RECENT, D-RESTRICTIONS, RESTART, restart-PURPOSE |

## 명시적인 판단 조건과 근거

`eq`는 일치, `in`은 구간 목록 포함, `contains`는 복수선택 항목 포함이다. AND는 모두 충족, OR는 한 경로 충족이다. 미응답·모름·미충족은 별개 상태다. 확정적인 미충족이 없는 미확인 조건은 추가 확인으로 남긴다.

| ID | 판단 | 조건식 | 문서·항목 |
| --- | --- | --- | --- |
| A-ACTIVE | 영업 중인 사업체 — 재해 휴업 예외는 별도 확인 | businessStatus eq "active" (확인 필요: paused) | 소상공인정책자금(대리대출) 운용지침 개정 전문.hwp · 7. 대출 제한기준 및 확인 방법 ④ 휴·폐업 |
| D-ACTIVE | 영업 중인 사업체 | businessStatus eq "active" | (260709) 소상공인정책자금 직접대출 운용지침(공통부문) 개정 전문.hwp · 제6장 대출제한대상 ⑤ 휴·폐업 |
| E-ACTIVE | 영업 중 또는 재해로 직접 피해를 입은 휴업 | (businessStatus eq "active" OR (businessStatus eq "paused" AND disasterPause eq "yes")) | 긴급경영안정자금(직접대출) 운용지침 개정 전문.hwp · 2. 대출제한대상 — 휴·폐업 예외 |
| INDUSTRY | 융자 제외 업종에 해당하지 않음 | exclusionStatus eq "clear" (확인 필요: exception) | 소상공인정책자금(대리대출) 운용지침 개정 전문.hwp · 붙임4 소상공인 정책자금 융자제외 대상 업종 |
| A-TAX | 대리대출 세금체납 제한 검토 | taxStatus eq "clear" (확인 필요: deferred,seizure) | 소상공인정책자금(대리대출) 운용지침 개정 전문.hwp · 7. 대출 제한기준 및 확인 방법 ① 세금체납 |
| D-TAX | 직접대출 세금체납 없음 또는 명시된 유예·특례 | taxStatus in ["clear","deferred","seizure"] | (260709) 소상공인정책자금 직접대출 운용지침(공통부문) 개정 전문.hwp · 제6장 대출제한대상 ① 세금체납 및 예외 |
| DELINQUENCY | 현재 대출 연체 제한 검토 | delinquency eq "clear" (확인 필요: exception) | 소상공인정책자금(대리대출) 운용지침 개정 전문.hwp · 7. 대출 제한기준 및 확인 방법 ③ 연체 |
| D-RECENT | 직접대출 최근 3개월 연체 제한 검토 | directRecentDelinquency eq "clear" (확인 필요: exception) | (260709) 소상공인정책자금 직접대출 운용지침(공통부문) 개정 전문.hwp · 제6장 대출제한대상 ③ 연체 — 30일 1회 / 10일 4회·예외 |
| A-RESTRICTIONS | 대리대출 나머지 제한 및 예외 검토 | agencyRestrictions eq "clear" (확인 필요: exception) | 소상공인정책자금(대리대출) 운용지침 개정 전문.hwp · 7. 대출 제한기준 및 확인 방법 |
| D-RESTRICTIONS | 해당 직접대출의 나머지 제한 및 예외 검토 | directRestrictions eq "clear" (확인 필요: exception) | (260709) 소상공인정책자금 직접대출 운용지침(공통부문) 개정 전문.hwp · 제6장 대출제한대상 — 자금별 별도 규정 우선 |
| BALANCE | 후보별 기존 잔액·연간 한도·최소 신청액 확인 | loanHistory eq "clear" (확인 필요: review) | 소상공인정책자금(대리대출) 운용지침 개정 전문.hwp · 대출한도 운영방법 / 각 직접대출 지침 1. 개요 — 대출한도 |
| GENERAL-FREQUENCY | 최근 5년 3회 이상 지원 제한 또는 명시된 예외 확인 | generalFrequency eq "clear" (확인 필요: exception) | 소상공인정책자금(대리대출) 운용지침 개정 전문.hwp · 7. 대출 제한기준 및 확인 방법 ⑦ 최근 5년 정책자금 3회 이상 |
| DISABLED | 장애 증빙과 대표자별 세부 요건 | (disabledProof eq "yes" AND disabledDetails eq "yes") | 2026년 소상공인정책자금(대리대출) 신청안내자료_장애인기업지원자금(4분기).pdf · p.2 신청대상 / 제출서류 — 장애인기업 확인 |
| YOUTH | 청년 대표·업력 또는 청년 고용 경로 | ((ownerAge eq "under40" AND businessAge in ["under90","from90To2","from2To3"]) OR youthEmployment in ["majority","recent"]) | 2026년 소상공인정책자금(대리대출) 신청안내자료_청년고용연계자금(4분기).pdf · p.2 신청대상 ①~③ |
| HARDSHIP | 인정기간 매출 15% 이상 감소 또는 7개 확인 예외 | (salesDrop eq "atLeast15" OR (hardshipException contains "employmentCrisis" OR hardshipException contains "smeSpecial" OR hardshipException contains "commercialArea" OR hardshipException contains "industryPreemptive" OR hardshipException contains "flight1229" OR hardshipException contains "employmentPreemptive" OR hardshipException contains "minister")) | 2026년 소상공인정책자금(대리대출) 신청안내자료_긴급경영안정자금(일시적경영애로)(4분기).pdf · p.2 신청대상 / 붙임5 신청대상 지역 |
| HARDSHIP-DIRECT | 인정기간 매출 15% 이상 감소 또는 7개 확인 예외 | (salesDrop eq "atLeast15" OR (hardshipException contains "employmentCrisis" OR hardshipException contains "smeSpecial" OR hardshipException contains "commercialArea" OR hardshipException contains "industryPreemptive" OR hardshipException contains "flight1229" OR hardshipException contains "employmentPreemptive" OR hardshipException contains "minister")) | (260804) 일시적경영애로자금(직접대출) 운용지침 개정 전문.hwp · 1. 개요 — 일시적경영애로 사유 / 매출감소 확인방법(연도·반기·분기·월) |
| TEMP-AGE | 일시적경영애로 직접대출 업력 7년 미만 | businessAge in ["under90","from90To2","from2To3","from3To7"] | (260804) 일시적경영애로자금(직접대출) 운용지침 개정 전문.hwp · 1. 개요 — 지원대상 ② 업력 |
| TEMP-REVENUE | 일시적경영애로 직접대출 연매출 1억 400만원 미만 | annualRevenue eq "under104m" | (260804) 일시적경영애로자금(직접대출) 운용지침 개정 전문.hwp · 1. 개요 — 지원대상 ① 연매출 |
| CREDIT-SCORE | NCB 개인신용평점 839점 이하 | creditScore eq "upTo839" | (260804) 신용취약소상공인자금 운용지침 개정 전문.hwp · 1. 개요 — 지원대상 ③ 중·저신용 |
| CREDIT-AGE | 보정된 업력 90일 이상 | creditAge eq "atLeast90" | (260804) 신용취약소상공인자금 운용지침 개정 전문.hwp · 1. 개요 — 지원대상 ② 업력 / 등록 전 업력 최대 20일 인정 |
| CREDIT-EDUCATION | 지정 신용관리교육 사전 이수 | creditEducation eq "yes" | (260804) 신용취약소상공인자금 운용지침 개정 전문.hwp · 1. 개요 — 지원대상 ① 신용관리교육 |
| CREDIT-GRADE | 기업등급 9~10등급이면 연매출 1억 9,700만원 이상 | (creditGrade eq "oneToEight" OR (creditGrade eq "nineToTen" AND annualRevenue eq "atLeast197m")) | (260804) 신용취약소상공인자금 운용지침 개정 전문.hwp · 1. 개요 — 기업신용등급(NICE SOHO ML)별 대출한도 표 주석 ** |
| CREDIT-BALANCE | 관련자금 잔액 차감 후 최소 1,000만원 이상 신청 가능 | creditBalance eq "enough" | (260804) 신용취약소상공인자금 운용지침 개정 전문.hwp · 1. 개요 — 대출한도 산정방식 |
| DISASTER | 유효한 재해 확인증 및 압류·매각유예·징수특례 | (disasterCertificate eq "yes" AND taxStatus eq "seizure") | 긴급경영안정자금(직접대출) 운용지침 개정 전문.hwp · 1. 개요 — 지원대상 ① 체납처분 유예 등 ② 재해피해 |
| INNOVATION | 혁신성장 일반형·혁신형 중 한 경로 이상 | (innovationPaths contains "longstanding" OR innovationPaths contains "social" OR (innovationPaths contains "academy" AND academyRestrictions eq "clear" (확인 필요: exception)) OR innovationPaths contains "smart" OR innovationPaths contains "export" OR innovationPaths contains "growth" OR innovationPaths contains "factory" OR innovationPaths contains "local" OR (innovationPaths contains "graduation" AND graduationVerified eq "yes") OR innovationPaths contains "faithful") | (260804) 혁신성장촉진자금 운용지침 개정 전문.hwp · 1. 개요 — 지원대상 ① 일반형 ② 혁신형 |
| INNOVATION-PURPOSE | 운전·시설 목적 — 사관학교 단독 경로는 운전자금만 | (purpose contains "operations" OR (purpose contains "equipment" AND (innovationPaths contains "longstanding" OR innovationPaths contains "social" OR innovationPaths contains "smart" OR innovationPaths contains "export" OR innovationPaths contains "growth" OR innovationPaths contains "factory" OR innovationPaths contains "local" OR (innovationPaths contains "graduation" AND graduationVerified eq "yes") OR innovationPaths contains "faithful"))) | (260804) 혁신성장촉진자금 운용지침 개정 전문.hwp · 1. 개요 — 자금용도 / 사관학교 수료 시설자금 제외 |
| INVESTMENT | 지정 주관기관 선투자 및 소상공인 선투자 추천서 | investment eq "yes" | (붙임1) 민간투자연계형매칭융자 운용지침 개정 전문 (1).hwp · 1. 개요 — 지원대상 |
| RESTART | 재도전의 한 경로 이상 및 그 경로 세부요건 확인 | ((restartPaths contains "preparation" OR restartPaths contains "early" OR restartPaths contains "adjustment" OR restartPaths contains "hope" OR restartPaths contains "leap") AND restartVerified eq "yes") | (붙임1) 재도전특별자금 운용지침 개정 전문.hwp · 1. 개요 — 일반형·희망형·도약형 지원대상 전체 요건 |
| general-PURPOSE | 자금 용도에 해당 | purpose contains "operations" | 2026년 소상공인정책자금(대리대출) 신청안내자료_일반경영안정자금(4분기).pdf · 개요 — 자금용도 |
| disabled-PURPOSE | 자금 용도에 해당 | purpose contains "operations" | 2026년 소상공인정책자금(대리대출) 신청안내자료_장애인기업지원자금(4분기).pdf · 개요 — 자금용도 |
| youth-PURPOSE | 자금 용도에 해당 | purpose contains "operations" | 2026년 소상공인정책자금(대리대출) 신청안내자료_청년고용연계자금(4분기).pdf · 개요 — 자금용도 |
| temporary-agency-PURPOSE | 자금 용도에 해당 | purpose contains "operations" | 2026년 소상공인정책자금(대리대출) 신청안내자료_긴급경영안정자금(일시적경영애로)(4분기).pdf · 개요 — 자금용도 |
| emergency-direct-PURPOSE | 자금 용도에 해당 | purpose contains "recovery" | 긴급경영안정자금(직접대출) 운용지침 개정 전문.hwp · 개요 — 자금용도 |
| temporary-direct-PURPOSE | 자금 용도에 해당 | purpose contains "operations" | (260804) 일시적경영애로자금(직접대출) 운용지침 개정 전문.hwp · 개요 — 자금용도 |
| credit-PURPOSE | 자금 용도에 해당 | purpose contains "operations" | (260804) 신용취약소상공인자금 운용지침 개정 전문.hwp · 개요 — 자금용도 |
| investment-PURPOSE | 자금 용도에 해당 | (purpose contains "operations" OR purpose contains "equipment") | (붙임1) 민간투자연계형매칭융자 운용지침 개정 전문 (1).hwp · 개요 — 자금용도 |
| restart-PURPOSE | 자금 용도에 해당 | purpose contains "operations" | (붙임1) 재도전특별자금 운용지침 개정 전문.hwp · 개요 — 자금용도 |

## 범위와 제한

- 지원 가능액·승인 확률을 계산하지 않는다. 제시된 한도는 문서상 최고한도이며 기존 잔액·기업평가·관계기업 합산 등 확인이 필요하다.
- 복합 경로의 일부 조건만 확인했다면 모름·확인 필요로 답해야 한다. 특히 재도전 경로·사관학교 제한업종·졸업후보의 지위유지 제외·지역 지정기간은 서류 확인을 요구한다.
- 첨부에 없는 대환 등은 이 도구의 검토 범위 밖이며 다른 자금이 존재하지 않는다고 결론내리지 않는다.
- 원문 파일은 공개 정적 경로와 Git에서 제외한다. 근거는 문서명·페이지 또는 항목으로 연결한다.
