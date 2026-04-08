import bcrypt from "bcrypt";
import prisma from "./prisma";

const BCRYPT_SALT_ROUNDS = 10;
export const managedUserRoles = ["manager", "counselor"] as const;

export type ManagedUserRole = (typeof managedUserRoles)[number];

export async function listWorkshopUsers(workshopId: number) {
  return prisma.user.findMany({
    where: { workshop_id: workshopId },
    orderBy: [{ created_at: "desc" }],
  });
}

export async function findWorkshopUserById(workshopId: number, userId: number) {
  return prisma.user.findFirst({
    where: {
      id: userId,
      workshop_id: workshopId,
    },
  });
}

export async function findUserByUsername(username: string) {
  return prisma.user.findUnique({
    where: { username },
  });
}

export async function createWorkshopUser(data: {
  workshopId: number;
  username: string;
  password: string;
  name: string;
  role: ManagedUserRole;
}) {
  const passwordHash = await bcrypt.hash(data.password, BCRYPT_SALT_ROUNDS);

  return prisma.user.create({
    data: {
      workshop_id: data.workshopId,
      username: data.username,
      password_hash: passwordHash,
      name: data.name,
      role: data.role,
      is_active: true,
    },
  });
}

export async function updateWorkshopUser(
  userId: number,
  data: Partial<{
    username: string;
    password: string;
    name: string;
    role: ManagedUserRole;
    is_active: boolean;
  }>,
) {
  const nextData: {
    username?: string;
    password_hash?: string;
    name?: string;
    role?: ManagedUserRole;
    is_active?: boolean;
  } = {};

  if (typeof data.username === "string") {
    nextData.username = data.username;
  }

  if (typeof data.name === "string") {
    nextData.name = data.name;
  }

  if (typeof data.role === "string") {
    nextData.role = data.role;
  }

  if (typeof data.is_active === "boolean") {
    nextData.is_active = data.is_active;
  }

  if (typeof data.password === "string") {
    nextData.password_hash = await bcrypt.hash(data.password, BCRYPT_SALT_ROUNDS);
  }

  return prisma.user.update({
    where: { id: userId },
    data: nextData,
  });
}

export async function deleteWorkshopUser(userId: number) {
  return prisma.user.delete({
    where: { id: userId },
  });
}

export function serializeWorkshopUser(user: {
  id: number;
  username: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    is_active: user.is_active,
    created_at: user.created_at.toISOString(),
    updated_at: user.updated_at.toISOString(),
  };
}
