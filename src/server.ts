import "dotenv/config";
import Fastify from "fastify";

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

app.get("/api/health", async () => {
  return { status: "ok" };
});

app.listen({ port: PORT, host: HOST }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`🚗 KAR Backend running at http://${HOST}:${PORT}`);
});