import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  createWorkshop,
  deleteWorkshop,
  findWorkshopById,
  listWorkshops,
  serializeWorkshop,
  updateWorkshop,
} from "../lib/adminWorkshops";

const createWorkshopSchema = z.object({
  name: z.string().min(1, "워크샵 이름을 입력해주세요.").max(100),
  address: z.string().max(200).optional(),
  phone: z.string().max(20).optional(),
});

const updateWorkshopSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().max(200).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  is_active: z.boolean().optional(),
});

export const adminWorkshopRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/admin/workshops — 목록 조회
  app.get(
    "/api/admin/workshops",
    { preHandler: [app.authenticate] },
    async () => {
      const workshops = await listWorkshops();
      return { workshops: workshops.map(serializeWorkshop) };
    },
  );

  // POST /api/admin/workshops — 생성
  app.post(
    "/api/admin/workshops",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = createWorkshopSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({ message: "입력값을 확인해주세요." });
      }

      const workshop = await createWorkshop(parsed.data);
      return reply.status(201).send({ workshop: serializeWorkshop(workshop) });
    },
  );

  // PUT /api/admin/workshops/:id — 수정
  app.put(
    "/api/admin/workshops/:id",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id: idParam } = request.params as { id: string };
      const id = Number(idParam);

      if (!Number.isInteger(id)) {
        return reply.status(400).send({ message: "잘못된 워크샵 ID입니다." });
      }

      const parsed = updateWorkshopSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({ message: "입력값을 확인해주세요." });
      }

      const existing = await findWorkshopById(id);
      if (!existing) {
        return reply.status(404).send({ message: "워크샵을 찾을 수 없습니다." });
      }

      const workshop = await updateWorkshop(id, parsed.data);
      return { workshop: serializeWorkshop(workshop) };
    },
  );

  // DELETE /api/admin/workshops/:id — 삭제
  app.delete(
    "/api/admin/workshops/:id",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id: idParam } = request.params as { id: string };
      const id = Number(idParam);

      if (!Number.isInteger(id)) {
        return reply.status(400).send({ message: "잘못된 워크샵 ID입니다." });
      }

      const existing = await findWorkshopById(id);
      if (!existing) {
        return reply.status(404).send({ message: "워크샵을 찾을 수 없습니다." });
      }

      if (existing._count.users > 0 || existing._count.cases > 0) {
        return reply.status(409).send({
          message: "소속 직원 또는 케이스가 있는 워크샵은 삭제할 수 없습니다.",
        });
      }

      await deleteWorkshop(id);
      return reply.status(204).send();
    },
  );
};
