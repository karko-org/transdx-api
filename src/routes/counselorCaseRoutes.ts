import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  createCaseWithVehicle,
  deleteCase,
  listCases,
  serializeCase,
} from "../lib/counselorCases";

const listCasesQuerySchema = z.object({
  status: z
    .string()
    .optional()
    .transform((s) =>
      s
        ? s.split(",").map((x) => x.trim()).filter(Boolean)
        : undefined,
    ),
});

const createCaseBodySchema = z.object({
  plate_number: z.string().min(1, "차량번호를 입력해주세요."),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  mileage: z.number().int().nonnegative().optional(),
  memo: z.string().optional(),
});

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const counselorCaseRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/api/cases",
    { preHandler: [app.requireCounselor] },
    async (request, reply) => {
      const parsed = listCasesQuerySchema.safeParse(request.query);

      if (!parsed.success) {
        return reply.status(400).send({
          message: "잘못된 요청입니다.",
        });
      }

      const counselor = request.counselor;

      if (!counselor) {
        return reply.status(401).send({
          message: "인증이 필요합니다.",
        });
      }

      const cases = await listCases({
        workshopId: counselor.workshop_id,
        statusFilter: parsed.data.status,
      });

      return {
        cases: cases.map(serializeCase),
      };
    },
  );

  app.post(
    "/api/cases",
    { preHandler: [app.requireCounselor] },
    async (request, reply) => {
      const parsed = createCaseBodySchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          message: "입력 값이 올바르지 않습니다.",
        });
      }

      const counselor = request.counselor;

      if (!counselor) {
        return reply.status(401).send({
          message: "인증이 필요합니다.",
        });
      }

      const createdCase = await createCaseWithVehicle({
        workshopId: counselor.workshop_id,
        userId: counselor.id,
        plateNumber: parsed.data.plate_number,
        customerName: parsed.data.customer_name ?? null,
        customerPhone: parsed.data.customer_phone ?? null,
        mileage: parsed.data.mileage ?? null,
        memo: parsed.data.memo ?? null,
      });

      return reply.status(201).send({
        case: serializeCase(createdCase),
      });
    },
  );

  app.delete(
    "/api/cases/:id",
    { preHandler: [app.requireCounselor] },
    async (request, reply) => {
      const parsed = paramsSchema.safeParse(request.params);

      if (!parsed.success) {
        return reply.status(400).send({
          message: "잘못된 요청입니다.",
        });
      }

      const counselor = request.counselor;

      if (!counselor) {
        return reply.status(401).send({
          message: "인증이 필요합니다.",
        });
      }

      const result = await deleteCase(parsed.data.id, counselor.workshop_id);

      if (!result.found) {
        return reply.status(404).send({
          message: "케이스를 찾을 수 없습니다.",
        });
      }

      if (result.forbidden) {
        return reply.status(403).send({
          message: "권한이 없습니다.",
        });
      }

      return { success: true };
    },
  );
};
