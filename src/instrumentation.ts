export async function register() {
  // Skip during `next build` — env vars are validated at runtime, not compile time.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnvOnStartup } = await import("@/lib/env");
    validateEnvOnStartup();
  }
}
