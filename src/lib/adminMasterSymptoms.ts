import prisma from "./prisma";

export async function listSymptomsByCategory(categoryId: number) {
  return prisma.symptom.findMany({
    where: {
      category_id: categoryId,
    },
    orderBy: [{ sort_order: "asc" }, { id: "asc" }],
    include: {
      category: true,
      _count: {
        select: {
          symptom_questions: true,
          case_symptoms: true,
        },
      },
    },
  });
}

export async function findSymptomById(id: number) {
  return prisma.symptom.findUnique({
    where: { id },
    include: {
      category: true,
      _count: {
        select: {
          symptom_questions: true,
          case_symptoms: true,
        },
      },
    },
  });
}

export async function findSymptomByCategoryAndName(categoryId: number, name: string) {
  return prisma.symptom.findFirst({
    where: {
      category_id: categoryId,
      name,
    },
  });
}

export async function createSymptom(data: {
  category_id: number;
  name: string;
  description?: string | null;
  sort_order: number;
}) {
  return prisma.symptom.create({
    data,
  });
}

export async function updateSymptom(
  id: number,
  data: Partial<{
    name: string;
    description: string | null;
    sort_order: number;
    is_active: boolean;
  }>,
) {
  return prisma.symptom.update({
    where: { id },
    data,
  });
}

export async function deleteSymptom(id: number) {
  return prisma.symptom.delete({
    where: { id },
  });
}

export function serializeSymptom(symptom: {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  category?: {
    id: number;
    name: string;
  };
  _count?: {
    symptom_questions: number;
    case_symptoms: number;
  };
}) {
  return {
    id: symptom.id,
    category_id: symptom.category_id,
    category: symptom.category
      ? {
          id: symptom.category.id,
          name: symptom.category.name,
        }
      : undefined,
    name: symptom.name,
    description: symptom.description,
    sort_order: symptom.sort_order,
    is_active: symptom.is_active,
    question_count: symptom._count?.symptom_questions ?? 0,
    case_symptom_count: symptom._count?.case_symptoms ?? 0,
    created_at: symptom.created_at.toISOString(),
    updated_at: symptom.updated_at.toISOString(),
  };
}
