import prisma from "./prisma";

const answerOptionInclude = {
  _count: {
    select: {
      diagnosis_rules: true,
      diagnosis_effect_rules: true,
      case_question_answers: true,
    },
  },
};

export async function listAnswerOptionsByQuestion(questionId: number) {
  return prisma.questionAnswerOption.findMany({
    where: { question_id: questionId },
    orderBy: [{ sort_order: "asc" }, { id: "asc" }],
    include: answerOptionInclude,
  });
}

export async function findAnswerOptionById(id: number) {
  return prisma.questionAnswerOption.findUnique({
    where: { id },
    include: answerOptionInclude,
  });
}

export async function findAnswerOptionByQuestionAndValue(
  questionId: number,
  value: string,
) {
  return prisma.questionAnswerOption.findUnique({
    where: {
      question_id_value: {
        question_id: questionId,
        value,
      },
    },
  });
}

export async function createAnswerOption(data: {
  question_id: number;
  value: string;
  label: string;
  sort_order: number;
  is_scoring?: boolean;
}) {
  return prisma.questionAnswerOption.create({
    data: {
      ...data,
      is_scoring: data.is_scoring ?? true,
    },
    include: answerOptionInclude,
  });
}

export async function updateAnswerOption(
  id: number,
  data: Partial<{
    value: string;
    label: string;
    sort_order: number;
    is_scoring: boolean;
  }>,
) {
  return prisma.questionAnswerOption.update({
    where: { id },
    data,
    include: answerOptionInclude,
  });
}

export async function deleteAnswerOption(id: number) {
  return prisma.questionAnswerOption.delete({
    where: { id },
  });
}

export function serializeAnswerOption(option: {
  id: number;
  question_id: number;
  value: string;
  label: string;
  sort_order: number;
  is_scoring: boolean;
  created_at: Date;
  updated_at: Date;
  _count?: {
    diagnosis_rules: number;
    diagnosis_effect_rules: number;
    case_question_answers: number;
  };
}) {
  return {
    id: option.id,
    question_id: option.question_id,
    value: option.value,
    label: option.label,
    sort_order: option.sort_order,
    is_scoring: option.is_scoring,
    diagnosis_rule_count: option._count?.diagnosis_rules ?? 0,
    diagnosis_effect_rule_count: option._count?.diagnosis_effect_rules ?? 0,
    answer_count: option._count?.case_question_answers ?? 0,
    created_at: option.created_at.toISOString(),
    updated_at: option.updated_at.toISOString(),
  };
}
