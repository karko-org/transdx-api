-- CreateTable
CREATE TABLE "workshops" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "address" VARCHAR(200),
    "phone" VARCHAR(20),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workshops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "workshop_id" INTEGER NOT NULL,
    "login_id" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(200) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'counselor',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" SERIAL NOT NULL,
    "plate_number" VARCHAR(20) NOT NULL,
    "customer_name" VARCHAR(50),
    "customer_phone" VARCHAR(20),
    "manufacturer" VARCHAR(50),
    "model" VARCHAR(50),
    "year" INTEGER,
    "transmission" VARCHAR(50),
    "memo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "failure_types" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "category" VARCHAR(50),
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "failure_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "symptoms" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "category" VARCHAR(50),
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "symptoms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" SERIAL NOT NULL,
    "text" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "symptom_questions" (
    "id" SERIAL NOT NULL,
    "symptom_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,

    CONSTRAINT "symptom_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnosis_rules" (
    "id" SERIAL NOT NULL,
    "failure_type_id" INTEGER NOT NULL,
    "rule_type" VARCHAR(20) NOT NULL,
    "symptom_id" INTEGER,
    "question_id" INTEGER,
    "expected_answer" VARCHAR(10),
    "score_delta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagnosis_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repair_estimate_items" (
    "id" SERIAL NOT NULL,
    "failure_type_id" INTEGER NOT NULL,
    "item_name" VARCHAR(100) NOT NULL,
    "item_type" VARCHAR(20) NOT NULL DEFAULT 'part',
    "unit_price" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repair_estimate_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" SERIAL NOT NULL,
    "workshop_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_symptoms" (
    "id" SERIAL NOT NULL,
    "case_id" INTEGER NOT NULL,
    "symptom_id" INTEGER NOT NULL,

    CONSTRAINT "case_symptoms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_question_answers" (
    "id" SERIAL NOT NULL,
    "case_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "answer" BOOLEAN NOT NULL,

    CONSTRAINT "case_question_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnosis_runs" (
    "id" SERIAL NOT NULL,
    "case_id" INTEGER NOT NULL,
    "run_version" INTEGER NOT NULL DEFAULT 1,
    "selected_failure_type_id" INTEGER,
    "results" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diagnosis_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" SERIAL NOT NULL,
    "case_id" INTEGER NOT NULL,
    "items" JSONB NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,
    "memo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snapshots" (
    "id" SERIAL NOT NULL,
    "case_id" INTEGER NOT NULL,
    "snapshot_type" VARCHAR(30) NOT NULL,
    "data" JSONB NOT NULL,
    "actual_failure_type" VARCHAR(100),
    "work_description" TEXT,
    "final_charge" INTEGER,
    "is_rework" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_login_id_key" ON "users"("login_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_plate_number_key" ON "vehicles"("plate_number");

-- CreateIndex
CREATE UNIQUE INDEX "symptom_questions_symptom_id_question_id_key" ON "symptom_questions"("symptom_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "case_symptoms_case_id_symptom_id_key" ON "case_symptoms"("case_id", "symptom_id");

-- CreateIndex
CREATE UNIQUE INDEX "case_question_answers_case_id_question_id_key" ON "case_question_answers"("case_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "diagnosis_runs_case_id_run_version_key" ON "diagnosis_runs"("case_id", "run_version");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "symptom_questions" ADD CONSTRAINT "symptom_questions_symptom_id_fkey" FOREIGN KEY ("symptom_id") REFERENCES "symptoms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "symptom_questions" ADD CONSTRAINT "symptom_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnosis_rules" ADD CONSTRAINT "diagnosis_rules_failure_type_id_fkey" FOREIGN KEY ("failure_type_id") REFERENCES "failure_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnosis_rules" ADD CONSTRAINT "diagnosis_rules_symptom_id_fkey" FOREIGN KEY ("symptom_id") REFERENCES "symptoms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnosis_rules" ADD CONSTRAINT "diagnosis_rules_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_estimate_items" ADD CONSTRAINT "repair_estimate_items_failure_type_id_fkey" FOREIGN KEY ("failure_type_id") REFERENCES "failure_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_symptoms" ADD CONSTRAINT "case_symptoms_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_symptoms" ADD CONSTRAINT "case_symptoms_symptom_id_fkey" FOREIGN KEY ("symptom_id") REFERENCES "symptoms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_question_answers" ADD CONSTRAINT "case_question_answers_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_question_answers" ADD CONSTRAINT "case_question_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnosis_runs" ADD CONSTRAINT "diagnosis_runs_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
