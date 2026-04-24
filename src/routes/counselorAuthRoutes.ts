import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  isAllowedCounselorUser,
  serializeCounselorUser,
  verifyCounselorCredentials,
} from "../lib/counselorAuth";

const loginBodySchema = z.object({
  username: z.string().min(1, "아이디를 입력해주세요."),
  password: z.string().min(1, "비밀번호를 입력해주세요."),
});

export const counselorAuthRoutes: FastifyPluginAsync = async (app) => {
  app.post("/api/auth/login", async (request, reply) => {
    const parsedBody = loginBodySchema.safeParse(request.body);

    if (!parsedBody.success) {
      return reply.status(400).send({
        message: "아이디와 비밀번호를 확인해주세요.",
      });
    }

    const { username, password } = parsedBody.data;

    const user = await verifyCounselorCredentials(username, password);

    if (!user) {
      return reply.status(401).send({
        message: "아이디 또는 비밀번호가 올바르지 않습니다.",
      });
    }

    if (!isAllowedCounselorUser(user)) {
      return reply.status(403).send({
        message: "상담자 계정만 로그인할 수 있습니다.",
      });
    }

    const token = await reply.jwtSign(
      {
        username: user.username,
        role: user.role,
        type: "counselor",
        user_id: user.id,
        workshop_id: user.workshop_id,
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
      user: serializeCounselorUser(user),
    };
  });

  app.get(
    "/api/auth/me",
    {
      preHandler: [app.requireCounselor],
    },
    async (request, reply) => {
      const user = request.counselor;

      if (!user) {
        return reply.status(401).send({
          message: "인증이 필요합니다.",
        });
      }

      return {
        user: serializeCounselorUser(user),
      };
    },
  );
};
