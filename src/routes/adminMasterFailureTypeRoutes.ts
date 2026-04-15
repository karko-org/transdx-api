import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  createFailureType,
  deleteFailureType,
  findFailureTypeByCode,
  findFailureTypeById,
  getNextFailureTypeSortOrder,
  listFailureTypes,
  serializeFailureType,
  updateFailureType,
} from "../lib/adminMasterFailureTypes";

const idSchema = z.coerce.number().int().positive();

const failureTypeCreateSchema = z.object({
  code: z.string().trim().min(1).max(20),
  display_name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(5000).nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
});

const failureTypeUpdateSchema = z.object({
  code: z.string().trim().min(1).max(20).optional(),
  display_name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

export const adminMasterFailureTypeRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/api/admin/master/failure-types",
    { preHandler: [app.requireAdmin] },
    async () => {
      const failureTypes = await listFailureTypes();
      return { failure_types: failureTypes.map(serializeFailureType) };
    },
  );

  app.get(
    "/api/admin/master/failure-types/:id",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsedId = idSchema.safeParse((request.params as { id: string }).id);
      if (!parsedId.success) {
        return reply.status(400).send({ message: "잘못된 고장유형 ID입니다." });
      }

      const failureType = await findFailureTypeById(parsedId.data);
      if (!failureType) {
        return reply.status(404).send({ message: "고장유형을 찾을 수 없습니다." });
      }

      return { failure_type: serializeFailureType(failureType) };
    },
  );

  app.post(
    "/api/admin/master/failure-types",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsed = failureTypeCreateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ message: "입력값을 확인해주세요." });
      }

      const duplicated = await findFailureTypeByCode(parsed.data.code);
      if (duplicated) {
        return reply.status(409).send({ message: "이미 사용 중인 고장유형 코드입니다." });
      }

      const failureType = await createFailureType({
        ...parsed.data,
        sort_order: parsed.data.sort_order ?? (await getNextFailureTypeSortOrder()),
      });
      return reply.status(201).send({
        failure_type: serializeFailureType({
          ...failureType,
          _count: {
            diagnosis_rules: 0,
            repair_estimate_items: 0,
            diagnosis_run_candidates: 0,
            diagnosis_run_selections: 0,
          },
        }),
      });
    },
  );

  app.put(
    "/api/admin/master/failure-types/:id",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsedId = idSchema.safeParse((request.params as { id: string }).id);
      if (!parsedId.success) {
        return reply.status(400).send({ message: "잘못된 고장유형 ID입니다." });
      }

      const parsed = failureTypeUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ message: "입력값을 확인해주세요." });
      }

      const existing = await findFailureTypeById(parsedId.data);
      if (!existing) {
        return reply.status(404).send({ message: "고장유형을 찾을 수 없습니다." });
      }

      if (parsed.data.code && parsed.data.code !== existing.code) {
        const duplicated = await findFailureTypeByCode(parsed.data.code);
        if (duplicated) {
          return reply.status(409).send({ message: "이미 사용 중인 고장유형 코드입니다." });
        }
      }

      const failureType = await updateFailureType(parsedId.data, parsed.data);
      return { failure_type: serializeFailureType(failureType) };
    },
  );

  app.delete(
    "/api/admin/master/failure-types/:id",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsedId = idSchema.safeParse((request.params as { id: string }).id);
      if (!parsedId.success) {
        return reply.status(400).send({ message: "잘못된 고장유형 ID입니다." });
      }

      const existing = await findFailureTypeById(parsedId.data);
      if (!existing) {
        return reply.status(404).send({ message: "고장유형을 찾을 수 없습니다." });
      }

      if (
        existing._count.diagnosis_rules > 0 ||
        existing._count.repair_estimate_items > 0 ||
        existing._count.diagnosis_run_candidates > 0 ||
        existing._count.diagnosis_run_selections > 0
      ) {
        return reply.status(409).send({
          message: "연결된 진단/견적 데이터가 있는 고장유형은 삭제할 수 없습니다. 비활성화로 관리해주세요.",
        });
      }

      await deleteFailureType(parsedId.data);
      return reply.status(204).send();
    },
  );
};
