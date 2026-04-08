import prisma from "./prisma";

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
    include: {
      _count: {
        select: {
          symptom_questions: true,
          case_question_answers: true,
        },
      },
    },
  });
}

export async function findQuestionById(id: number) {
  return prisma.question.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          symptom_questions: true,
          case_question_answers: true,
        },
      },
    },
  });
}

export async function findQuestionByCode(code: string) {
  return prisma.question.findUnique({
    where: { code },
  });
}

export async function listSymptomQuestions(symptomId: number) {
  return prisma.symptomQuestion.findMany({
    where: {
      symptom_id: symptomId,
    },
    orderBy: [{ sort_order: "asc" }, { id: "asc" }],
    include: {
      question: {
        include: {
          _count: {
            select: {
              symptom_questions: true,
              case_question_answers: true,
            },
          },
        },
      },
      _count: {
        select: {
          diagnosis_rules: true,
        },
      },
    },
  });
}

export async function findSymptomQuestionById(id: number) {
  return prisma.symptomQuestion.findUnique({
    where: { id },
    include: {
      symptom: true,
      question: {
        include: {
          _count: {
            select: {
              symptom_questions: true,
              case_question_answers: true,
            },
          },
        },
      },
      _count: {
        select: {
          diagnosis_rules: true,
        },
      },
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
  sort_order: number;
}) {
  return prisma.$transaction(async (tx) => {
    const question = await tx.question.create({
      data: {
        code: data.code,
        text: data.text,
        question_intent: data.question_intent,
      },
    });

    const symptomQuestion = await tx.symptomQuestion.create({
      data: {
        symptom_id: data.symptom_id,
        question_id: question.id,
        sort_order: data.sort_order,
      },
      include: {
        question: {
          include: {
            _count: {
              select: {
                symptom_questions: true,
                case_question_answers: true,
              },
            },
          },
        },
        _count: {
          select: {
            diagnosis_rules: true,
          },
        },
      },
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
    include: {
      question: {
        include: {
          _count: {
            select: {
              symptom_questions: true,
              case_question_answers: true,
            },
          },
        },
      },
      _count: {
        select: {
          diagnosis_rules: true,
        },
      },
    },
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
    include: {
      question: {
        include: {
          _count: {
            select: {
              symptom_questions: true,
              case_question_answers: true,
            },
          },
        },
      },
      _count: {
        select: {
          diagnosis_rules: true,
        },
      },
    },
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
    is_active: boolean;
  }>,
) {
  return prisma.question.update({
    where: { id },
    data,
    include: {
      _count: {
        select: {
          symptom_questions: true,
          case_question_answers: true,
        },
      },
    },
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
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  _count?: {
    symptom_questions: number;
    case_question_answers: number;
  };
}) {
  return {
    id: question.id,
    code: question.code,
    text: question.text,
    question_intent: question.question_intent,
    is_active: question.is_active,
    linked_symptom_count: question._count?.symptom_questions ?? 0,
    answer_count: question._count?.case_question_answers ?? 0,
    created_at: question.created_at.toISOString(),
    updated_at: question.updated_at.toISOString(),
  };
}

export function serializeSymptomQuestion(symptomQuestion: {
  id: number;
  symptom_id: number;
  question_id: number;
  sort_order: number;
  question: {
    id: number;
    code: string;
    text: string;
    question_intent: string | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    _count?: {
      symptom_questions: number;
      case_question_answers: number;
    };
  };
  _count?: {
    diagnosis_rules: number;
  };
}) {
  return {
    symptom_question_id: symptomQuestion.id,
    symptom_id: symptomQuestion.symptom_id,
    question_id: symptomQuestion.question_id,
    sort_order: symptomQuestion.sort_order,
    diagnosis_rule_count: symptomQuestion._count?.diagnosis_rules ?? 0,
    question: serializeQuestion(symptomQuestion.question),
  };
}
