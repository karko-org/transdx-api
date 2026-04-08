import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  findAdminUserById,
  isAllowedAdminUser,
  serializeAdminUser,
  verifyAdminCredentials,
} from "../lib/adminAuth";

const loginBodySchema = z.object({
  username: z.string().min(1, "아이디를 입력해주세요."),
  password: z.string().min(1, "비밀번호를 입력해주세요."),
});

export const adminAuthRoutes: FastifyPluginAsync = async (app) => {
  app.post("/api/admin/login", async (request, reply) => {
    const parsedBody = loginBodySchema.safeParse(request.body);

    if (!parsedBody.success) {
      return reply.status(400).send({
        message: "아이디와 비밀번호를 확인해주세요.",
      });
    }

    const { username, password } = parsedBody.data;

    const user = await verifyAdminCredentials(username, password);

    if (!user) {
      return reply.status(401).send({
        message: "아이디 또는 비밀번호가 올바르지 않습니다.",
      });
    }

    if (!isAllowedAdminUser(user)) {
      return reply.status(403).send({
        message: "관리자 계정만 로그인할 수 있습니다.",
      });
    }

    const token = await reply.jwtSign(
      {
        username: user.username,
        role: user.role,
      },
      {
        sign: {
          sub: String(user.id),
          expiresIn: process.env.JWT_EXPIRES_IN || "8h",
        },
      },
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    };
  });

  app.get(
    "/api/admin/me",
    {
      preHandler: [app.requireAdmin],
    },
    async (request, reply) => {
      const user = request.adminUser;

      if (!user) {
        return reply.status(401).send({
          message: "인증이 필요합니다.",
        });
      }

      return {
        user: serializeAdminUser(user),
      };
    },
  );
};
