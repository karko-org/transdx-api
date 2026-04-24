import type { PrismaClient } from "@prisma/client";

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

export async function seedAnswerOptions(prisma: PrismaClient) {
  const questions = await prisma.question.findMany({
    select: { id: true, code: true, answer_format: true },
  });

  for (const question of questions) {
    const template = answerOptionTemplates[question.answer_format];

    if (!template) {
      throw new Error(
        `Unknown answer_format "${question.answer_format}" for question ${question.code}`,
      );
    }

    const desiredValues = template.map((option) => option.value);

    await prisma.$transaction([
      prisma.questionAnswerOption.deleteMany({
        where: {
          question_id: question.id,
          value: {
            notIn: desiredValues,
          },
        },
      }),
      ...template.map((option) =>
        prisma.questionAnswerOption.upsert({
          where: {
            question_id_value: {
              question_id: question.id,
              value: option.value,
            },
          },
          update: {
            label: option.label,
            sort_order: option.sort_order,
            is_scoring: option.is_scoring,
          },
          create: {
            question_id: question.id,
            value: option.value,
            label: option.label,
            sort_order: option.sort_order,
            is_scoring: option.is_scoring,
          },
        }),
      ),
    ]);
  }
}
