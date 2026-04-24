# Prisma Migration 워크플로

## 배경

Claude Code의 Bash 도구는 **non-interactive 환경**이라
`prisma migrate dev`의 TTY confirmation(특히 destructive 변경 시,
컬럼 drop·타입 변경 등)을 처리할 수 없음. 이 제약을 우회하는
표준 절차를 정의한다.

## 표준 절차

### 일반 경우 (파괴적 변경 없음)

`prisma migrate dev`가 TTY confirmation 없이 통과하는 경우:

```bash
npm run db:dev
```

### 파괴적 변경 포함 (권장 패턴)

컬럼 drop, 타입 변경, unique key 변경 등 Prisma가 TTY 확인을 요구하는
경우:

```bash
# 1) DB 초기화 (dev 전용, 데이터 손실 OK 환경)
npm run db:reset

# 2) migration 디렉토리 준비
MIGRATION_NAME="descriptive_name_here"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
MIGRATION_DIR="prisma/migrations/${TIMESTAMP}_${MIGRATION_NAME}"
mkdir -p "$MIGRATION_DIR"

# 3) migration SQL 자동 생성 (Prisma 7.5 검증됨)
npx prisma migrate diff \
  --from-config-datasource \
  --to-schema prisma/schema.prisma \
  --script > "$MIGRATION_DIR/migration.sql"

# 4) migration 적용
npx prisma migrate deploy

# 5) Prisma Client 재생성
npx prisma generate
```

## 명령 옵션 해석

| 옵션 | 의미 |
|------|------|
| `--from-config-datasource` | datasource URL이 가리키는 **현재 DB 상태**에서 diff 시작. **인수 없는 플래그** (값 받지 않음) |
| `--to-schema <path>` | 변경 후 목표 스키마 파일 경로 (Prisma 7에서 `--to-schema-datamodel` 대체) |
| `--script` | SQL 스크립트로 출력 (summary 대신) |

## 주의사항

- 이 절차는 **dev 전용** (DB 데이터 손실 OK 전제)
- prod DB에는 `migrate deploy`만 사용 (migration 파일은 이미 존재해야 함)
- migration 파일 커밋은 **schema 변경과 같은 커밋**에 포함
- `--from-empty`는 쓰지 말 것 — 전체 CREATE만 생성하므로 두 번째
  마이그레이션부터 작동 안 함 (incremental diff 안 함)
- `--from-config-datasource`는 **인수를 받지 않는 플래그**.
  뒤에 경로를 붙이면 Prisma가 positional 인수로 해석해 거부할 수 있음
- Prisma 버전 업그레이드 시 옵션 이름 재검증
  (`--to-schema-datamodel` 같은 옛 이름이 잔존한 문서·스니펫 주의)

## 사전 조건

- DB가 **직전 migration 적용 상태**여야 함 (db:reset 후에는 모든 기존
  migration을 `migrate deploy`로 먼저 적용한 뒤 `migrate diff` 실행).
  그래야 diff가 "직전 상태 → 새 schema" 차분만 출력
- `prisma.config.ts`의 `datasource.url` env가 정상 로드되어야 함 (`.env`)

## 이력

- 2026-04-24: 최초 작성. multi-choice answers migration
  (commit `4f2371a`) 실행 시 검증됨. Prisma 7.5.0 환경.
