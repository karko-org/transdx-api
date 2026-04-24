import "dotenv/config";
import Fastify from "fastify";
import { adminMasterFailureTypeRoutes } from "./routes/adminMasterFailureTypeRoutes";
import { adminMasterSymptomRoutes } from "./routes/adminMasterSymptomRoutes";
import { registerAuth } from "./plugins/auth";
import { adminAuthRoutes } from "./routes/adminAuth";
import { adminWorkshopUserRoutes } from "./routes/adminWorkshopUsers";
import { adminWorkshopRoutes } from "./routes/adminWorkshops";
import { counselorAuthRoutes } from "./routes/counselorAuthRoutes";
import { counselorCaseRoutes } from "./routes/counselorCaseRoutes";
import { counselorVehicleRoutes } from "./routes/counselorVehicleRoutes";

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

const app = Fastify({
  logger: {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname",
      },
    },
  },
});

await registerAuth(app);

app.get("/api/health", async () => {
  return { status: "ok" };
});

await app.register(adminAuthRoutes);
await app.register(adminWorkshopRoutes);
await app.register(adminWorkshopUserRoutes);
await app.register(adminMasterSymptomRoutes);
await app.register(adminMasterFailureTypeRoutes);
await app.register(counselorAuthRoutes);
await app.register(counselorCaseRoutes);
await app.register(counselorVehicleRoutes);

app.listen({ port: PORT, host: HOST }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`🚗 KAR Backend running at http://${HOST}:${PORT}`);
});
