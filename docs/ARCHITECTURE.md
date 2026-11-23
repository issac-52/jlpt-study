# 기술 설계

## 선택
- Frontend: Next.js App Router, TypeScript, Tailwind CSS, mobile-first.
- Auth/DB: Supabase Auth + PostgreSQL + Row Level Security.
- 배포: Vercel (HTTPS), Supabase 별도 프로젝트.
- PWA: App Router manifest, SVG 아이콘, 서비스 워커 최소 구성. 첫 버전은 온라인 전용.

## 관계
auth.users 1:1 profiles.
kanji n:m vocabulary via vocabulary_kanji.
auth.users 1:n review_state (item_type/item_id/mode 복합 유니크).
auth.users 1:n review_logs (학습 이벤트).
friend_requests: sender_id + recipient_id, pending/accepted/rejected.
친구 통계는 security definer 함수가 authenticated caller와 accepted 관계를 검사한 후 집계.

## Auth
브라우저 Supabase JS 클라이언트 + Supabase Auth의 이메일/비밀번호 세션. Next.js 앱은 클라이언트 내부에서 현재 세션을 확인하며 RLS로 보호한다. 향후 SSR 라우트로 전환하면 Supabase @supabase/ssr 및 Proxy 세션 갱신을 추가한다.

## DB 보안
- 학습 콘텐츠는 로그인 사용자만 select, 쓰기는 마이그레이션/운영 경로 전용.
- profiles: 본인만 직접 읽고 수정 가능. 대기 중인 요청의 상대 닉네임은 `get_pending_friend_names()` RPC로 조회.
- review_state/review_logs: 자기 것만 CRUD/select.
- friend_requests: 참가자에게만 select; 수락/거절은 수신자에게만 update.
- 친구 코드 조회 및 요청 생성은 입력 제한된 security definer RPC 이용.
- 앱에서 공개적으로 노출되는 데이터는 최소화; 초대 코드는 비밀번호 대체 수단이 아님.

## PWA 정책
인증/학습 데이터 응답은 캐시하지 않음. 오프라인 동작은 약속하지 않는다. iOS Safari 및 Android Chrome에서 설치를 수동으로 검증한다.

## 데이터 추가 가이드
supabase/migrations에 데이터 또는 스키마 변경 파일을 순서대로 추가. 임의 출처 단어집을 저작권 확인 없이 복제하지 말 것. 초기 seed는 동작 검증용 소량 예시.
