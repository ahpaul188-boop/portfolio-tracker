export type EnvStatus = {
  ok: boolean;
  issues: string[];
  authSecret: boolean;
  databaseUrl: boolean;
  googleOAuth: boolean;
  openrouter: boolean;
  authUrl: string;
};

const DEFAULT_AUTH_URL = "http://localhost:3000";

export function getAuthUrl(): string {
  return process.env.AUTH_URL?.trim() || DEFAULT_AUTH_URL;
}

export function getGoogleRedirectUri(): string {
  const base = getAuthUrl().replace(/\/$/, "");
  return `${base}/api/auth/callback/google`;
}

export function getEnvStatus(): EnvStatus {
  const issues: string[] = [];
  const authSecret = process.env.AUTH_SECRET?.trim() ?? "";
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  const tursoUrl = process.env.TURSO_DATABASE_URL?.trim() ?? "";
  const tursoToken = process.env.TURSO_AUTH_TOKEN?.trim() ?? "";
  const hasDatabase =
    !!databaseUrl || (!!tursoUrl && !!tursoToken);
  const googleOAuth =
    !!process.env.GOOGLE_CLIENT_ID?.trim() &&
    !!process.env.GOOGLE_CLIENT_SECRET?.trim();
  const openrouter = !!process.env.OPENROUTER_API_KEY?.trim();

  if (!authSecret || authSecret === "change-me-to-a-random-secret") {
    issues.push("AUTH_SECRET is missing or still set to the example value");
  }
  if (!hasDatabase) {
    issues.push(
      "DATABASE_URL or TURSO_DATABASE_URL + TURSO_AUTH_TOKEN is not set"
    );
  }

  return {
    ok: issues.length === 0,
    issues,
    authSecret: !!authSecret && authSecret !== "change-me-to-a-random-secret",
    databaseUrl: hasDatabase,
    googleOAuth,
    openrouter,
    authUrl: getAuthUrl(),
  };
}

/** Log configuration issues at startup; /api/health reports degraded state. */
export function validateEnvOnStartup(): void {
  const status = getEnvStatus();
  if (status.ok) return;

  const message = `Environment configuration issues:\n- ${status.issues.join("\n- ")}`;
  console.error(`[env] ${message}`);
}
