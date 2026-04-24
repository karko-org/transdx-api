import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import type { FastifyInstance } from "fastify";
import { findAdminUserById, isAllowedAdminUser } from "../lib/adminAuth";
import {
  findCounselorUserById,
  isAllowedCounselorUser,
} from "../lib/counselorAuth";

const DEFAULT_ADMIN_CONSOLE_ORIGIN = "http://localhost:5173";

export async function registerAuth(app: FastifyInstance) {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is required.");
  }

  await app.register(cors, {
    origin: DEFAULT_ADMIN_CONSOLE_ORIGIN,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  await app.register(jwt, {
    secret: jwtSecret,
  });

  app.decorateRequest("adminUser", null);
  app.decorateRequest("counselor", null);

  app.decorate("authenticate", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({
        message: "인증이 필요합니다.",
      });
    }
  });

  app.decorate("requireAdmin", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({
        message: "인증이 필요합니다.",
      });
      return;
    }

    const userId = Number(request.user.sub);

    if (!Number.isInteger(userId)) {
      reply.status(401).send({
        message: "유효하지 않은 인증 정보입니다.",
      });
      return;
    }

    const adminUser = await findAdminUserById(userId);

    if (!adminUser) {
      reply.status(401).send({
        message: "사용자를 찾을 수 없습니다.",
      });
      return;
    }

    if (!isAllowedAdminUser(adminUser)) {
      reply.status(403).send({
        message: "관리자 계정만 접근할 수 있습니다.",
      });
      return;
    }

    request.adminUser = adminUser;
  });

  app.decorate("requireCounselor", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({
        message: "인증이 필요합니다.",
      });
      return;
    }

    if (request.user.type !== "counselor") {
      reply.status(403).send({
        message: "상담자 계정만 접근할 수 있습니다.",
      });
      return;
    }

    const userId = Number(request.user.sub);

    if (!Number.isInteger(userId)) {
      reply.status(401).send({
        message: "유효하지 않은 인증 정보입니다.",
      });
      return;
    }

    const counselor = await findCounselorUserById(userId);

    if (!counselor) {
      reply.status(401).send({
        message: "사용자를 찾을 수 없습니다.",
      });
      return;
    }

    if (!isAllowedCounselorUser(counselor)) {
      reply.status(403).send({
        message: "상담자 계정만 접근할 수 있습니다.",
      });
      return;
    }

    request.counselor = counselor;
  });
}
