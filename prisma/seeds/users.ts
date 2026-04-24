import bcrypt from "bcrypt";
import type { PrismaClient } from "@prisma/client";

const ADMIN_WORKSHOP_NAME = "kar";
const ADMIN_DISPLAY_NAME = "Admin";
const ADMIN_ROLE = "admin";
const COUNSELOR_DISPLAY_NAME = "테스트 상담자";
const COUNSELOR_ROLE = "counselor";
const BCRYPT_SALT_ROUNDS = 10;

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export async function seedAdminUser(prisma: PrismaClient) {
  const username = getRequiredEnv("ADMIN_USERNAME");
  const password = getRequiredEnv("ADMIN_PASSWORD");
  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  const existingWorkshop = await prisma.workshop.findFirst({
    where: { name: ADMIN_WORKSHOP_NAME },
    orderBy: { id: "asc" },
  });

  const workshop = existingWorkshop
    ? await prisma.workshop.update({
        where: { id: existingWorkshop.id },
        data: {
          is_active: true,
        },
      })
    : await prisma.workshop.create({
        data: {
          name: ADMIN_WORKSHOP_NAME,
          is_active: true,
        },
      });

  await prisma.user.upsert({
    where: { username },
    update: {
      workshop_id: workshop.id,
      password_hash: passwordHash,
      name: ADMIN_DISPLAY_NAME,
      role: ADMIN_ROLE,
      is_active: true,
    },
    create: {
      workshop_id: workshop.id,
      username,
      password_hash: passwordHash,
      name: ADMIN_DISPLAY_NAME,
      role: ADMIN_ROLE,
      is_active: true,
    },
  });
}

export async function seedCounselorUser(prisma: PrismaClient) {
  const username = process.env.COUNSELOR_SEED_USERNAME?.trim();
  const password = process.env.COUNSELOR_SEED_PASSWORD?.trim();

  if (!username || !password) {
    return;
  }

  const adminWorkshop = await prisma.workshop.findFirst({
    where: { name: ADMIN_WORKSHOP_NAME },
    orderBy: { id: "asc" },
  });

  if (!adminWorkshop) {
    throw new Error(
      "Admin workshop not found. seedAdminUser must run before seedCounselorUser.",
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  await prisma.user.upsert({
    where: { username },
    update: {
      workshop_id: adminWorkshop.id,
      password_hash: passwordHash,
      name: COUNSELOR_DISPLAY_NAME,
      role: COUNSELOR_ROLE,
      is_active: true,
    },
    create: {
      workshop_id: adminWorkshop.id,
      username,
      password_hash: passwordHash,
      name: COUNSELOR_DISPLAY_NAME,
      role: COUNSELOR_ROLE,
      is_active: true,
    },
  });
}
