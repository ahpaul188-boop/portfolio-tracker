import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEnvStatus } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = getEnvStatus();
  let database = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = true;
  } catch {
    database = false;
  }

  const healthy = database && env.authSecret;
  const status = healthy ? "ok" : "degraded";

  return NextResponse.json(
    {
      status,
      version: process.env.npm_package_version ?? "0.1.0",
      checks: {
        database,
        authSecret: env.authSecret,
        googleOAuth: env.googleOAuth,
        openrouter: env.openrouter,
      },
      envIssues: env.ok ? [] : env.issues,
    },
    { status: healthy ? 200 : 503 }
  );
}
