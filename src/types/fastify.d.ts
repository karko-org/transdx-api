import "@fastify/jwt";
import "fastify";
import type { AdminSessionUser } from "../lib/adminAuth";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      username: string;
      role: string;
    };
    user: {
      sub: string;
      username: string;
      role: string;
    };
  }
}

declare module "fastify" {
  interface FastifyRequest {
    adminUser: AdminSessionUser | null;
  }

  interface FastifyInstance {
    authenticate: (
      request: import("fastify").FastifyRequest,
      reply: import("fastify").FastifyReply,
    ) => Promise<void>;
    requireAdmin: (
      request: import("fastify").FastifyRequest,
      reply: import("fastify").FastifyReply,
    ) => Promise<void>;
  }
}
