-- DropIndex
DROP INDEX "diagnosis_rules_symptom_question_id_failure_type_id_expected_an";

-- AlterTable
ALTER TABLE "case_question_answers" DROP COLUMN "answer",
ADD COLUMN     "answer_option_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "diagnosis_rules" DROP COLUMN "expected_answer",
ADD COLUMN     "answer_option_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "diagnosis_runs" ADD COLUMN     "symptom_confidence_score" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "answer_format" VARCHAR(30) NOT NULL DEFAULT 'yes_no_unknown';

-- CreateTable
CREATE TABLE "question_answer_options" (
    "id" SERIAL NOT NULL,
    "question_id" INTEGER NOT NULL,
    "value" VARCHAR(30) NOT NULL,
    "label" VARCHAR(50) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_scoring" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_answer_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnosis_effect_rules" (
    "id" SERIAL NOT NULL,
    "symptom_question_id" INTEGER NOT NULL,
    "answer_option_id" INTEGER NOT NULL,
    "effect_type" VARCHAR(30) NOT NULL,
    "symptom_confidence_delta" INTEGER,
    "flag_key" VARCHAR(50),
    "flag_value" BOOLEAN,
    "explanation" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagnosis_effect_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnosis_run_flags" (
    "id" SERIAL NOT NULL,
    "diagnosis_run_id" INTEGER NOT NULL,
    "flag_key" VARCHAR(50) NOT NULL,
    "flag_value" BOOLEAN NOT NULL,

    CONSTRAINT "diagnosis_run_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "question_answer_options_question_id_value_key" ON "question_answer_options"("question_id", "value");

-- CreateIndex
CREATE UNIQUE INDEX "diagnosis_effect_rules_symptom_question_id_answer_option_id_key" ON "diagnosis_effect_rules"("symptom_question_id", "answer_option_id", "effect_type", "flag_key");

-- CreateIndex
CREATE UNIQUE INDEX "diagnosis_run_flags_diagnosis_run_id_flag_key_key" ON "diagnosis_run_flags"("diagnosis_run_id", "flag_key");

-- CreateIndex
CREATE UNIQUE INDEX "diagnosis_rules_symptom_question_id_failure_type_id_answer__key" ON "diagnosis_rules"("symptom_question_id", "failure_type_id", "answer_option_id");

-- AddForeignKey
ALTER TABLE "question_answer_options" ADD CONSTRAINT "question_answer_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnosis_rules" ADD CONSTRAINT "diagnosis_rules_answer_option_id_fkey" FOREIGN KEY ("answer_option_id") REFERENCES "question_answer_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnosis_effect_rules" ADD CONSTRAINT "diagnosis_effect_rules_symptom_question_id_fkey" FOREIGN KEY ("symptom_question_id") REFERENCES "symptom_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnosis_effect_rules" ADD CONSTRAINT "diagnosis_effect_rules_answer_option_id_fkey" FOREIGN KEY ("answer_option_id") REFERENCES "question_answer_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_question_answers" ADD CONSTRAINT "case_question_answers_answer_option_id_fkey" FOREIGN KEY ("answer_option_id") REFERENCES "question_answer_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnosis_run_flags" ADD CONSTRAINT "diagnosis_run_flags_diagnosis_run_id_fkey" FOREIGN KEY ("diagnosis_run_id") REFERENCES "diagnosis_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

