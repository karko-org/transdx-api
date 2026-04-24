# transdx-api

한국오토(KAR) 가족 사업용 **자동변속기 진단 시스템**의 백엔드 API.
아버지(30년 변속기 전문가)의 도메인 지식을 대표님이 승인한 형태로 코드화하며,
1인 개발 + Claude Code (Max 20x)로 Week 1~8 로드맵을 진행 중.

3-레포 구성에서 이 레포의 역할:
- **transdx-api** (이 레포) — Fastify + Prisma + Postgres, 마스터 데이터 / 진단 런타임 / 인증
- transdx-admin-console — 대표님/관리자용 웹 (마스터 데이터 CRUD)
- transdx-mobile — 공업사 상담자용 React Native 앱 (케이스 진행)
- transdx-documents — 대표님 승인된 중분류 진단 문서(PDF) 원본
  (private repo; GitHub API 접근 불가, 로컬 경로 `../transdx-documents/` 참조)

---

## 스택 및 실행

- **Runtime**: Node.js (ESM), TypeScript 6, `tsx watch`로 개발
- **Framework**: Fastify 5, @fastify/jwt, @fastify/cors, @fastify/multipart
- **DB**: Postgres 16 (Docker), Prisma 7 (`@prisma/adapter-pg`)
- **검증**: Zod 4 (`safeParse` 패턴 — throw 대신 400 응답)
- **인증**: JWT 8시간 만료, bcrypt 해시

스크립트는 `package.json` 참조. 단, `npm run db:reset`은 public 스키마
DROP 후 재생성 — **⚠️ 전체 데이터 삭제됨**. 사용 전 반드시 확인.

### 로컬 DB

`docker compose up -d db` → `localhost:5432`, DB명/유저/비밀번호는
`.env`의 `DATABASE_URL` 기준. 볼륨 `transdx_pgdata`.

### 환경 변수 (.env)

- `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN` (기본 8h), `PORT` (3000), `HOST` (0.0.0.0)
- `ADMIN_USERNAME`, `ADMIN_PASSWORD` — seed가 읽어 초기 관리자 계정 생성
- `COUNSELOR_SEED_USERNAME`, `COUNSELOR_SEED_PASSWORD` — seed가 읽어 테스트용 상담자 계정 생성 (admin workshop에 붙음)

---

## ⚠️ 진단 콘텐츠 현황 — 지레짐작 금지

고장진단 중분류는 총 **12개 (M01~M12)** 로 설계되어 있으나, **현재 seed에 포함된 것은 M01(변속기 오일 누유) 단 하나**다:

- `failure_types`: `L-01` ~ `L-08` (8개, 오일 누유 관련) 만 seed됨
- `questions`: `Q-L01` ~ `Q-L12` (Q-L05 결번, 11개) 만 seed됨
- 나머지 M02~M12는 대표님 승인 전/작업 중/미작성. 완성되는 대로 `prisma/seeds/`에 추가될 예정
- **Claude Code가 M02~M12에 해당하는 failure type / symptom / question / rule을 추정해서 만들지 말 것.** 대표님 승인 PDF(`transdx-documents/`)가 있고 joey가 직접 seed에 옮긴 경우만 반영
- Week 3~8 개발·현장 테스트는 M01 범위 안에서만 진행

---

## 데이터 모델 — 3-Layer 구조

`prisma/schema.prisma` 참조. 20개 테이블을 3 레이어로 읽는다 (Operations 3 + Diagnostic Master 9
+ Runtime 8 = 20개. 2026-04-21 M01 seed 작업에서 기존 17개에서 +3개 추가):

### 1. Operations Layer
- `workshops` — 공업사
- `users` — 상담자/관리자 (`role`: admin | manager | counselor, workshop 종속)
- `vehicles` — 차량 (번호판 unique)

### 2. Diagnostic Master Layer (관리자가 CRUD)
- `symptom_categories` → `symptoms` — 증상 분류 계층
- `questions` — 진단 질문 (code + text + `answer_format`)
- `question_answer_options` — 질문별 답변 옵션 (예/아니오/모름, 소량/다량/모름 등). `is_scoring=false`면 점수 룰 매칭 skip ("모름")
- `symptom_questions` — 증상과 질문의 M:N (`sort_order`)
- `failure_types` — 고장 유형 (`L-01` 등 code)
- `diagnosis_rules` — `(symptom_question, failure_type, answer_option)` 조합 + `score_delta` (점수만 담당)
- `diagnosis_effect_rules` — 점수 외 효과 (증상 신뢰도 가감 / 플래그 set). `effect_type`: `symptom_confidence` | `flag`
- `repair_estimate_items` — 고장 유형별 견적 항목 (임시 테이블)

### 3. Runtime Layer (앱에서 기록)
- `cases` — 진단 케이스, 상태: `draft → diagnosed → quoted → completed`
- `case_symptoms`, `case_question_answers` (답변은 `answer_option_id`로 저장)
- `diagnosis_runs` + `diagnosis_run_candidates` — 실행 버전, 후보 3개 (rank 1/2/3). `symptom_confidence_score`로 증상 신뢰도 누적
- `diagnosis_run_flags` — 진단 런 시점에 set된 플래그 (예: `deep_leak`, `non_atf_leak_check`)
- `quotes`, `snapshots` — 견적/스냅샷

### 진단 룰 설계 원칙 (반드시 지킬 것)
- **질문 답변은 다지선다 지원.** `answer_format`은 `yes_no_unknown` / `yes_no` / `low_high_unknown` 등 표준 패턴. 새 패턴 추가 시 `prisma/seeds/answerOptions.ts`와 `src/lib/adminMasterQuestions.ts`의 템플릿에 추가
- **"모름" 답변은 `is_scoring=false`** — 답변 이력은 보존되지만 점수 룰 매칭에서 자동 제외 (점수 영향 0)
- **`DiagnosisRule`은 점수만 담당.** 플래그·증상 신뢰도 같은 효과는 `DiagnosisEffectRule`에 분리 (단일 책임)
- **증상(symptom)은 질문 필터링 용도만.** 증상 자체에는 점수 없음 (단, `DiagnosisEffectRule.symptom_confidence_delta`로 답변에 따라 증상 신뢰도를 가감 가능)
- **점수 계산은 앱(코드)에서 수행.** DB에는 `score_delta` / `symptom_confidence_delta` / 플래그 정의만 저장하고 합산·플래그 set은 런타임 로직이 담당
- 룰 unique:
  - `DiagnosisRule`: `(symptom_question_id, failure_type_id, answer_option_id)`
  - `DiagnosisEffectRule`: `(symptom_question_id, answer_option_id, effect_type, flag_key)`
  - `QuestionAnswerOption`: `(question_id, value)`

---

## 라우트 구조

`src/server.ts`에 등록되는 현재 라우트:

- `GET /api/health`
- `POST /api/admin/login`, `GET /api/admin/me` — `src/routes/adminAuth.ts`
- `/api/admin/workshops[/:id]` + `/api/admin/workshops/:id/users[/:userId]`
- `/api/admin/master/symptom-categories[/:id][/symptoms]`
- `/api/admin/master/symptoms/:id[/questions][/diagnosis-rules][/effect-rules]`
- `/api/admin/master/questions[/:id][/answer-options]`
- `/api/admin/master/answer-options/:id`
- `/api/admin/master/symptom-questions/:id`
- `/api/admin/master/diagnosis-rules[/:id]`
- `/api/admin/master/effect-rules[/:id]`
- `/api/admin/master/failure-types[/:id]` — `adminMasterFailureTypeRoutes.ts`

**주의:** 마스터 데이터(symptom/category/question/symptom-question/diagnosis-rule) 라우트는 전부 한 파일 `adminMasterSymptomRoutes.ts`에 통합되어 있다. 파일명만 보고 없다고 판단하지 말 것.

Week 3부터 추가될 것 (아직 없음):
- **모바일 상담자 인증** (`/api/auth/login`) — 관리자 JWT와 의도적 분리.
  관리자 JWT(`/api/admin/login`)는 joey 혼자 쓰는 웹 패널(transdx-admin-console)용으로
  마스터 데이터 CRUD 권한. 상담자 JWT는 공업사 상담자들이 쓰는 모바일 앱
  (transdx-mobile)용으로 케이스 런타임만. 보안 경계, 토큰 정책, CORS를
  다르게 가져가기 위한 의도적 분리임 — "왜 두 벌이지?"라고 통합 판단하지 말 것.
- 공개 마스터 데이터 조회 (앱에서 증상/질문 읽기)
- 케이스 런타임 (`/api/cases`, 증상 선택, 질문 응답, diagnosis run 실행)

---

## 컨벤션

### 라우트 파일
- `src/routes/*.ts`에 `FastifyPluginAsync` export
- 로직은 `src/lib/*.ts`에 분리, 라우트는 검증 + 호출 + 직렬화만 담당
- `serializeXxx()` 함수로 응답 모양을 명시적으로 구성 (Prisma 객체 그대로 반환하지 않음)
- 인증은 preHandler로 `[app.requireAdmin]` — `src/plugins/auth.ts`에서 decorate

### Zod 검증
- 라우트 진입점에서 `body` / `params` / `query` 각각 `safeParse`
- 실패 시 `reply.status(400).send({ message: "..." })` — 한국어 메시지
- id 파라미터는 `z.coerce.number().int().positive()`

### 에러 응답
- 전부 `{ message: "한국어 메시지" }` 형태
- 409: 중복(code unique), 연결된 런타임 데이터 있어 삭제 불가
- 404: 대상 없음
- 401/403: 인증/권한

### 삭제 정책
- 런타임 데이터(cases, diagnosis_runs 등)와 연결된 마스터 데이터는 **삭제 대신 `is_active=false`** 로 비활성화 유도 (409 응답 후 가이드 메시지)

### 스키마 필드
- 타임스탬프: `created_at DateTime @default(now())`, `updated_at DateTime @updatedAt`
- snake_case 컬럼, `@@map`으로 테이블명 snake_case 매핑
- `sort_order Int @default(0)` + `is_active Boolean @default(true)` 는 마스터 테이블 기본 세트

---

## Seed 관리

`prisma/seed.ts`가 호출 순서를 정의:
1. symptomCategories (4개 고정)
2. symptoms (12개 고정 — 1번 = "변속기 오일 누유")
3. failureTypes (⚠️ M01 범위만 — L-01~L-08)
4. questions (⚠️ M01 범위만 — Q-L01~Q-L12, Q-L05 결번)
5. answerOptions (각 question의 `answer_format`에 맞춰 옵션 생성)
6. diagnosisRules (점수 룰)
7. diagnosisEffectRules (플래그 / 증상 신뢰도 효과)
8. adminUser (`.env`의 ADMIN_USERNAME/PASSWORD 사용)

upsert 기반이라 반복 실행 안전. 순서 바꿀 때는 FK 의존 확인 필요.

### M02~M12 추가 시 반복 패턴

자세한 가이드는 `docs/plan-m01-seed-multi-choice-2026-04-21.md §6` 참조.
요약: failureTypes → questions → answerOptions → diagnosisRules →
diagnosisEffectRules 순서로 seed 파일에 행 push. 스키마 변경 없이
가능 (중분류별 코드 prefix로 자연 격리).

---

## 🔧 미해결 설계 과제 (TBD)

### 오토미션 귀속 판별(Triage) 게이트
현재 증상/질문은 모두 **"이 차량은 오토미션 문제다"** 전제로 시작한다. 그러나 실제 상담에서는 그 앞 단계에서:
- 엔진오일 누유인가 변속기 오일 누유인가
- 냉각수/브레이크액 누수인가
- 진동이 엔진/서스펜션 원인인가

같은 "오토미션이 아닐 가능성"을 거르는 단계가 필요하다. 이 Triage 레이어가:
- 별도 테이블 / 별도 질문 세트가 될지
- 7.2(케이스 생성)와 7.3(증상 선택) 사이의 별도 화면이 될지
- 7.3 첫 스크린으로 흡수될지

는 **미확정**. 설계 결정 전에 Claude가 임의로 테이블/라우트를 추가하지 말 것.

---

## 🕐 승인 대기 / 선반영 아이템

대표님 승인 절차를 **구두/이메일로 병행 중인** 변경 사항. Claude Code가
"문서와 코드가 어긋난다"고 판단해 자동 정정하지 말 것.

- ✅ **Case.mileage** (`Int?` nullable) — 2026-04-20 선반영 결정, Week 3
  Claude Code 작업에 포함. 승인 병행 중.
  근거: 주행거리는 재방문 시 달라지는 값이므로 Vehicle이 아닌 Case에
  저장해 진단 시점 스냅샷으로 보존. 장기적으로 "주행거리 구간별 고장 패턴"
  같은 데이터 분석 가능.

- ✅ **L-04 분리 여부** (2026-04-21 해소) — 노션 1번 중분류 최신본에서
  입력축(L-04)/출력축(L-05) 분리 확정. M01 seed 작업에 반영 완료.

- ⏳ **동점 tiebreaker** — 후보 점수 동점 시 `failure_types.sort_order`
  오름차순을 우선순위 규칙으로 사용 권장 (Claude 추천, 승인 대기).

---

## Git 커밋 규칙

- **Author / Co-Author에 Claude를 넣지 말 것.** `Co-Authored-By: Claude ...` 트레일러 추가 금지
- 커밋은 현재 터미널에 로그인된 joey의 git identity로만 작성 (`git config user.name` / `user.email` 그대로 사용)
- `--author` 플래그로 다른 이름을 지정하지 말 것
- 커밋 메시지 본문도 "Generated with Claude Code" 류 서명 없이 순수 변경 내용만

---

## 주차 컨텍스트 (마지막 갱신: 2026-04-21)

> **갱신 룰**: Week 전환 시 이 섹션을 갱신할 것. 오래 방치되면
> Claude Code에게 거짓말이 됨.

- ✅ Week 1 Track B — 레포 세팅, 스키마, Docker
- ✅ Week 2 — 관리자 마스터 데이터 CRUD (현재 이 레포의 대부분)
- ▶ Week 3 — 상담자 앱 인증, 7.1 홈 / 7.2 케이스 생성 화면 (API에 모바일 인증 + 공개 조회 추가 필요)