import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import type { FastifyInstance } from "fastify";

const DEFAULT_ADMIN_CONSOLE_ORIGIN = "http://localhost:5173";

export async function registerAuth(app: FastifyInstance) {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is required.");
  }

  await app.register(cors, {
    origin: DEFAULT_ADMIN_CONSOLE_ORIGIN,
  });

  await app.register(jwt, {
    secret: jwtSecret,
  });

  app.decorate("authenticate", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({
        message: "인증이 필요합니다.",
      });
    }
  });
}
