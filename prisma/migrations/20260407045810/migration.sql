/*
  Warnings:

  - You are about to drop the column `rule_type` on the `diagnosis_rules` table. All the data in the column will be lost.
  - You are about to drop the column `symptom_id` on the `diagnosis_rules` table. All the data in the column will be lost.
  - You are about to alter the column `score_delta` on the `diagnosis_rules` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to drop the column `results` on the `diagnosis_runs` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `failure_types` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `failure_types` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `symptoms` table. All the data in the column will be lost.
  - You are about to drop the column `login_id` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code]` on the table `failure_types` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `questions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[username]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Made the column `question_id` on table `diagnosis_rules` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `expected_answer` to the `diagnosis_rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `failure_types` table without a default value. This is not possible if the table is not empty.
  - Added the required column `display_name` to the `failure_types` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `questions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category_id` to the `symptoms` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "diagnosis_rules" DROP CONSTRAINT "diagnosis_rules_question_id_fkey";

-- DropForeignKey
ALTER TABLE "diagnosis_rules" DROP CONSTRAINT "diagnosis_rules_symptom_id_fkey";

-- DropIndex
DROP INDEX "users_login_id_key";

-- AlterTable
ALTER TABLE "diagnosis_rules" DROP COLUMN "rule_type",
DROP COLUMN "symptom_id",
ADD COLUMN     "explanation" TEXT,
ALTER COLUMN "question_id" SET NOT NULL,
DROP COLUMN "expected_answer",
ADD COLUMN     "expected_answer" BOOLEAN NOT NULL,
ALTER COLUMN "score_delta" SET DEFAULT 0,
ALTER COLUMN "score_delta" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "diagnosis_runs" DROP COLUMN "results";

-- AlterTable
ALTER TABLE "failure_types" DROP COLUMN "category",
DROP COLUMN "name",
ADD COLUMN     "code" VARCHAR(20) NOT NULL,
ADD COLUMN     "display_name" VARCHAR(100) NOT NULL;

-- AlterTable
ALTER TABLE "questions" DROP COLUMN "description",
ADD COLUMN     "code" VARCHAR(20) NOT NULL,
ADD COLUMN     "question_intent" VARCHAR(200);

-- AlterTable
ALTER TABLE "symptoms" DROP COLUMN "category",
ADD COLUMN     "category_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "login_id",
ADD COLUMN     "username" VARCHAR(50) NOT NULL;

-- CreateTable
CREATE TABLE "symptom_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "symptom_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnosis_run_candidates" (
    "id" SERIAL NOT NULL,
    "diagnosis_run_id" INTEGER NOT NULL,
    "failure_type_id" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "diagnosis_run_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "failure_types_code_key" ON "failure_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "questions_code_key" ON "questions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- AddForeignKey
ALTER TABLE "symptoms" ADD CONSTRAINT "symptoms_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "symptom_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnosis_rules" ADD CONSTRAINT "diagnosis_rules_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnosis_runs" ADD CONSTRAINT "diagnosis_runs_selected_failure_type_id_fkey" FOREIGN KEY ("selected_failure_type_id") REFERENCES "failure_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnosis_run_candidates" ADD CONSTRAINT "diagnosis_run_candidates_diagnosis_run_id_fkey" FOREIGN KEY ("diagnosis_run_id") REFERENCES "diagnosis_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnosis_run_candidates" ADD CONSTRAINT "diagnosis_run_candidates_failure_type_id_fkey" FOREIGN KEY ("failure_type_id") REFERENCES "failure_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
