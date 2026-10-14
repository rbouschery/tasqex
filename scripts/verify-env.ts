/**
 * Quick sanity check that local Supabase env is wired.
 * Does not start services — run after `pnpm db:env` and before `pnpm dev`.
 */
import { loadEnvLocalIfPresent } from "./lib/load-env-local";

loadEnvLocalIfPresent();

const checks: { name: string; ok: boolean; hint?: string }[] = [];

function requireEnv(key: string, hint?: string) {
  const ok = Boolean(process.env[key]);
  checks.push({ name: key, ok, hint });
}

requireEnv("NEXT_PUBLIC_SUPABASE_URL", "pnpm db:env");
requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "pnpm db:env");
requireEnv("SUPABASE_SECRET_KEY", "pnpm db:env");

let failed = 0;
for (const { name, ok, hint } of checks) {
  const mark = ok ? "ok" : "MISSING";
  console.log(`${mark.padEnd(8)} ${name}${hint && !ok ? ` — ${hint}` : ""}`);
  if (!ok) failed++;
}

if (failed) {
  console.error(
    `\n${failed} required variable(s) missing. Run pnpm db:env for Supabase keys.`,
  );
  process.exit(1);
}

console.log("\nSupabase env looks ready for pnpm dev");
