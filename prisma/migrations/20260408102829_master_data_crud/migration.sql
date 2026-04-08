-- DropForeignKey
ALTER TABLE "diagnosis_rules" DROP CONSTRAINT "diagnosis_rules_question_id_fkey";

-- DropForeignKey
ALTER TABLE "symptom_questions" DROP CONSTRAINT "symptom_questions_symptom_id_fkey";

-- DropForeignKey
ALTER TABLE "symptom_questions" DROP CONSTRAINT "symptom_questions_question_id_fkey";

-- AlterTable
ALTER TABLE "symptoms"
ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "failure_types"
ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "symptom_questions"
ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "diagnosis_rules"
ADD COLUMN "symptom_question_id" INTEGER;

-- Backfill current ordering
WITH ranked_symptoms AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY id ASC) AS next_sort_order
  FROM "symptoms"
)
UPDATE "symptoms" AS symptoms
SET "sort_order" = ranked_symptoms.next_sort_order
FROM ranked_symptoms
WHERE symptoms.id = ranked_symptoms.id;

WITH ranked_failure_types AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY id ASC) AS next_sort_order
  FROM "failure_types"
)
UPDATE "failure_types" AS failure_types
SET "sort_order" = ranked_failure_types.next_sort_order
FROM ranked_failure_types
WHERE failure_types.id = ranked_failure_types.id;

WITH ranked_symptom_questions AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY symptom_id ORDER BY id ASC) AS next_sort_order
  FROM "symptom_questions"
)
UPDATE "symptom_questions" AS symptom_questions
SET "sort_order" = ranked_symptom_questions.next_sort_order
FROM ranked_symptom_questions
WHERE symptom_questions.id = ranked_symptom_questions.id;

-- Backfill diagnosis_rules.symptom_question_id from the existing question mapping
UPDATE "diagnosis_rules" AS diagnosis_rules
SET "symptom_question_id" = symptom_question_match.id
FROM (
  SELECT DISTINCT ON (sq.question_id)
    sq.question_id,
    sq.id
  FROM "symptom_questions" AS sq
  ORDER BY sq.question_id, sq.id ASC
) AS symptom_question_match
WHERE diagnosis_rules.question_id = symptom_question_match.question_id;

-- Tighten constraints after backfill
ALTER TABLE "diagnosis_rules"
ALTER COLUMN "symptom_question_id" SET NOT NULL;

ALTER TABLE "diagnosis_rules"
DROP COLUMN "question_id";

-- CreateIndex
CREATE UNIQUE INDEX "symptom_categories_name_key" ON "symptom_categories"("name");

CREATE UNIQUE INDEX "symptoms_category_id_name_key" ON "symptoms"("category_id", "name");

CREATE UNIQUE INDEX "diagnosis_rules_symptom_question_id_failure_type_id_expected_answer_key"
ON "diagnosis_rules"("symptom_question_id", "failure_type_id", "expected_answer");

-- AddForeignKey
ALTER TABLE "symptom_questions"
ADD CONSTRAINT "symptom_questions_symptom_id_fkey"
FOREIGN KEY ("symptom_id") REFERENCES "symptoms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "symptom_questions"
ADD CONSTRAINT "symptom_questions_question_id_fkey"
FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "diagnosis_rules"
ADD CONSTRAINT "diagnosis_rules_symptom_question_id_fkey"
FOREIGN KEY ("symptom_question_id") REFERENCES "symptom_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
