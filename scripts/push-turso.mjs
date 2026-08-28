import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@libsql/client";

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function splitSqlStatements(sql) {
  const chunks = [];
  let current = "";

  for (const line of sql.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("--")) continue;
    current += `${line}\n`;
    if (trimmed.endsWith(";")) {
      chunks.push(current.trim().replace(/;$/, ""));
      current = "";
    }
  }

  if (current.trim()) chunks.push(current.trim().replace(/;$/, ""));
  return chunks;
}

loadEnvFile();

const url = process.env.TURSO_DATABASE_URL?.trim();
const token = process.env.TURSO_AUTH_TOKEN?.trim();

if (!url || !token) {
  console.error(
    "Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env (create a token in the Turso dashboard)."
  );
  process.exit(1);
}

const sql = execSync(
  "npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script",
  { encoding: "utf8", env: { ...process.env, DATABASE_URL: "file:./dev.db" } }
);

const statements = splitSqlStatements(sql);
if (statements.length === 0) {
  console.error("No SQL statements generated from Prisma schema.");
  process.exit(1);
}

const client = createClient({ url, authToken: token });

try {
  for (const statement of statements) {
    await client.execute(`${statement};`);
  }
  console.log(`Applied ${statements.length} statements to Turso.`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("already exists")) {
    console.log("Schema already exists on Turso (tables present).");
  } else {
    console.error("Turso schema push failed:", message);
    process.exit(1);
  }
} finally {
  client.close();
}
