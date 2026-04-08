import bcrypt from "bcrypt";
import prisma from "./prisma";

const adminUserInclude = {
  workshop: true,
} as const;

export async function findAdminUserByUsername(username: string) {
  return prisma.user.findUnique({
    where: { username },
    include: adminUserInclude,
  });
}

export async function findAdminUserById(id: number) {
  return prisma.user.findUnique({
    where: { id },
    include: adminUserInclude,
  });
}

export type AdminSessionUser = NonNullable<
  Awaited<ReturnType<typeof findAdminUserById>>
>;

export async function verifyAdminCredentials(username: string, password: string) {
  const user = await findAdminUserByUsername(username);

  if (!user) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    return null;
  }

  return user;
}

export function isAllowedAdminUser(
  user: Awaited<ReturnType<typeof findAdminUserById>> | null,
): user is AdminSessionUser {
  return Boolean(user && user.role === "admin" && user.is_active);
}

export function serializeAdminUser(user: AdminSessionUser) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    workshop: {
      id: user.workshop.id,
      name: user.workshop.name,
    },
  };
}
