import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  lookupVehicleByPlate,
  serializeVehicle,
} from "../lib/counselorVehicles";

const lookupQuerySchema = z.object({
  plate_number: z.string().min(1, "plate_number가 필요합니다."),
});

export const counselorVehicleRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/api/vehicles",
    { preHandler: [app.requireCounselor] },
    async (request, reply) => {
      const parsed = lookupQuerySchema.safeParse(request.query);

      if (!parsed.success) {
        return reply.status(400).send({
          message: "plate_number가 필요합니다.",
        });
      }

      const vehicle = await lookupVehicleByPlate(parsed.data.plate_number);

      if (!vehicle) {
        return reply.status(404).send({
          message: "차량을 찾을 수 없습니다.",
        });
      }

      return {
        vehicle: serializeVehicle(vehicle),
      };
    },
  );
};
