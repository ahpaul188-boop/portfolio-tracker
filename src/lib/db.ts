import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function getTursoConfig(): { url: string; authToken: string } | null {
  const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
  const tursoToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (tursoUrl && tursoToken) {
    return { url: tursoUrl, authToken: tursoToken };
  }

  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  if (!databaseUrl.startsWith("libsql://")) return null;

  const [base, query] = databaseUrl.split("?");
  const authToken = new URLSearchParams(query ?? "").get("authToken")?.trim();
  if (!authToken) return null;

  return { url: base, authToken };
}

function createPrismaClient(): PrismaClient {
  const log =
    process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];

  const turso = getTursoConfig();
  if (turso) {
    const adapter = new PrismaLibSql({
      url: turso.url,
      authToken: turso.authToken,
    });
    return new PrismaClient({ adapter, log: log as ["error", "warn"] });
  }

  return new PrismaClient({ log: log as ["error", "warn"] });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
