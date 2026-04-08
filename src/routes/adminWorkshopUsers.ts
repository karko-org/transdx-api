import type { FastifyPluginAsync } from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { findWorkshopById } from "../lib/adminWorkshops";
import {
  createWorkshopUser,
  deleteWorkshopUser,
  findUserByUsername,
  findWorkshopUserById,
  listWorkshopUsers,
  managedUserRoles,
  serializeWorkshopUser,
  updateWorkshopUser,
} from "../lib/adminWorkshopUsers";

const managedRoleSchema = z.enum(managedUserRoles);

const createWorkshopUserSchema = z.object({
  username: z.string().trim().min(1).max(50),
  password: z.string().min(1).max(200),
  name: z.string().trim().min(1).max(50),
  role: managedRoleSchema,
});

const updateWorkshopUserSchema = z.object({
  username: z.string().trim().min(1).max(50).optional(),
  password: z.string().min(1).max(200).optional(),
  name: z.string().trim().min(1).max(50).optional(),
  role: managedRoleSchema.optional(),
  is_active: z.boolean().optional(),
});

export const adminWorkshopUserRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/api/admin/workshops/:id/users",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const { id: idParam } = request.params as { id: string };
      const workshopId = Number(idParam);

      if (!Number.isInteger(workshopId)) {
        return reply.status(400).send({ message: "잘못된 워크샵 ID입니다." });
      }

      const workshop = await findWorkshopById(workshopId);

      if (!workshop) {
        return reply.status(404).send({ message: "워크샵을 찾을 수 없습니다." });
      }

      const users = await listWorkshopUsers(workshopId);
      return { users: users.map(serializeWorkshopUser) };
    },
  );

  app.post(
    "/api/admin/workshops/:id/users",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const { id: idParam } = request.params as { id: string };
      const workshopId = Number(idParam);

      if (!Number.isInteger(workshopId)) {
        return reply.status(400).send({ message: "잘못된 워크샵 ID입니다." });
      }

      const parsed = createWorkshopUserSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({ message: "입력값을 확인해주세요." });
      }

      const workshop = await findWorkshopById(workshopId);

      if (!workshop) {
        return reply.status(404).send({ message: "워크샵을 찾을 수 없습니다." });
      }

      const existingUser = await findUserByUsername(parsed.data.username);

      if (existingUser) {
        return reply.status(409).send({ message: "이미 사용 중인 아이디입니다." });
      }

      const user = await createWorkshopUser({
        workshopId,
        ...parsed.data,
      });

      return reply.status(201).send({
        user: serializeWorkshopUser(user),
      });
    },
  );

  app.put(
    "/api/admin/workshops/:id/users/:userId",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const { id: idParam, userId: userIdParam } = request.params as {
        id: string;
        userId: string;
      };
      const workshopId = Number(idParam);
      const userId = Number(userIdParam);

      if (!Number.isInteger(workshopId) || !Number.isInteger(userId)) {
        return reply.status(400).send({ message: "잘못된 요청입니다." });
      }

      const parsed = updateWorkshopUserSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({ message: "입력값을 확인해주세요." });
      }

      const workshop = await findWorkshopById(workshopId);

      if (!workshop) {
        return reply.status(404).send({ message: "워크샵을 찾을 수 없습니다." });
      }

      const existingUser = await findWorkshopUserById(workshopId, userId);

      if (!existingUser) {
        return reply.status(404).send({ message: "유저를 찾을 수 없습니다." });
      }

      if (existingUser.role === "admin") {
        return reply.status(400).send({
          message: "관리자 계정은 이 화면에서 수정할 수 없습니다.",
        });
      }

      if (
        parsed.data.username &&
        parsed.data.username !== existingUser.username
      ) {
        const duplicatedUser = await findUserByUsername(parsed.data.username);

        if (duplicatedUser) {
          return reply.status(409).send({ message: "이미 사용 중인 아이디입니다." });
        }
      }

      const user = await updateWorkshopUser(userId, parsed.data);

      return {
        user: serializeWorkshopUser(user),
      };
    },
  );

  app.delete(
    "/api/admin/workshops/:id/users/:userId",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const { id: idParam, userId: userIdParam } = request.params as {
        id: string;
        userId: string;
      };
      const workshopId = Number(idParam);
      const userId = Number(userIdParam);

      if (!Number.isInteger(workshopId) || !Number.isInteger(userId)) {
        return reply.status(400).send({ message: "잘못된 요청입니다." });
      }

      const workshop = await findWorkshopById(workshopId);

      if (!workshop) {
        return reply.status(404).send({ message: "워크샵을 찾을 수 없습니다." });
      }

      const existingUser = await findWorkshopUserById(workshopId, userId);

      if (!existingUser) {
        return reply.status(404).send({ message: "유저를 찾을 수 없습니다." });
      }

      if (existingUser.role === "admin") {
        return reply.status(400).send({
          message: "관리자 계정은 이 화면에서 삭제할 수 없습니다.",
        });
      }

      try {
        await deleteWorkshopUser(userId);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2003"
        ) {
          return reply.status(409).send({
            message: "연결된 데이터가 있어 유저를 삭제할 수 없습니다. 비활성화로 관리해주세요.",
          });
        }

        throw error;
      }

      return reply.status(204).send();
    },
  );
};
