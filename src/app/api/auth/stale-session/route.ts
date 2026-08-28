import { signOut } from "@/auth";

/** Clears a JWT whose user no longer exists (e.g. after DB migration). */
export async function GET() {
  return signOut({ redirectTo: "/login?reason=stale-session" });
}
