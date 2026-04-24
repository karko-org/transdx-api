import { Prisma } from "@prisma/client";
import prisma from "./prisma";

const caseInclude = {
  vehicle: {
    select: {
      id: true,
      plate_number: true,
      customer_name: true,
      customer_phone: true,
    },
  },
  user: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.CaseInclude;

type CaseWithInclude = Prisma.CaseGetPayload<{ include: typeof caseInclude }>;

export type ListCasesInput = {
  workshopId: number;
  statusFilter?: string[];
};

export async function listCases(input: ListCasesInput) {
  const where: Prisma.CaseWhereInput = {
    workshop_id: input.workshopId,
  };

  if (input.statusFilter && input.statusFilter.length > 0) {
    where.status = { in: input.statusFilter };
  }

  return prisma.case.findMany({
    where,
    include: caseInclude,
    orderBy: { created_at: "desc" },
  });
}

export type CreateCaseInput = {
  workshopId: number;
  userId: number;
  plateNumber: string;
  customerName?: string | null;
  customerPhone?: string | null;
  mileage?: number | null;
  memo?: string | null;
};

function normalizePlateNumber(raw: string): string {
  // trim + 공백 전부 제거 (full-width U+3000 포함, 한글 보존)
  return raw.replace(/\s+/g, "");
}

export async function createCaseWithVehicle(input: CreateCaseInput) {
  const normalizedPlate = normalizePlateNumber(input.plateNumber);

  return prisma.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.upsert({
      where: { plate_number: normalizedPlate },
      update: {},
      create: {
        plate_number: normalizedPlate,
        customer_name: input.customerName ?? null,
        customer_phone: input.customerPhone ?? null,
      },
    });

    const createdCase = await tx.case.create({
      data: {
        workshop_id: input.workshopId,
        user_id: input.userId,
        vehicle_id: vehicle.id,
        status: "draft",
        mileage: input.mileage ?? null,
        memo: input.memo ?? null,
      },
      include: caseInclude,
    });

    return createdCase;
  });
}

export type DeleteCaseResult =
  | { found: false }
  | { found: true; forbidden: true }
  | { found: true; forbidden: false };

export async function deleteCase(
  caseId: number,
  workshopId: number,
): Promise<DeleteCaseResult> {
  const existing = await prisma.case.findUnique({
    where: { id: caseId },
    select: { id: true, workshop_id: true },
  });

  if (!existing) {
    return { found: false };
  }

  if (existing.workshop_id !== workshopId) {
    return { found: true, forbidden: true };
  }

  await prisma.case.delete({ where: { id: caseId } });

  return { found: true, forbidden: false };
}

export function serializeCase(c: CaseWithInclude) {
  return {
    id: c.id,
    status: c.status,
    mileage: c.mileage,
    memo: c.memo,
    workshop_id: c.workshop_id,
    user_id: c.user_id,
    created_at: c.created_at.toISOString(),
    updated_at: c.updated_at.toISOString(),
    vehicle: {
      id: c.vehicle.id,
      plate_number: c.vehicle.plate_number,
      customer_name: c.vehicle.customer_name,
      customer_phone: c.vehicle.customer_phone,
    },
    user: {
      id: c.user.id,
      name: c.user.name,
    },
  };
}
