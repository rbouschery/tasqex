import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import type { Interface as ReadlineInterface } from "node:readline/promises";
import {
  closeReadline,
  createReadline,
  runPnpm,
  runSupabase,
} from "./lib/run-command";
import {
  resolveConfigPath,
  type TicqexConfig,
} from "@server/config";
import {
  readOrCreateEnvFile,
  setEnvLine,
  writeEnvFile,
} from "./lib/env-file";

type DbSetupMode = "skip" | "start" | "reset";
type SupabaseTarget = "local" | "skip";

const ROOT = path.resolve(import.meta.dirname, "..");
const ENV_EXAMPLE = path.join(ROOT, ".env.example");

function rootPath(value: string): string {
  return path.isAbsolute(value) ? value : path.join(ROOT, value);
}

const ENV_FILE = rootPath(process.env.TICQEX_ENV_FILE ?? ".env.local");
const CONFIG_FILE = resolveConfigPath(
  process.env.TICQEX_CONFIG_FILE ?? "config/ticqex.config.json",
);

function printRootUsage(): void {
  console.log(`Usage: pnpm ticqex <command> [options]

Commands:
  init          Interactive local setup (Supabase, env, config sync)

Options:
  --help        Show help for ticqex or a subcommand.
`);
}

function printInitUsage(): void {
  console.log(`Usage: pnpm ticqex init [options]

Options:
  --supabase <local|skip>
               Choose local Supabase setup target. Defaults to interactive.
  --skip-db    Alias for --supabase skip.
  --help       Show this help.
`);
}

function optionValue(args: string[], name: string): string | null {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);

  const index = args.indexOf(name);
  if (index === -1) return null;
  return args[index + 1] ?? null;
}

function parseSupabaseTarget(args: string[]): SupabaseTarget | null {
  if (args.includes("--skip-db")) return "skip";

  const value = optionValue(args, "--supabase");
  if (!value) return null;
  if (value === "local" || value === "skip") return value;
  throw new Error("--supabase must be one of: local, skip");
}

function readEnvContent(): string {
  return readOrCreateEnvFile(ENV_FILE, ENV_EXAMPLE);
}

function getEnvValue(content: string, key: string): string | null {
  const match = content.match(new RegExp(`^${key}=(.*)$`, "m"));
  const value = match ? match[1]!.trim() : null;
  if (!value || isPlaceholderEnvValue(value)) return null;
  return value;
}

function isPlaceholderEnvValue(value: string): boolean {
  return (
    value.endsWith("...") ||
    value.startsWith("your-") ||
    value.includes("@yourdomain.")
  );
}

function displayPath(filePath: string): string {
  const relative = path.relative(ROOT, filePath);
  return relative.startsWith("..") ? filePath : relative;
}

function hasSupabaseEnv(content: string): boolean {
  return [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
  ].every((key) => Boolean(getEnvValue(content, key)));
}

function writeConfig(config: TicqexConfig): void {
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
  fs.writeFileSync(CONFIG_FILE, `${JSON.stringify(config, null, 2)}\n`);
}

async function prompt(
  rl: ReadlineInterface,
  label: string,
  defaultValue?: string,
): Promise<string> {
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  const answer = (await rl.question(`${label}${suffix}: `)).trim();
  return answer || defaultValue || "";
}

async function promptYesNo(
  rl: ReadlineInterface,
  label: string,
  defaultValue: boolean,
): Promise<boolean> {
  const suffix = defaultValue ? "Y/n" : "y/N";
  while (true) {
    const answer = (await rl.question(`${label} [${suffix}]: `))
      .trim()
      .toLowerCase();
    if (!answer) return defaultValue;
    if (["y", "yes"].includes(answer)) return true;
    if (["n", "no"].includes(answer)) return false;
    console.log("Please answer yes or no.");
  }
}

async function promptChoice<T extends string>(
  rl: ReadlineInterface,
  label: string,
  choices: readonly T[],
  defaultValue: T,
): Promise<T> {
  while (true) {
    const answer = (await prompt(
      rl,
      `${label} (${choices.join("/")})`,
      defaultValue,
    )) as T;
    if (choices.includes(answer)) return answer;
    console.log(`Please choose one of: ${choices.join(", ")}`);
  }
}

async function promptEnvValue(
  rl: ReadlineInterface,
  content: string,
  key: string,
  options: {
    label?: string;
    required?: boolean;
    defaultValue?: string;
  } = {},
): Promise<string> {
  const existing = getEnvValue(content, key);
  const processValue = process.env[key];
  const hint = existing
    ? "leave blank to keep current"
    : processValue
      ? "leave blank to use current process env only"
      : undefined;

  while (true) {
    const suffix = hint ? ` (${hint})` : "";
    const defaultValue = existing ?? options.defaultValue;
    const answer = await prompt(
      rl,
      `${options.label ?? key}${suffix}`,
      defaultValue,
    );

    if (answer) return answer;
    if (existing || processValue || !options.required) return "";

    console.log(`${key} is required for this integration.`);
  }
}

async function setupSupabase(
  rl: ReadlineInterface,
  requestedTarget: SupabaseTarget | null,
): Promise<ReadlineInterface> {
  const target =
    requestedTarget ??
    (await promptChoice(
      rl,
      "\nSupabase setup",
      ["local", "skip"] as const,
      "local",
    ));

  if (target === "skip") {
    console.log("\nSkipping Supabase setup.");
    return rl;
  }

  const envContent = readEnvContent();
  const defaultMode: DbSetupMode = hasSupabaseEnv(envContent) ? "skip" : "start";
  const mode = await promptChoice(
    rl,
    "\nLocal Supabase setup",
    ["skip", "start", "reset"] as const,
    defaultMode,
  );

  if (mode === "skip") return rl;

  if (mode === "reset") {
    const confirmed = await promptYesNo(
      rl,
      "Reset wipes the local Supabase database. Continue?",
      true,
    );
    if (!confirmed) return rl;
    closeReadline(rl);
    runSupabase(["db", "reset", "--yes"]);
    rl = createReadline();
  } else {
    closeReadline(rl);
    runSupabase(["start"]);
    rl = createReadline();
    runPnpm(["db:bootstrap"]);
  }

  closeReadline(rl);
  runPnpm(["db:env"]);
  rl = createReadline();

  const seedAdmin = await promptYesNo(
    rl,
    "Seed the local admin user now?",
    true,
  );
  if (seedAdmin) {
    runPnpm(["db:seed-admin"]);
  }

  return rl;
}

async function configureApp(rl: ReadlineInterface): Promise<void> {
  let envContent = readEnvContent();
  const appUrl = await promptEnvValue(rl, envContent, "NEXT_PUBLIC_APP_URL", {
    label: "App URL",
    required: true,
    defaultValue: "http://localhost:3000",
  });
  if (appUrl) {
    envContent = setEnvLine(envContent, "NEXT_PUBLIC_APP_URL", appUrl);
  }

  writeConfig({ version: 1, channels: {}, integrations: {} });
  writeEnvFile(ENV_FILE, envContent);

  console.log("\nWrote:");
  console.log(`  ${displayPath(ENV_FILE)}`);
  console.log(`  ${displayPath(CONFIG_FILE)}`);
}

function ensureWorkspacePackagesBuilt(): void {
  const apiSpecEntry = path.join(ROOT, "packages/api-spec/dist/index.js");
  if (fs.existsSync(apiSpecEntry)) return;

  console.log("Building workspace packages...");
  runPnpm(["build:packages"]);
}

async function init(args: string[]): Promise<void> {
  const supabaseTarget = parseSupabaseTarget(args);
  let rl = createReadline();

  try {
    ensureWorkspacePackagesBuilt();
    console.log("Ticqex init\n");
    rl = await setupSupabase(rl, supabaseTarget);
    await configureApp(rl);
  } finally {
    rl.close();
  }

  runPnpm(["config:sync"]);
  console.log(
    "\nInit complete. Run `pnpm dev` to start the app.",
  );
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "help") {
    printRootUsage();
    return;
  }

  const [command, ...args] = argv;

  if (command === "init") {
    if (args.includes("--help")) {
      printInitUsage();
      return;
    }
    await init(args);
    return;
  }

  console.error(`Unknown command: ${command}`);
  printRootUsage();
  process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
