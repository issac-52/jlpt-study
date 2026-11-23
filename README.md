# Kotoba — 계정별 일본어 학습 앱

iPhone과 Galaxy에서 동일하게 사용할 수 있는 모바일 우선 JLPT 학습 PWA입니다.

## 목표
- 각자 이메일/비밀번호 계정으로 로그인하고 진도, 정답/오답, 간격 반복(SRS) 복습을 독립 관리
- 한자 ↔ 관련 단어 ↔ 예문을 연결해 외우기
- JLPT N5~N2로 확장 가능한 공통 콘텐츠 구조 (공식 JLPT 급수별 어휘·한자 목록은 제공되지 않으므로 난이도 분류는 학습용)
- Next.js + TypeScript + Supabase(Postgres/Auth/RLS) + PWA, Vercel 배포

## 문서
- [Codex 개발 지침](./AGENTS.md)
- [제품 요구사항](./docs/PRD.md)
- [기술 설계 및 DB 설정](./docs/ARCHITECTURE.md)

## 시작
1. Node.js 20 이상에서 `npm install`
2. `.env.example`을 `.env.local`로 복사하고 Supabase 프로젝트의 URL과 **publishable/anon** 키 설정
3. Supabase SQL Editor에서 `supabase/migrations/`의 SQL 파일을 번호 순서대로 실행 (기존 프로젝트는 미적용 파일만 실행)
4. Supabase Auth 이메일 로그인을 활성화하고 Site URL/Redirect URL을 개발 및 배포 도메인에 맞게 설정
5. `npm run dev`로 실행, 휴대폰에서 HTTPS 배포 주소에 접속해 홈 화면에 추가

> 현재 내장된 콘텐츠는 UI와 복습 동작을 검증하기 위한 소규모 예시 데이터입니다. N5~N2 전체 단어장을 채운 상태가 아닙니다. 서버 비밀키(service_role)는 절대 브라우저에 넣지 마세요.

## 개발
`npm run dev`, `npm run lint`, `npm run typecheck`, `npm run build`를 사용합니다.

`npm test`는 Node.js 22 이상에서 복습 일정을 검증합니다. 로컬 Supabase에 마이그레이션을 적용한 뒤 아래 명령으로 DB 연동 테스트를 실행할 수 있습니다. 테스트용 계정과 학습 기록은 트랜잭션 종료 시 롤백됩니다.

```sh
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/tests/rls_smoke.sql
```
