import prisma from "./prisma";

const DEFAULT_ANSWER_FORMAT = "yes_no_unknown";

type AnswerOptionDef = {
  value: string;
  label: string;
  sort_order: number;
  is_scoring: boolean;
};

const answerOptionTemplates: Record<string, AnswerOptionDef[]> = {
  yes_no_unknown: [
    { value: "yes", label: "예", sort_order: 1, is_scoring: true },
    { value: "no", label: "아니오", sort_order: 2, is_scoring: true },
    { value: "unknown", label: "모름", sort_order: 3, is_scoring: false },
  ],
  yes_no: [
    { value: "yes", label: "예", sort_order: 1, is_scoring: true },
    { value: "no", label: "아니오", sort_order: 2, is_scoring: true },
  ],
  low_high_unknown: [
    { value: "low", label: "소량", sort_order: 1, is_scoring: true },
    { value: "high", label: "다량", sort_order: 2, is_scoring: true },
    { value: "unknown", label: "모름", sort_order: 3, is_scoring: false },
  ],
};

export function getAnswerOptionTemplate(answerFormat: string) {
  return answerOptionTemplates[answerFormat];
}

const questionInclude = {
  _count: {
    select: {
      symptom_questions: true,
      case_question_answers: true,
    },
  },
  answer_options: {
    orderBy: [{ sort_order: "asc" as const }, { id: "asc" as const }],
  },
};

export async function listQuestions(search?: string) {
  return prisma.question.findMany({
    where: search
      ? {
          OR: [
            {
              code: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              text: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        }
      : undefined,
    orderBy: [{ code: "asc" }, { id: "asc" }],
    include: questionInclude,
  });
}

export async function findQuestionById(id: number) {
  return prisma.question.findUnique({
    where: { id },
    include: questionInclude,
  });
}

export async function findQuestionByCode(code: string) {
  return prisma.question.findUnique({
    where: { code },
  });
}

const symptomQuestionInclude = {
  question: {
    include: questionInclude,
  },
  _count: {
    select: {
      diagnosis_rules: true,
      diagnosis_effect_rules: true,
    },
  },
};

export async function listSymptomQuestions(symptomId: number) {
  return prisma.symptomQuestion.findMany({
    where: {
      symptom_id: symptomId,
    },
    orderBy: [{ sort_order: "asc" }, { id: "asc" }],
    include: symptomQuestionInclude,
  });
}

export async function findSymptomQuestionById(id: number) {
  return prisma.symptomQuestion.findUnique({
    where: { id },
    include: {
      symptom: true,
      ...symptomQuestionInclude,
    },
  });
}

export async function findSymptomQuestionBySymptomAndQuestion(
  symptomId: number,
  questionId: number,
) {
  return prisma.symptomQuestion.findUnique({
    where: {
      symptom_id_question_id: {
        symptom_id: symptomId,
        question_id: questionId,
      },
    },
  });
}

export async function createQuestionAndLinkToSymptom(data: {
  symptom_id: number;
  code: string;
  text: string;
  question_intent?: string | null;
  answer_format?: string;
  sort_order: number;
}) {
  const answerFormat = data.answer_format ?? DEFAULT_ANSWER_FORMAT;
  const template = answerOptionTemplates[answerFormat];

  if (!template) {
    throw new Error(`Unsupported answer_format: ${answerFormat}`);
  }

  return prisma.$transaction(async (tx) => {
    const question = await tx.question.create({
      data: {
        code: data.code,
        text: data.text,
        question_intent: data.question_intent,
        answer_format: answerFormat,
        answer_options: {
          create: template,
        },
      },
    });

    const symptomQuestion = await tx.symptomQuestion.create({
      data: {
        symptom_id: data.symptom_id,
        question_id: question.id,
        sort_order: data.sort_order,
      },
      include: symptomQuestionInclude,
    });

    return symptomQuestion;
  });
}

export async function linkExistingQuestionToSymptom(data: {
  symptom_id: number;
  question_id: number;
  sort_order: number;
}) {
  return prisma.symptomQuestion.create({
    data,
    include: symptomQuestionInclude,
  });
}

export async function updateSymptomQuestion(
  id: number,
  data: Partial<{
    sort_order: number;
  }>,
) {
  return prisma.symptomQuestion.update({
    where: { id },
    data,
    include: symptomQuestionInclude,
  });
}

export async function deleteSymptomQuestion(id: number) {
  return prisma.symptomQuestion.delete({
    where: { id },
  });
}

export async function updateQuestion(
  id: number,
  data: Partial<{
    code: string;
    text: string;
    question_intent: string | null;
    answer_format: string;
    is_active: boolean;
  }>,
) {
  return prisma.question.update({
    where: { id },
    data,
    include: questionInclude,
  });
}

export async function deleteQuestion(id: number) {
  return prisma.question.delete({
    where: { id },
  });
}

export function serializeQuestion(question: {
  id: number;
  code: string;
  text: string;
  question_intent: string | null;
  answer_format: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  _count?: {
    symptom_questions: number;
    case_question_answers: number;
  };
  answer_options?: Array<{
    id: number;
    value: string;
    label: string;
    sort_order: number;
    is_scoring: boolean;
  }>;
}) {
  return {
    id: question.id,
    code: question.code,
    text: question.text,
    question_intent: question.question_intent,
    answer_format: question.answer_format,
    is_active: question.is_active,
    linked_symptom_count: question._count?.symptom_questions ?? 0,
    answer_count: question._count?.case_question_answers ?? 0,
    answer_options: (question.answer_options ?? []).map((option) => ({
      id: option.id,
      value: option.value,
      label: option.label,
      sort_order: option.sort_order,
      is_scoring: option.is_scoring,
    })),
    created_at: question.created_at.toISOString(),
    updated_at: question.updated_at.toISOString(),
  };
}

export function serializeSymptomQuestion(symptomQuestion: {
  id: number;
  symptom_id: number;
  question_id: number;
  sort_order: number;
  question: Parameters<typeof serializeQuestion>[0];
  _count?: {
    diagnosis_rules: number;
    diagnosis_effect_rules: number;
  };
}) {
  return {
    symptom_question_id: symptomQuestion.id,
    symptom_id: symptomQuestion.symptom_id,
    question_id: symptomQuestion.question_id,
    sort_order: symptomQuestion.sort_order,
    diagnosis_rule_count: symptomQuestion._count?.diagnosis_rules ?? 0,
    diagnosis_effect_rule_count: symptomQuestion._count?.diagnosis_effect_rules ?? 0,
    question: serializeQuestion(symptomQuestion.question),
  };
}
