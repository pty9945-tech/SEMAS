# 공개 사이트 게시

사용자 요청에 따라 누구나 로그인 없이 사용하는 정적 사이트로 전환했다. **SMTP, 관리자 이메일, 영구 디스크, 별도 서버 계정은 공개 사이트에 필요 없다.**

사이트 주소: <https://pty9945-tech.github.io/SEMAS/>

2026-10-15 GitHub Pages의 게시 작업 성공을 확인했다.
실행 기록: <https://github.com/pty9945-tech/SEMAS/actions/runs/38739078085>
게시 파일 커밋: `94a722ac5b369e70cab0eae3d7814ff7b0a2e0a1` (`gh-pages`).

## 동작

- 브라우저가 정적 HTML·CSS·JavaScript를 내려받으면 즉시 상담이 시작된다.
- 정책자금 10종의 질문·조건식·근거 정보가 정적 파일에 포함된다.
- 상담 답변은 브라우저 탭 메모리에서만 계산한다. 상담 API 요청, 쿠키, URL·브라우저 저장소 저장이 없다.
- 새로고침하면 상담 답변이 초기화된다. 복사·인쇄·다시 상담하기는 계속 지원한다.
- 공개형이므로 로그인·초대 관리·이메일 인증이 없다.
- 원본 PDF·HWP와 추출 전문은 게시 파일에 포함하지 않는다.

## 코드 수정 후 다시 게시

개발 환경에서 `npm ci`, `npm run build`를 실행하면 `dist/`가 만들어진다. 이 디렉터리 내용만 `gh-pages` 브랜치 루트에 올린다. `.nojekyll`을 포함하고 소스·인증 환경변수·개인정보를 게시하지 않는다. 기존 게시 브랜치의 커밋을 부모로 사용하는 일반 push로 갱신하며 강제 push는 필요하지 않다.

기본 경로를 상대 주소로 빌드하여 `/SEMAS/` 하위 경로와 다른 정적 호스팅에서도 사용할 수 있다.

## 검증

`npm run test:e2e`는 정적 파일을 Chromium에서 열어 공개 접근, 상담 결과, 답변 변경, 복사·인쇄, 모바일, 미저장을 확인한다. `LIVE_SITE_URL=https://pty9945-tech.github.io/SEMAS/ npm run test:e2e`로 같은 검사를 실제 공개 사이트에서 실행할 수 있다. GitHub Actions의 `Verify public consultation site`도 실제 HTTPS 주소를 검사한다.

이전 초대 인증 서버가 필요한 경우에만 [별도 비공개 서버 안내](private-deployment.md)를 참고한다. 그 서버의 메일·환경변수 설정은 공개 사이트 이용과 관계없다.
