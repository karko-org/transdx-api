# Step 5e: Mobile API Integration Plan

**작성일**: 2026-04-24
**범위**: 모바일 앱의 Mock 데이터를 실 API로 전환
**소요 예상**: 3.5~4시간 (5e-a가 6 sub-chunks로 확장됨)
- 5e-a: ~100분 (6 sub-chunks)
- 5e-b: 20분
- 5e-c: 20분
- 5e-d: 30분
- 5e-e: 40분
- E2E + 마무리: 15분

---

## Context

### 배경

Week 3 Step 5d 완료 상태:
- 모바일 UI (로그인 / 케이스 목록 / 신규 접수) 3화면 완성
- 현재 모든 데이터가 Mock: `MOCK_CASES` 배열, 하드코딩된 차량 매칭, `"dummy-token-for-testing"` 로그인
- `TODO(5e)` + `MOCKUP` 주석으로 교체 지점 마킹됨

백엔드 현재 상태 (origin/main, 2026-04-24 실측):
- 인증: `/api/admin/login` 작동 (admin 전용)
- 마스터 데이터 CRUD (Week 2 완료)
- M01 seed 완료 (multi-choice answer model)

**Step 5e-a 진입 시 보이지 않던 전제 (실측으로 발견된 drift)**:
- `/api/auth/login`, `/api/auth/me` (counselor) — 미구현
- `requireCounselor` 미들웨어 — 미구현
- `seedCounselorUser` — 미구현
- `Case.mileage` 필드 — CLAUDE.md 선반영 미적용
- `Case.memo` 필드 — 스키마에 없음
- Case 관련 참조명: Plan은 `created_by`, 실제는 `user_id`
- Vehicle.workshop_id — 없음 (차량은 공업사 종속 아님)

이 drift들 전부 5e-a로 스코프 확장하여 처리.

### 의도된 결과

완료 후:
- 로그인이 실 counselor 계정으로 작동 (admin token 거부 확인 유지)
- 케이스 목록이 DB에서 fetch
- 스와이프 삭제가 실 DELETE
- 신규 접수 시 차량 존재 확인 + 케이스 생성 한 번에
- Galaxy S25 실기기에서 전체 플로우 검증 통과

---

## 사용자 결정 사항 (확정)

| 결정 | 선택 |
|------|------|
| 케이스 삭제 | **Hard delete** (실제 row 삭제). 나중 soft delete 전환 가능. |
| 차량 lookup 응답 | **404 없음** (RESTful 표준). 모바일은 404 catch → 신규 차량 플로우. |
| 차량 생성 | **POST /api/cases에 차량 정보 포함**, 백엔드가 Prisma transaction으로 upsert |
| 케이스 필터링 | **백엔드 쿼리 파라미터** (`?status=draft,diagnosed`) |

---

## 5-Chunk 분할

### Chunk 5e-a: 백엔드 케이스 + 차량 CRUD
### Chunk 5e-b: 모바일 API 클라이언트 레이어
### Chunk 5e-c: 로그인 실 연결
### Chunk 5e-d: 케이스 목록 실 연결
### Chunk 5e-e: 신규 접수 실 연결

각 chunk는 **buildable + testable** 단위로 설계. 각 chunk 완료 시 commit + STOP 지점.

---

## Chunk 5e-a: 백엔드 인증 인프라 + 케이스/차량 CRUD

**레포**: `transdx-api`
**소요**: 약 100분 (원 Plan 추정 40~50분의 2배, drift 반영)

6개 sub-chunk로 분할, 각 단독 commit 가능.

### Sub-chunk 5e-a.0: Schema Migration

**파일**: `prisma/schema.prisma`

Case 모델에 2 필드 추가:
- `mileage Int?` (주행거리, nullable, 방문 시점 스냅샷)
- `memo String?` (상담 메모, nullable)

Migration 생성: `prisma migrate diff + migrate deploy` 패턴 
(docs/prisma-migration-workflow.md 참조).

Migration 이름: `add_case_mileage_and_memo`.

커밋 범위:
- `prisma/schema.prisma`
- `prisma/migrations/[timestamp]_add_case_mileage_and_memo/migration.sql`

검증:
- [ ] `npm run db:dev` 성공 (또는 migrate diff 패턴)
- [ ] `npx prisma generate` 성공
- [ ] 타입 에러 없음 (case.mileage, case.memo 접근 가능)

### Sub-chunk 5e-a.1: Counselor Auth 인프라

**파일**:
- `src/plugins/auth.ts` — `requireCounselor` 데코레이터 추가
- `src/routes/counselorAuthRoutes.ts` — 신규
- `src/server.ts` — 라우트 등록

#### requireCounselor 미들웨어

기존 `requireAdmin` 패턴 모방. role ∈ {counselor, manager} 허용. 
admin 토큰 거부.

`request.counselor`에 `{ user_id, workshop_id, role }` 주입.

#### counselorAuthRoutes

- `POST /api/auth/login` — username/password → JWT (role=counselor/manager인 
  user만 허용, 아니면 401)
- `GET /api/auth/me` — token 검증 후 user 반환

JWT payload: `{ user_id, workshop_id, role, type: "counselor" }`.
(admin token과 구분하기 위한 `type` 필드)

#### requireCounselor 검증

- token type이 "counselor"여야 통과
- admin token은 403 반환

검증:
- [ ] `npm run build` 0 errors
- [ ] (Sub-chunk 5e-a.2 완료 후) curl login → token 발급
- [ ] curl /me → user 반환
- [ ] admin token으로 counselor endpoint 접근 → 403

### Sub-chunk 5e-a.2: seedCounselorUser

**파일**:
- `prisma/seeds/users.ts` — `seedCounselorUser()` 추가
- `prisma/seed.ts` — 호출 추가

`.env` 변수: `COUNSELOR_SEED_USERNAME`, `COUNSELOR_SEED_PASSWORD`

Admin workshop에 counselor 역할로 생성. 이미 있으면 password만 갱신.

검증:
- [ ] `npm run db:seed` 성공
- [ ] DB에 counselor user row 생성 확인
- [ ] 5e-a.1의 login curl이 이제 성공

### Sub-chunk 5e-a.3: Cases CRUD

**파일**:
- `src/lib/counselorCases.ts` — 신규
- `src/routes/counselorCaseRoutes.ts` — 신규

기능:
- `listCases(workshopId, { statusFilter })` — 필터링 + 정렬
- `createCaseWithVehicle(input)` — Prisma $transaction, vehicle upsert
- `deleteCase({ caseId, workshopId })` — cascade로 단순 delete

**실측 반영**:
- Vehicle 모델에 `workshop_id` 없음 → upsert에서 제외
- Case 모델 참조명: `user_id`, relation `user` (created_by 아님)
- Cascade 정책: 모든 자식 관계 onDelete: Cascade → 단순 `prisma.case.delete()` OK

API 응답 wrapping: `{ cases: [...] }`, `{ case: {...} }`

### Sub-chunk 5e-a.4: Vehicles Lookup

**파일**:
- `src/lib/counselorVehicles.ts` — 신규
- `src/routes/counselorVehicleRoutes.ts` — 신규

`lookupVehicleByPlate(plateNumber)`:
- 입력 정규화: trim + 공백 제거
- findUnique by plate_number
- 없으면 null → 라우트에서 404

응답 wrapping: `{ vehicle: {...} }`.

### Sub-chunk 5e-a.5: server.ts 등록 + 동적 검증 + commit

**파일**: `src/server.ts` — counselor 라우트 3개 등록
- counselorAuthRoutes
- counselorCaseRoutes  
- counselorVehicleRoutes

동적 검증 (9 curl):
1. counselor login → token
2. POST /api/cases (신규 차량) → 201 + case + vehicle
3. POST /api/cases (기존 차량) → upsert 확인 (같은 vehicle_id)
4. GET /api/cases → 목록
5. GET /api/cases?status=draft → 필터
6. GET /api/vehicles?plate_number=존재 → 200
7. GET /api/vehicles?plate_number=없음 → 404
8. DELETE /api/cases/:id → 200 + DB 확인
9. DELETE /api/cases/99999 → 404

검증 통과 시 5e-a 전체 구현 완료 commit.

---

## Chunk 5e-b: 모바일 API 클라이언트 레이어

**레포**: `transdx-mobile`
**소요**: 20분

### 목적

모든 화면이 공유할 **HTTP 클라이언트 추상화**. 목적:
- API base URL 단일 지점 관리
- Auth token 자동 첨부
- Error handling 통일 (401 → 로그아웃 트리거)
- Response wrapping 컨벤션 처리

### 신규 파일

`lib/api.ts`

```typescript
// Config
const API_BASE_URL = __DEV__ 
  ? "http://192.168.X.X:3000"  // 개발 중 joey 로컬 IP
  : "https://api.kar.kr";       // 프로덕션 (미래)

// Types
type ApiError = {
  status: number;
  message: string;
};

// Core fetch wrapper
async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token, headers, ...rest } = options;
  
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw {
      status: response.status,
      message: body.message ?? `HTTP ${response.status}`,
    } as ApiError;
  }
  
  return response.json();
}

// Typed API methods
export const api = {
  auth: {
    login: (username: string, password: string) =>
      apiFetch<{ token: string; user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }),
    me: (token: string) =>
      apiFetch<{ user: User }>("/api/auth/me", { token }),
  },
  cases: {
    list: (token: string, status?: string[]) =>
      apiFetch<{ cases: Case[] }>(
        `/api/cases${status?.length ? `?status=${status.join(",")}` : ""}`,
        { token }
      ),
    create: (token: string, input: CreateCaseInput) =>
      apiFetch<{ case: Case }>("/api/cases", {
        method: "POST",
        token,
        body: JSON.stringify(input),
      }),
    delete: (token: string, id: number) =>
      apiFetch<{ success: boolean }>(`/api/cases/${id}`, {
        method: "DELETE",
        token,
      }),
  },
  vehicles: {
    lookup: (token: string, plateNumber: string) =>
      apiFetch<{ vehicle: Vehicle } | null>(
        `/api/vehicles?plate_number=${encodeURIComponent(plateNumber)}`,
        { token }
      ).catch((err: ApiError) => {
        if (err.status === 404) return null;
        throw err;
      }),
  },
};

// Types (Case, Vehicle, User, CreateCaseInput)
export type Case = { ... };
export type Vehicle = { ... };
export type User = { ... };
export type CreateCaseInput = { ... };
```

### 설계 상세

#### API_BASE_URL 관리

- 개발: joey 맥의 로컬 IP (Expo Go → 같은 WiFi의 맥으로 접속)
- 실측 필요: `ifconfig | grep "inet "` 으로 joey 맥 IP 확인
- `.env` 파일? Expo는 `process.env.EXPO_PUBLIC_*` 지원
- 일단 상수로 시작, 필요 시 환경변수로 전환

#### Error 타입

- `ApiError` throw로 통일
- 각 화면에서 `try/catch`로 처리
- 401 처리: 토큰 만료 → authContext.signOut() 호출 → 로그인 화면으로

#### Response Shape

백엔드 컨벤션 따름: `{ cases: [...] }`, `{ case: {...} }`, `{ vehicle: {...} }` 등 wrapped.

### 검증 기준

- [ ] `lib/api.ts` 작성 완료
- [ ] Types export 확인
- [ ] `npx tsc --noEmit` 0 errors
- [ ] API_BASE_URL 개발용 IP 정확
- [ ] 테스트: `api.auth.login("testuser", "testpass")` 호출 시도
  - (counselor 계정은 5e-a.2에서 seed됨 — 해당 sub-chunk 선행 완료 필수)

### 전제: Counselor Seed (5e-a.2에서 보장됨)

모바일 로그인 테스트를 위해 counselor 계정 필요. 
5e-a.2에서 `seedCounselorUser` 구현 + `prisma/seed.ts` 파이프라인 
등록 완료. `.env`의 `COUNSELOR_SEED_USERNAME / PASSWORD`로 로그인 가능.

(이전 초안에서는 이것이 "조건부 chunk 5e-a.5"였으나, 2026-04-24 drift 
실측에서 필수 항목으로 승격됨.)

### 커밋

```
feat(mobile): add API client layer with typed methods

HTTP client abstraction (lib/api.ts) for all screens to share:
- Centralized API_BASE_URL configuration
- Automatic Authorization header injection when token provided
- Typed methods for all counselor endpoints (auth, cases, vehicles)
- ApiError throwing with status + message
- 404 handling for vehicle lookup (returns null instead of throw)

Preparation for Step 5e screen integration (5e-c onward).
```

---

## Chunk 5e-c: 로그인 실 연결

**레포**: `transdx-mobile`
**소요**: 20분

### 작업

`app/(auth)/login.tsx`:

```typescript
// BEFORE (현재 MOCKUP)
const handleLogin = async () => {
  await signIn("dummy-token-for-testing");
  router.replace("/(app)");
};

// AFTER
const handleLogin = async () => {
  setLoading(true);
  setError(null);
  try {
    const response = await api.auth.login(username, password);
    await signIn(response.token);
    router.replace("/(app)");
  } catch (err: any) {
    if (err.status === 401) {
      setError("아이디 또는 비밀번호가 올바르지 않습니다.");
    } else {
      setError("로그인 중 오류가 발생했습니다.");
    }
  } finally {
    setLoading(false);
  }
};
```

### 추가 고려

**AuthContext 확장**:
- 현재 `signIn(token)`만 받음
- user 정보도 저장할지? (name, role 등)
- 선택: signIn에 token + user 둘 다 받도록 시그니처 확장
- 또는: signIn 후 `api.auth.me()` 호출로 user 가져오기

**제안**: login 응답에 이미 user 객체 포함됨 → `signIn(token, user)` 확장.

`lib/authContext.tsx` 수정:
```typescript
type AuthState = {
  token: string | null;
  user: User | null;
};

signIn: (token: string, user: User) => Promise<void>;
```

### 검증 기준

- [ ] `npx tsc --noEmit` 0 errors
- [ ] 실기기 (S25):
  - [ ] 틀린 비밀번호 → 에러 메시지 표시
  - [ ] 올바른 counselor 계정 → 로그인 성공, 목록 화면 전환
  - [ ] admin 계정 → 401 (requireCounselor 미들웨어 작동 확인)

### 커밋

```
feat(mobile): connect login screen to real /api/auth/login

Replaces dummy token with actual counselor authentication flow.
- On 401: show user-friendly error message
- On success: store token + user in AuthContext, navigate to app
- admin accounts correctly rejected (requireCounselor enforced server-side)

TODO(5e) markers in login.tsx resolved.
```

---

## Chunk 5e-d: 케이스 목록 실 연결

**레포**: `transdx-mobile`
**소요**: 30분

### 작업

`app/(app)/index.tsx`:

```typescript
// BEFORE (현재 MOCKUP)
const [cases, setCases] = useState<CaseItem[]>(MOCK_CASES);

// AFTER
const [cases, setCases] = useState<CaseItem[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const { token } = useAuth();

useEffect(() => {
  loadCases();
}, [activeFilter]);

const loadCases = async () => {
  if (!token) return;
  setLoading(true);
  setError(null);
  try {
    const statusFilter = 
      activeFilter === "진행 중" ? ["draft", "diagnosed"] :
      activeFilter === "완료" ? ["quoted", "completed"] :
      undefined;
    const response = await api.cases.list(token, statusFilter);
    setCases(response.cases);
  } catch (err: any) {
    setError("케이스를 불러올 수 없습니다.");
  } finally {
    setLoading(false);
  }
};

const handleDelete = async (caseId: number) => {
  // optimistic UI
  setCases(prev => prev.filter(c => c.id !== caseId));
  try {
    await api.cases.delete(token!, caseId);
  } catch (err) {
    // rollback: 다시 fetch
    loadCases();
    Alert.alert("삭제 실패", "다시 시도해주세요.");
  }
};
```

### UX 고려

- **Pull-to-refresh**: RefreshControl 추가? (옵션)
- **Optimistic delete**: 즉시 UI 업데이트 + 실패 시 rollback
- **Loading state**: 첫 로드 시 스피너
- **Empty state**: 이미 `EmptyState` 컴포넌트 있음, error 상태 구분 필요

### 검증 기준

- [ ] `npx tsc --noEmit` 0 errors
- [ ] 실기기 (S25):
  - [ ] 첫 진입 시 케이스 fetch
  - [ ] 필터 탭 전환 시 재fetch
  - [ ] 스와이프 삭제 → 즉시 사라짐 + DB에서도 삭제 확인 (Prisma Studio)
  - [ ] 네트워크 차단 상태 → 에러 처리 확인

### 커밋

```
feat(mobile): connect case list to real /api/cases

Replaces MOCK_CASES with real fetch from backend:
- Initial load on mount
- Re-fetch on filter tab change (status query parameter)
- Optimistic UI for swipe-delete with rollback on failure
- Error state display when fetch fails

TODO(5e) markers in (app)/index.tsx resolved.
```

---

## Chunk 5e-e: 신규 접수 실 연결

**레포**: `transdx-mobile`
**소요**: 40분

### 작업

`app/(app)/cases/new.tsx`:

```typescript
// 차량번호 lookup (plate_number 입력 후 debounce)
useEffect(() => {
  if (plateNumber.length < 4) return;
  const timer = setTimeout(async () => {
    try {
      const result = await api.vehicles.lookup(token!, plateNumber);
      if (result) {
        setVehicle(result.vehicle);
        setCustomerName(result.vehicle.customer_name ?? "");
        setCustomerPhone(result.vehicle.customer_phone ?? "");
        setIsExistingVehicle(true);
      } else {
        setVehicle(null);
        setIsExistingVehicle(false);
      }
    } catch (err) {
      // lookup 실패는 silent — 입력 계속
    }
  }, 400);
  return () => clearTimeout(timer);
}, [plateNumber, token]);

// 제출
const handleSubmit = async () => {
  if (!canSubmit || !token) return;
  setSubmitting(true);
  try {
    await api.cases.create(token, {
      plate_number: plateNumber,
      customer_name: customerName || undefined,
      customer_phone: customerPhone || undefined,
      mileage: mileage ? parseInt(mileage.replace(/,/g, ""), 10) : undefined,
      memo: memo || undefined,
    });
    router.back();
  } catch (err) {
    Alert.alert("케이스 생성 실패", "다시 시도해주세요.");
  } finally {
    setSubmitting(false);
  }
};
```

### UX 고려

- **Debounce lookup**: 타이핑 중 API 호출 방지 (400ms)
- **최소 길이**: 4자 미만이면 lookup 안 함
- **Submit 중 버튼 비활성화**: 중복 submit 방지
- **router.back()** 후 목록 refetch: 목록 화면의 focus listener 활용 또는 navigation params

### 검증 기준

- [ ] `npx tsc --noEmit` 0 errors
- [ ] 실기기 (S25):
  - [ ] 기존 차량번호 입력 → 자동채움 동작
  - [ ] 신규 차량번호 입력 → 빈 상태 유지 + 수동 입력
  - [ ] 제출 → 케이스 생성 + 목록으로 돌아가기
  - [ ] 목록에 신규 케이스 표시됨 (목록 refetch 확인)
  - [ ] 중복 submit 방지 확인 (버튼 비활성화)

### 커밋

```
feat(mobile): connect new case flow to real endpoints

Replaces mock matching and router.back() with real API calls:
- Plate number lookup: 400ms debounce, /api/vehicles GET
  - 200 + vehicle → auto-fill customer fields
  - 404 (null) → fresh entry mode
- Submit: /api/cases POST with vehicle upsert handled server-side
- Error handling: alert on failure with retry option
- Submit button disabled during in-flight request (no duplicate submits)

TODO(5e) markers in cases/new.tsx resolved.
Step 5e complete.
```

---

## 최종 E2E 검증 (5e-e 후)

전체 플로우 실기기 테스트:

1. 앱 시작 → 로그인 화면
2. counselor 계정 로그인 → 목록 화면
3. 목록 비어있음 (첫 사용자)
4. FAB → 신규 접수 화면
5. 차량번호 입력 (신규) → 빈 상태 유지
6. 고객 정보 + 주행거리 + 메모 입력
7. 제출 → 목록으로
8. 목록에 새 케이스 표시
9. FAB → 신규 접수
10. 같은 차량번호 입력 → 자동채움 작동
11. 다른 주행거리로 제출 → 목록에 2개
12. 첫 번째 케이스 스와이프 삭제 → 사라짐
13. 앱 재시작 → 목록에 1개만 유지 (서버 sync 확인)

### 최종 commit (옵션)

```
docs(api): mark Step 5e complete, Week 3 Track B unblocked

All Step 5e sub-chunks verified:
- 5e-a: cases/vehicles CRUD
- 5e-b: mobile API client layer
- 5e-c: real login
- 5e-d: real case list
- 5e-e: real new case flow

E2E verified on Galaxy S25 (Expo Go).
Week 3 completion criteria met: login → list → new case flow working
end-to-end against real backend.

Next: Week 3 진단 데이터 검증 (대표님 세션) 또는 Week 4 착수.
```

---

## 중간 STOP 지점

각 chunk 완료 시 필수 STOP:

- **5e-a 후**: 집중력 체크. 피곤하면 여기서 중단 (백엔드만으로도 의미 있는 마일스톤).
- **5e-b 후**: API 클라이언트 레이어 작동 확인 후 로그인 실 연결 진입.
- **5e-c 후**: 로그인 실 작동 감동 🎉 나머지 2단계 진행 가능한지 판단.
- **5e-e 후**: E2E 전체 검증 + 최종 commit.

---

## 실패 시나리오 대응

### 5e-a에서 Prisma transaction 복잡
→ 첫 구현은 단순하게 (연속 await). 작동 확인 후 $transaction으로 wrap.

### 5e-b에서 API_BASE_URL 접속 안 됨
→ 맥의 방화벽? Expo와 같은 WiFi 확인. `curl` 맥 IP로 테스트.

### 5e-c에서 counselor 로그인 실패
→ 5e-a.2의 seed 실행 성공 여부 확인. 다음 순서로 디버깅:
1. DB 확인: `SELECT * FROM users WHERE role='counselor';` (0 rows면 seed 미적용)
2. `.env`의 `COUNSELOR_SEED_USERNAME/PASSWORD` 존재 확인
3. 필요 시 `npm run db:seed` 재실행
4. 해시 비교 실패라면 비밀번호 재설정 (seed 재실행으로 upsert됨)

### 5e-d에서 date 필드 파싱 이슈
→ Prisma가 반환하는 DateTime은 ISO string. 모바일에서 Date 객체로 변환 필요 시 처리.

### 5e-e에서 키보드/스크롤 버그 재발
→ 이미 Step 5d에서 해결된 패턴 재적용. 새 버그면 Phase 내에서 즉시 해결 (Step 5d 원칙).

### Plan에 없는 drift 추가 발견 시
→ STOP + 보고. Plan 업데이트 commit 먼저 한 뒤 진행. 
이번 세션(2026-04-24)에서 7건 drift 발견 패턴.

---

## 완주 조건 (Week 3 Track B)

- [ ] 5 chunks 모두 commit됨
- [ ] 실기기 E2E 13단계 전부 통과
- [ ] `grep -rn "TODO(5e)" app/` 결과 0건
- [ ] `grep -rn "MOCKUP" app/` 결과 0건 (또는 의도적으로 남은 것만)
- [ ] 백엔드 `npm run build` 0 errors
- [ ] 모바일 `npx tsc --noEmit` 0 errors
- [ ] CLAUDE.md의 선반영 사항(Case.mileage, counselor auth) 실제 구현과 정합
- [ ] schema.prisma에 Case.mileage, Case.memo 실존
- [ ] seedCounselorUser가 prisma/seed.ts 파이프라인에 등록
- [ ] `/api/auth/login`, `/api/auth/me` curl 테스트 통과

---

## 범위 외

- **Case status 전환 UI** (draft → diagnosed 등): Week 4 진단 엔진에서
- **진단 실행** (diagnosis_runs 생성): Week 4
- **견적 생성**: Week 5
- **PDF 발행**: Week 6
- **오프라인 지원**: Week 8+
- **Pull-to-refresh**: 이번 스코프에선 생략 (간단한 useEffect dependency로 충분)
