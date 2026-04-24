import prisma from "./prisma";

const effectRuleInclude = {
  symptom_question: {
    include: {
      question: true,
    },
  },
  answer_option: true,
};

export async function listEffectRulesBySymptom(symptomId: number) {
  return prisma.diagnosisEffectRule.findMany({
    where: {
      symptom_question: {
        symptom_id: symptomId,
      },
    },
    orderBy: [
      { symptom_question: { sort_order: "asc" } },
      { effect_type: "asc" },
      { id: "asc" },
    ],
    include: effectRuleInclude,
  });
}

export async function findEffectRuleById(id: number) {
  return prisma.diagnosisEffectRule.findUnique({
    where: { id },
    include: {
      symptom_question: {
        include: {
          symptom: true,
          question: true,
        },
      },
      answer_option: true,
    },
  });
}

export async function findDuplicateEffectRule(data: {
  symptom_question_id: number;
  answer_option_id: number;
  effect_type: string;
  flag_key: string | null;
}) {
  return prisma.diagnosisEffectRule.findFirst({
    where: data,
  });
}

export async function createEffectRule(data: {
  symptom_question_id: number;
  answer_option_id: number;
  effect_type: string;
  symptom_confidence_delta?: number | null;
  flag_key?: string | null;
  flag_value?: boolean | null;
  explanation?: string | null;
  is_active?: boolean;
}) {
  return prisma.diagnosisEffectRule.create({
    data: {
      ...data,
      is_active: data.is_active ?? true,
    },
    include: effectRuleInclude,
  });
}

export async function updateEffectRule(
  id: number,
  data: Partial<{
    symptom_question_id: number;
    answer_option_id: number;
    effect_type: string;
    symptom_confidence_delta: number | null;
    flag_key: string | null;
    flag_value: boolean | null;
    explanation: string | null;
    is_active: boolean;
  }>,
) {
  return prisma.diagnosisEffectRule.update({
    where: { id },
    data,
    include: effectRuleInclude,
  });
}

export async function deleteEffectRule(id: number) {
  return prisma.diagnosisEffectRule.delete({
    where: { id },
  });
}

export function serializeEffectRule(rule: {
  id: number;
  symptom_question_id: number;
  answer_option_id: number;
  effect_type: string;
  symptom_confidence_delta: number | null;
  flag_key: string | null;
  flag_value: boolean | null;
  explanation: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  symptom_question: {
    id: number;
    sort_order: number;
    question: {
      id: number;
      code: string;
      text: string;
      answer_format: string;
    };
  };
  answer_option: {
    id: number;
    value: string;
    label: string;
    sort_order: number;
    is_scoring: boolean;
  };
}) {
  return {
    id: rule.id,
    symptom_question_id: rule.symptom_question_id,
    answer_option_id: rule.answer_option_id,
    effect_type: rule.effect_type,
    symptom_confidence_delta: rule.symptom_confidence_delta,
    flag_key: rule.flag_key,
    flag_value: rule.flag_value,
    explanation: rule.explanation,
    is_active: rule.is_active,
    created_at: rule.created_at.toISOString(),
    updated_at: rule.updated_at.toISOString(),
    symptom_question: {
      id: rule.symptom_question.id,
      sort_order: rule.symptom_question.sort_order,
      question: {
        id: rule.symptom_question.question.id,
        code: rule.symptom_question.question.code,
        text: rule.symptom_question.question.text,
        answer_format: rule.symptom_question.question.answer_format,
      },
    },
    answer_option: {
      id: rule.answer_option.id,
      value: rule.answer_option.value,
      label: rule.answer_option.label,
      sort_order: rule.answer_option.sort_order,
      is_scoring: rule.answer_option.is_scoring,
    },
  };
}
