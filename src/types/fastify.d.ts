import "@fastify/jwt";
import "fastify";
import type { AdminSessionUser } from "../lib/adminAuth";
import type { CounselorSessionUser } from "../lib/counselorAuth";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      username: string;
      role: string;
      type?: string;
      user_id?: number;
      workshop_id?: number;
    };
    user: {
      sub: string;
      username: string;
      role: string;
      type?: string;
      user_id?: number;
      workshop_id?: number;
    };
  }
}

declare module "fastify" {
  interface FastifyRequest {
    adminUser: AdminSessionUser | null;
    counselor: CounselorSessionUser | null;
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
    requireCounselor: (
      request: import("fastify").FastifyRequest,
      reply: import("fastify").FastifyReply,
    ) => Promise<void>;
  }
}
