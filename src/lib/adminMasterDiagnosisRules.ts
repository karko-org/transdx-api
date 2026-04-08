import prisma from "./prisma";

export async function listDiagnosisRulesBySymptom(symptomId: number) {
  return prisma.diagnosisRule.findMany({
    where: {
      symptom_question: {
        symptom_id: symptomId,
      },
    },
    orderBy: [
      { symptom_question: { sort_order: "asc" } },
      { failure_type: { sort_order: "asc" } },
      { id: "asc" },
    ],
    include: {
      symptom_question: {
        include: {
          question: true,
        },
      },
      failure_type: true,
    },
  });
}

export async function findDiagnosisRuleById(id: number) {
  return prisma.diagnosisRule.findUnique({
    where: { id },
    include: {
      symptom_question: {
        include: {
          symptom: true,
          question: true,
        },
      },
      failure_type: true,
    },
  });
}

export async function findDuplicateDiagnosisRule(data: {
  symptom_question_id: number;
  failure_type_id: number;
  expected_answer: boolean;
}) {
  return prisma.diagnosisRule.findFirst({
    where: data,
  });
}

export async function createDiagnosisRule(data: {
  symptom_question_id: number;
  failure_type_id: number;
  expected_answer: boolean;
  score_delta: number;
  explanation?: string | null;
  is_active?: boolean;
}) {
  return prisma.diagnosisRule.create({
    data: {
      ...data,
      is_active: data.is_active ?? true,
    },
    include: {
      symptom_question: {
        include: {
          question: true,
        },
      },
      failure_type: true,
    },
  });
}

export async function updateDiagnosisRule(
  id: number,
  data: Partial<{
    symptom_question_id: number;
    failure_type_id: number;
    expected_answer: boolean;
    score_delta: number;
    explanation: string | null;
    is_active: boolean;
  }>,
) {
  return prisma.diagnosisRule.update({
    where: { id },
    data,
    include: {
      symptom_question: {
        include: {
          question: true,
        },
      },
      failure_type: true,
    },
  });
}

export async function deleteDiagnosisRule(id: number) {
  return prisma.diagnosisRule.delete({
    where: { id },
  });
}

export function serializeDiagnosisRule(rule: {
  id: number;
  symptom_question_id: number;
  failure_type_id: number;
  expected_answer: boolean;
  score_delta: number;
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
    };
  };
  failure_type: {
    id: number;
    code: string;
    display_name: string;
    sort_order: number;
  };
}) {
  return {
    id: rule.id,
    symptom_question_id: rule.symptom_question_id,
    failure_type_id: rule.failure_type_id,
    expected_answer: rule.expected_answer,
    score_delta: rule.score_delta,
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
      },
    },
    failure_type: {
      id: rule.failure_type.id,
      code: rule.failure_type.code,
      display_name: rule.failure_type.display_name,
      sort_order: rule.failure_type.sort_order,
    },
  };
}
