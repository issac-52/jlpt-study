# Codex 프로젝트 지침 — Kotoba

## 제품 맥락
이 프로젝트는 한국어 화자 2명이 각자 계정으로 사용하는 일본어 JLPT 모바일 학습 PWA입니다. 한자 의미를 이해하고, 연결된 단어의 읽기·뜻을 외우고, 간격 반복으로 복습하는 것이 핵심입니다. 한 명은 Galaxy, 다른 한 명은 iPhone을 사용합니다.

## 작업 전 체크
1. README.md와 docs/PRD.md, docs/ARCHITECTURE.md를 읽을 것.
2. 기존 기능/DB 정책을 우선 존중하고 작은 변경 단위로 구현할 것.
3. 사용자 데이터 격리(RLS)와 친구 간 *동의한 통계만 공유* 원칙을 지킬 것.
4. 360px 폭부터 모바일 퍼스트, 터치 대상 최소 44px, iOS safe area 대응.
5. iOS Safari와 Android Chrome의 홈 화면 설치를 고려. 플랫폼별 차이 확인.
6. 공개 DB 클라이언트에는 publishable/anon 키만. service_role 및 비밀번호를 커밋하지 말 것.
7. JLPT는 공식 급수별 한자/어휘 목록을 제공하지 않음. 앱의 level은 참고 분류이며 공식 보증처럼 쓰지 말 것.
8. 학습 단어, 번역, 예문을 추가할 때 정확성 및 데이터 출처/라이선스를 확인할 것.
9. 새로운 기능은 접근성(키보드, 스크린리더), loading/error/empty 상태도 구현할 것.

## 기술 규칙
- Next.js App Router + TypeScript (strict) + React + Tailwind CSS.
- Supabase Auth + Postgres, 모든 개인 데이터 테이블에 RLS 적용.
- 서버 권한이 필요한 조회/작업은 최소 권한 RPC로 구현.
- UI 컴포넌트와 SRS 알고리즘은 분리; 브라우저 시간을 기준으로 표시하되 DB에는 timestamptz UTC.
- 구성 가능한 환경변수는 .env.example에 문서화.
- 설치: npm install. 검증: npm run typecheck && npm run lint && npm run build.

## MVP 완료 기준
- 이메일 회원가입/로그인/로그아웃과 독립 계정
- 한자/단어 탐색과 연결, 의미/읽기 복습 기록
- 복습 일정과 개인 대시보드
- 친구 코드 요청/수락, 서로 동의한 친구의 통계 비교
- 모바일 반응형 UI와 PWA manifest + 아이콘
- RLS 없는 우회 경로, 하드코딩된 인증, 가짜 학습 완료 기록 금지

## 작업 우선순위
1. 동작하는 인증/DB 마이그레이션
2. 한자·단어 학습 및 오답 기록
3. 간격 반복 및 친구 연결
4. PWA 품질 개선, 테스트, 종합 콘텐츠 확장

사용자가 요청하지 않은 외부 유료 서비스 도입, 앱스토어 배포, 개인 데이터 수집 기능은 추가하지 말 것.
