import prisma from "./prisma";

export async function listSymptomCategories() {
  return prisma.symptomCategory.findMany({
    orderBy: [{ sort_order: "asc" }, { id: "asc" }],
    include: {
      _count: {
        select: {
          symptoms: true,
        },
      },
    },
  });
}

export async function findSymptomCategoryById(id: number) {
  return prisma.symptomCategory.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          symptoms: true,
        },
      },
    },
  });
}

export async function findSymptomCategoryByName(name: string) {
  return prisma.symptomCategory.findUnique({
    where: { name },
  });
}

export async function createSymptomCategory(data: {
  name: string;
  sort_order: number;
}) {
  return prisma.symptomCategory.create({
    data,
  });
}

export async function updateSymptomCategory(
  id: number,
  data: Partial<{
    name: string;
    sort_order: number;
    is_active: boolean;
  }>,
) {
  return prisma.symptomCategory.update({
    where: { id },
    data,
  });
}

export async function deleteSymptomCategory(id: number) {
  return prisma.symptomCategory.delete({
    where: { id },
  });
}

export function serializeSymptomCategory(category: {
  id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  _count?: {
    symptoms: number;
  };
}) {
  return {
    id: category.id,
    name: category.name,
    sort_order: category.sort_order,
    is_active: category.is_active,
    symptom_count: category._count?.symptoms ?? 0,
    created_at: category.created_at.toISOString(),
    updated_at: category.updated_at.toISOString(),
  };
}
