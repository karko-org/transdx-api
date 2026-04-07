import prisma from "./prisma";

export async function listWorkshops() {
  return prisma.workshop.findMany({
    orderBy: { created_at: "desc" },
  });
}

export async function findWorkshopById(id: number) {
  return prisma.workshop.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true, cases: true } },
    },
  });
}

export async function createWorkshop(data: {
  name: string;
  address?: string;
  phone?: string;
}) {
  return prisma.workshop.create({ data });
}

export async function updateWorkshop(
  id: number,
  data: {
    name?: string;
    address?: string | null;
    phone?: string | null;
    is_active?: boolean;
  },
) {
  return prisma.workshop.update({ where: { id }, data });
}

export async function deleteWorkshop(id: number) {
  return prisma.workshop.delete({ where: { id } });
}

export function serializeWorkshop(workshop: {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}) {
  return {
    id: workshop.id,
    name: workshop.name,
    address: workshop.address,
    phone: workshop.phone,
    is_active: workshop.is_active,
    created_at: workshop.created_at.toISOString(),
    updated_at: workshop.updated_at.toISOString(),
  };
}
