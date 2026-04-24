import bcrypt from "bcrypt";
import prisma from "./prisma";

export const COUNSELOR_ROLES = ["counselor", "manager"] as const;

export async function findCounselorUserByUsername(username: string) {
  return prisma.user.findUnique({
    where: { username },
  });
}

export async function findCounselorUserById(id: number) {
  return prisma.user.findUnique({
    where: { id },
  });
}

export type CounselorSessionUser = NonNullable<
  Awaited<ReturnType<typeof findCounselorUserById>>
>;

export async function verifyCounselorCredentials(
  username: string,
  password: string,
) {
  const user = await findCounselorUserByUsername(username);

  if (!user) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    return null;
  }

  return user;
}

export function isAllowedCounselorUser(
  user: Awaited<ReturnType<typeof findCounselorUserById>> | null,
): user is CounselorSessionUser {
  return Boolean(
    user &&
      (COUNSELOR_ROLES as readonly string[]).includes(user.role) &&
      user.is_active,
  );
}

export function serializeCounselorUser(user: CounselorSessionUser) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    workshop_id: user.workshop_id,
  };
}
