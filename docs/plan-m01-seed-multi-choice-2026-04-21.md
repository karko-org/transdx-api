# M01 Seed 다지선다·효과 룰 도입 Plan (2026-04-21 노션 확정본 반영)

> **출처**: `/Users/joey/.claude/plans/transdx-api-prisma-seeds-lucky-phoenix.md` (joey 승인본, 2026-04-24)
> **레포 동기화 시점**: 2026-04-24
> **참조 문서**: 노션 `transdx-documents > Cluade 고장진단 Table > 1. 중분류_ 변속기 오일 누유` (2026-04-21 최신본)

---

## Context

**왜 이 변경이 필요한가**
transdx-api의 변속기 고장진단 데이터는 외부 문서(노션 `transdx-documents > Cluade 고장진단 Table > 1. 중분류_ 변속기 오일 누유`, 2026-04-21 최신본)를 single source of truth로 삼는다. 1번 중분류 "변속기 오일 누유"의 정의가 새로 확정되었고, 현재 seed/스키마는 그 새 데이터 모델을 표현하지 못한다.

**현 데이터와의 핵심 차이**
- 답변 형식이 Boolean → **다지선다(예/아니오/모름, 소량/다량/모름)** 로 일반화됨. 현 `DiagnosisRule.expected_answer: Boolean`로는 표현 불가.
- "모름" 답변 도입 — 답변은 가능하되 점수 영향이 없는 옵션이 필요함.
- 새 효과 종류 두 가지 도입: **증상 신뢰도 점수**(예: Q-L12 "아니오" → 변속기 오일 누유 증상 자체 신뢰도 -3)와 **플래그**(예: Q-L03 "다량" → `심화누유=true`).
- Failure type 재구성: L-04/L-05 명칭 정밀화, L-06/L-07 의미 swap, **L-08(오버플로우/레벨/브리더) 신규**.
- Question 재구성: **Q-L05 삭제**, 기존 `Q-L03a/Q-L03b`를 다지선다 `Q-L03`으로 통합, **Q-L10/Q-L11/Q-L12 신규**.

**전제**
- 기존 DB는 테스트용 → **DROP & re-migrate & re-seed** 가능.
- 점수 합산 런타임은 아직 미구현 → 소비자 코드가 없어 schema 확장 부담이 작음. 이 시점이 적기.
- 12개 중분류 중 1번만 데이터 확정. 나머지 11개(2~12번)는 작업중이므로 `Symptom` 행만 두고 `FailureType`/`Question`/룰은 만들지 않는다 (현재 정책 유지).
- CLAUDE.md의 "질문은 Boolean Yes/No만. 다지선다 도입 금지" 원칙은 **이번 변경으로 공식 폐기**. 동일 커밋에서 CLAUDE.md도 함께 갱신.

**의도된 결과**
- 노션 1번 중분류의 데이터가 손실 없이 DB에 재현됨.
- 추후 점수 합산 런타임을 한 번에 깔끔하게 짤 수 있는 스키마 기반 마련.
- M02~M12 작업 시 같은 패턴(answer_option / effect_rule / flag) 재사용 가능.

---

## 사용자 결정 사항 (확정)

| 결정 | 선택 |
|---|---|
| 스키마 옵션 | **옵션 C (절충안)** — `QuestionAnswerOption` + `DiagnosisEffectRule` + `DiagnosisRunFlag` 신규, `DiagnosisRule`은 점수 룰만 담당 |
| Q-L12 "예" 처리 | **단순 no-op** — 누유 증상 확정 의미. 별도 룰 없이 다른 룰들이 정상 작동 |
| "모름" 답변 저장 | **행 생성 + `is_scoring=false`** — 답변 이력 보존, 룰 매칭 자동 skip으로 점수 영향 0 |

---

## 1. 스키마 변경 (옵션 C)

파일: `prisma/schema.prisma`

### 신규 모델 3개

```prisma
model QuestionAnswerOption {
  id          Int      @id @default(autoincrement())
  question_id Int
  value       String   @db.VarChar(30)   // "yes" | "no" | "unknown" | "low" | "high"
  label       String   @db.VarChar(50)   // "예" | "아니오" | "모름" | "소량" | "다량"
  sort_order  Int      @default(0)
  is_scoring  Boolean  @default(true)    // false면 점수 룰 매칭 skip ("모름")
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  question                Question               @relation(fields: [question_id], references: [id], onDelete: Cascade)
  diagnosis_rules         DiagnosisRule[]
  diagnosis_effect_rules  DiagnosisEffectRule[]
  case_question_answers   CaseQuestionAnswer[]

  @@unique([question_id, value])
  @@map("question_answer_options")
}

model DiagnosisEffectRule {
  id                       Int      @id @default(autoincrement())
  symptom_question_id      Int
  answer_option_id         Int
  effect_type              String   @db.VarChar(30)   // "symptom_confidence" | "flag"
  symptom_confidence_delta Int?
  flag_key                 String?  @db.VarChar(50)   // "deep_leak" | "non_atf_leak_check"
  flag_value               Boolean?
  explanation              String?  @db.Text
  is_active                Boolean  @default(true)
  created_at               DateTime @default(now())
  updated_at               DateTime @updatedAt

  symptom_question SymptomQuestion      @relation(fields: [symptom_question_id], references: [id])
  answer_option    QuestionAnswerOption @relation(fields: [answer_option_id], references: [id])

  @@unique([symptom_question_id, answer_option_id, effect_type, flag_key])
  @@map("diagnosis_effect_rules")
}

model DiagnosisRunFlag {
  id               Int     @id @default(autoincrement())
  diagnosis_run_id Int
  flag_key         String  @db.VarChar(50)
  flag_value       Boolean

  diagnosis_run DiagnosisRun @relation(fields: [diagnosis_run_id], references: [id], onDelete: Cascade)

  @@unique([diagnosis_run_id, flag_key])
  @@map("diagnosis_run_flags")
}
```

### 기존 모델 변경

```prisma
model Question {
  // ...기존 유지
+ answer_format String @default("yes_no_unknown") @db.VarChar(30)  // "yes_no_unknown" | "yes_no" | "low_high_unknown"
+ answer_options QuestionAnswerOption[]
}

model SymptomQuestion {
  // ...기존 유지
+ diagnosis_effect_rules DiagnosisEffectRule[]
}

model DiagnosisRule {
  id                  Int      @id @default(autoincrement())
  failure_type_id     Int
  symptom_question_id Int
- expected_answer     Boolean
+ answer_option_id    Int
  score_delta         Int      @default(0)
  // ...

  failure_type     FailureType          @relation(fields: [failure_type_id], references: [id])
  symptom_question SymptomQuestion      @relation(fields: [symptom_question_id], references: [id])
+ answer_option    QuestionAnswerOption @relation(fields: [answer_option_id], references: [id])

- @@unique([symptom_question_id, failure_type_id, expected_answer])
+ @@unique([symptom_question_id, failure_type_id, answer_option_id])
  @@map("diagnosis_rules")
}

model CaseQuestionAnswer {
  id          Int @id @default(autoincrement())
  case_id     Int
  question_id Int
- answer      Boolean
+ answer_option_id Int

  case_rel       Case                 @relation(fields: [case_id], references: [id], onDelete: Cascade)
  question       Question             @relation(fields: [question_id], references: [id])
+ answer_option  QuestionAnswerOption @relation(fields: [answer_option_id], references: [id])
}

model DiagnosisRun {
  // ...기존 유지
+ symptom_confidence_score Int @default(0)
+ flags DiagnosisRunFlag[]
}
```

---

## 2. Seed 파일 재구조화

| 파일 | 액션 | 내용 |
|---|---|---|
| `prisma/seeds/symptomCategories.ts` | 변경 없음 | 4개 카테고리 그대로 |
| `prisma/seeds/symptoms.ts` | 변경 없음 | 12개 증상 그대로 (1번 = "변속기 오일 누유") |
| `prisma/seeds/failureTypes.ts` | 수정 | L-04/L-05 명칭 정밀화, L-06/L-07 의미 swap, **L-08 신규**. DB reset 전제이므로 코드 재할당 OK. 노션과 1:1 일치하는 새 정의로 교체 |
| `prisma/seeds/answerOptions.ts` | **신규** | Q-L01~Q-L12 각 질문별 answer option 생성 (yes/no/unknown 또는 low/high/unknown 또는 yes/no) |
| `prisma/seeds/questions.ts` | 수정 | `Q-L03a/Q-L03b` 삭제, 통합 `Q-L03` 신규. `Q-L05` 삭제. **Q-L10/Q-L11/Q-L12 신규**. 각 Question에 `answer_format` 부여. `removedQuestionCodes`에 `["Q-L03a","Q-L03b","Q-L05"]` 추가. SymptomQuestion 링크 sort_order 재정렬 |
| `prisma/seeds/diagnosisRules.ts` | 재작성 | 형식 변경: `expectedAnswer: boolean` → `answerValue: string`. 노션 4-1 매핑표 그대로 옮김 (Q-L01~Q-L12, Q-L05 제외). 모름 답변 룰은 만들지 않음 |
| `prisma/seeds/diagnosisEffectRules.ts` | **신규** | Q-L03 "high" → flag `deep_leak=true`, Q-L12 "no" → symptom_confidence_delta -3 + flag `non_atf_leak_check=true` |
| `prisma/seeds/users.ts` | 변경 없음 | admin 계정 그대로 |
| `prisma/seed.ts` | 수정 | 호출 순서: symptomCategories → symptoms → failureTypes → questions → **answerOptions** → diagnosisRules → **diagnosisEffectRules** → adminUser |

### Seed 데이터 정의 (노션 1번 중분류 최신본 기준)

**FailureType (L-01~L-08)**
| code | display_name | description |
|---|---|---|
| L-01 | 오일팬 가스켓 / 누유 | 하부 팬 접합면 누유 |
| L-02 | 드레인 플러그·와셔 / 누유 | 플러그 체결부, 와셔 손상 |
| L-03 | 오일쿨러 라인·호스 / 누유 | 변속기-라디에이터 간 ATF 쿨러 배관·플레어·크림프 피팅부 누유 |
| L-04 | 입력축·토크컨버터 프론트 펌프 씰 / 누유 | 엔진-변속기 결합부 전면 씰 열화 |
| L-05 | 출력축·테일하우징 씰 / 누유 | 후륜·4륜 차량 후면부 누유 |
| L-06 | 케이스 접합부·사이드 커버·밸브바디 커버 / 누유 | 케이스 분할면, 솔레노이드·밸브바디 커버 가스켓 누유 |
| L-07 | 하네스 커넥터 씰(관통부) / 누유 | 외부 전기 커넥터 관통부 O-링 손상 |
| L-08 | 오버플로우·레벨 점검부·브리더(벤트) / 누유 | 레벨 플러그·딥스틱·브리더 체크밸브 막힘 압력 누유 |

**Question (Q-L01~Q-L12, Q-L05 결번)**
- Q-L01, Q-L02, Q-L04, Q-L06, Q-L08, Q-L09, Q-L10, Q-L11, Q-L12 → `answer_format = "yes_no_unknown"`
- Q-L03 → `answer_format = "low_high_unknown"`
- Q-L07 → `answer_format = "yes_no"`

**DiagnosisRule (점수 룰)** — 노션 4-1 매핑표 1:1 복제
- Q-L01 yes → L-01 +3, L-02 +2, L-06 +1
- Q-L01 no → L-01 -1, L-02 -1
- Q-L02 yes → L-03 +4 / no → L-03 -2
- Q-L03 low → L-01 +1, L-02 +2, L-07 +1, L-08 +1
- Q-L03 high → L-03 +2, L-04 +2, L-05 +2, L-06 +2
- Q-L04 yes → L-02 +3, L-08 +3, L-01 +1
- Q-L06 yes → L-04 +3, L-05 +3 / no → L-04 -1, L-05 -1
- Q-L07 yes → L-06 +2, L-07 +2, L-01 +1, L-08 +1
- Q-L08 yes → L-01 +1, L-04 +2, L-05 +2, L-06 +1
- Q-L09 yes → L-07 +4
- Q-L10 yes → L-04 +4 / no → L-04 -1
- Q-L11 yes → L-05 +4 / no → L-05 -1

**DiagnosisEffectRule (효과 룰)**
- Q-L03 high → flag `deep_leak = true` (심화누유 표시)
- Q-L12 no → symptom_confidence_delta = -3 (증상 자체 신뢰도 차감)
- Q-L12 no → flag `non_atf_leak_check = true` (타 계통 누유 확인 권고)

---

## 3. 앱 코드 변경 (lib/routes)

### 수정 파일
- `src/lib/adminMasterDiagnosisRules.ts` — `expected_answer` → `answer_option_id`. `findDuplicateDiagnosisRule`, `serializeDiagnosisRule` (include에 `answer_option { value, label }` 추가)
- `src/lib/adminMasterQuestions.ts` — Question CRUD에 `answer_format`, `answer_options` 추가. `createQuestionAndLinkToSymptom` 헬퍼에서 `answer_format` 기본값일 때 자동 옵션 생성
- `src/routes/adminMasterSymptomRoutes.ts` — `diagnosisRuleCreateSchema/UpdateSchema`: `expected_answer: z.boolean()` → `answer_option_id: z.number().int().positive()`. `createQuestionLinkSchema.create_new` 분기에 `answer_format`/`answer_options` 추가

### 신규 파일
- `src/lib/adminMasterAnswerOptions.ts` — list/create/update/delete + serialize. 삭제 가드: `_count.diagnosis_rules > 0 || _count.case_question_answers > 0`이면 409
- `src/lib/adminMasterEffectRules.ts` — list/create/update/delete + serialize
- (선택) `src/routes/adminMasterAnswerOptionRoutes.ts`, `src/routes/adminMasterEffectRuleRoutes.ts` — 새 라우트 묶기. 또는 기존 `adminMasterSymptomRoutes.ts`에 합쳐도 됨

### 추가될 라우트 (관리자 콘솔용)
```
GET    /api/admin/master/questions/:id/answer-options
POST   /api/admin/master/questions/:id/answer-options
PUT    /api/admin/master/answer-options/:id
DELETE /api/admin/master/answer-options/:id

GET    /api/admin/master/symptoms/:id/effect-rules
POST   /api/admin/master/effect-rules
PUT    /api/admin/master/effect-rules/:id
DELETE /api/admin/master/effect-rules/:id
```

### 영향 없음
- `src/lib/adminMasterFailureTypes.ts` — failure type 자체 구조 변화 없음 (개수만 7→8)
- `src/lib/adminMasterSymptomCategories.ts`, `src/lib/adminMasterSymptoms.ts` — 변화 없음
- `src/lib/adminWorkshops.ts`, `src/lib/adminWorkshopUsers.ts`, `src/lib/adminAuth.ts` — 변화 없음

### CLAUDE.md
- `transdx-api/CLAUDE.md` — "질문은 Boolean Yes/No만. 다지선다 도입 금지" 원칙 삭제. unique 키 갱신. 새 모델 3개 (`QuestionAnswerOption`, `DiagnosisEffectRule`, `DiagnosisRunFlag`) 데이터 모델 섹션에 추가. M01 TBD 항목 중 해소된 것 정리. **동일 커밋에 묶는다.**

---

## 4. 마이그레이션 실행 절차

```bash
cd /Users/joey/Desktop/work/transdx/transdx-api

# 0) 변경 작업 (schema.prisma + seed 파일 + lib/routes 수정)

# 1) DB 완전 초기화
npm run db:reset

# 2) 새 마이그레이션 생성 + 적용
npm run db:dev
# 마이그레이션 이름 프롬프트: multi_choice_answers_and_effect_rules

# 3) seed 실행
npm run db:seed

# 4) Prisma Studio로 검증
npm run db:studio
```

만약 `prisma migrate dev`가 데이터 손실 경고를 띄우면 reset 직후라 비어있는 게 정상이므로 그대로 진행.

---

## 5. 검증 (End-to-End)

### A. Seed 무결성
- `npm run db:seed` 무에러 완료
- Prisma Studio에서:
  - `symptom_categories`: 4행 (변경 없음)
  - `symptoms`: 12행 (변경 없음, 1번 = "변속기 오일 누유")
  - `failure_types`: 8행 (L-01~L-08, 새 display_name 일치)
  - `questions`: 11행 (Q-L01, L02, L03, L04, L06, L07, L08, L09, L10, L11, L12 — Q-L05 결번)
  - `question_answer_options`:
    - yes_no_unknown 질문 9개 × 3 = 27행
    - low_high_unknown (Q-L03) × 3 = 3행
    - yes_no (Q-L07) × 2 = 2행
    - **합계 32행**
  - `symptom_questions`: 11행 (변속기 오일 누유 ↔ Q-L01~Q-L12 except Q-L05)
  - `diagnosis_rules`: 점수 룰 합계 약 26행 (위 매핑표 카운트와 일치)
  - `diagnosis_effect_rules`: 3행 (Q-L03 high deep_leak, Q-L12 no confidence -3, Q-L12 no non_atf_leak_check)

### B. 재실행 안전성 (Idempotent)
- `npm run db:seed` 두 번 연속 실행 → 동일 결과, 중복 없음

### C. API 동작
- `npm run dev` 후:
  - `GET /api/admin/master/questions` → `answer_format`, `answer_options` 포함
  - `GET /api/admin/master/symptoms/1/diagnosis-rules` → `answer_option { value, label }` 포함
  - `GET /api/admin/master/symptoms/1/effect-rules` (신규) → 3행 반환
  - `POST /api/admin/master/effect-rules` (신규) → 검증 통과 후 생성

### D. 타입 컴파일
- `npm run build` 무에러 (Prisma 타입 변경에 따른 lib/routes 수정 누락 검출)

---

## 6. M02~M12 추가 시 확장성 (스키마 변경 없이 가능)

옵션 C 스키마는 **추가 마이그레이션 없이** 나머지 11개 중분류를 동일 패턴으로 받을 수 있도록 설계됨. 각 중분류 확정 시 작업은 seed 파일에 행을 push하는 것뿐.

### 반복 패턴 (중분류 1개 추가 시)

1. **`failureTypes.ts`** — 중분류 전용 코드 prefix로 행 push
   - 예: M02 변속기 과열 → `H-01, H-02, ...` / M04 보호모드 → `K-01, K-02, ...`
   - prefix 작명 규칙은 노션과 합의 필요 (현재 누유=L)
2. **`questions.ts`** — 새 Question 행 push (`Q-H01, Q-H02, ...`), `answer_format` 명시. 삭제될 코드는 `removedQuestionCodes`에 추가
3. **`answerOptions.ts`** — 새 question별 옵션 push. 표준 패턴 3종 (`yes_no_unknown`, `yes_no`, `low_high_unknown`) 재사용. 새 다지선다(예: "약함/보통/강함") 필요 시 새 `answer_format` 키만 정의
4. **`diagnosisRules.ts`** — `{ symptomName, questionCode, answerValue, failureTypeCode, scoreDelta }` 행 push
5. **`diagnosisEffectRules.ts`** — 효과 룰이 있으면 push (없으면 생략)

### 격리 보장
- `failure_types.code`와 `questions.code`가 unique이고 중분류별 prefix로 분리 → **기존 M01 데이터에 영향 없음**
- `DiagnosisRule.@@unique([symptom_question_id, failure_type_id, answer_option_id])`는 중분류별로 자연스럽게 격리됨 (다른 symptom_question_id 사용)

### 추가 마이그레이션이 필요한 경우 (드물지만 명시)
- 노션이 **새로운 effect_type**(예: "조건부 활성화", "다른 증상 점수에 영향")을 도입하면 `DiagnosisEffectRule`에 컬럼 추가 또는 새 모델 검토
- 노션이 **자유 입력 답변**(숫자, 텍스트)을 도입하면 `QuestionAnswerOption` 외에 raw answer 컬럼 필요 — 현재는 객관식만 가정

### 운영 가이드
- 한 중분류 추가 시 PR 단위: `failureTypes + questions + answerOptions + diagnosisRules + diagnosisEffectRules` 같은 커밋 묶음
- DB reset 없이 `npm run db:seed`만으로 반영 가능 (모든 seed 함수가 upsert/idempotent)

---

## 범위 외 (이번 작업에서 제외)

- **점수 합산 런타임 구현** (`src/services/diagnosisRunner.ts`) — 다음 작업 분리. 새 스키마가 이를 위한 기반.
- **관리자 콘솔 UI** (`transdx-admin-console`) — 별도 PR. 새 라우트가 추가되므로 콘솔에서도 answer option / effect rule 폼 필요하지만 이번 범위 밖.
- **M02~M12 중분류 데이터** — 노션에서 작업중. 확정되는 대로 §6 패턴으로 추가.
- **Vehicle/Workshop seed** — 변경 없음.
