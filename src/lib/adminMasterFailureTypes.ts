import prisma from "./prisma";

export async function listFailureTypes() {
  return prisma.failureType.findMany({
    orderBy: [{ sort_order: "asc" }, { code: "asc" }],
    include: {
      _count: {
        select: {
          diagnosis_rules: true,
          repair_estimate_items: true,
          diagnosis_run_candidates: true,
          diagnosis_run_selections: true,
        },
      },
    },
  });
}

export async function findFailureTypeById(id: number) {
  return prisma.failureType.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          diagnosis_rules: true,
          repair_estimate_items: true,
          diagnosis_run_candidates: true,
          diagnosis_run_selections: true,
        },
      },
    },
  });
}

export async function findFailureTypeByCode(code: string) {
  return prisma.failureType.findUnique({
    where: { code },
  });
}

export async function getNextFailureTypeSortOrder() {
  const lastFailureType = await prisma.failureType.findFirst({
    orderBy: [{ sort_order: "desc" }, { id: "desc" }],
    select: {
      sort_order: true,
    },
  });

  return (lastFailureType?.sort_order ?? 0) + 1;
}

export async function createFailureType(data: {
  code: string;
  display_name: string;
  description?: string | null;
  sort_order: number;
}) {
  return prisma.failureType.create({
    data,
  });
}

export async function updateFailureType(
  id: number,
  data: Partial<{
    code: string;
    display_name: string;
    description: string | null;
    sort_order: number;
    is_active: boolean;
  }>,
) {
  return prisma.failureType.update({
    where: { id },
    data,
    include: {
      _count: {
        select: {
          diagnosis_rules: true,
          repair_estimate_items: true,
          diagnosis_run_candidates: true,
          diagnosis_run_selections: true,
        },
      },
    },
  });
}

export async function deleteFailureType(id: number) {
  return prisma.failureType.delete({
    where: { id },
  });
}

export function serializeFailureType(failureType: {
  id: number;
  code: string;
  display_name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  _count?: {
    diagnosis_rules: number;
    repair_estimate_items: number;
    diagnosis_run_candidates: number;
    diagnosis_run_selections: number;
  };
}) {
  return {
    id: failureType.id,
    code: failureType.code,
    display_name: failureType.display_name,
    description: failureType.description,
    sort_order: failureType.sort_order,
    is_active: failureType.is_active,
    diagnosis_rule_count: failureType._count?.diagnosis_rules ?? 0,
    repair_estimate_item_count: failureType._count?.repair_estimate_items ?? 0,
    diagnosis_candidate_count: failureType._count?.diagnosis_run_candidates ?? 0,
    diagnosis_selection_count: failureType._count?.diagnosis_run_selections ?? 0,
    created_at: failureType.created_at.toISOString(),
    updated_at: failureType.updated_at.toISOString(),
  };
}
