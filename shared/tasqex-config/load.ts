import fs from "node:fs";
import path from "node:path";
import {
  TASQEX_CONFIG_VERSION,
  type TasqexConfig,
} from "./types";

export function resolveConfigPath(rootDir: string): string {
  const configured = process.env.TASQEX_CONFIG_FILE;
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.join(rootDir, configured);
  }
  return path.join(rootDir, "config/tasqex.config.json");
}

export function resolveExampleConfigPath(rootDir: string): string {
  return path.join(rootDir, "config/tasqex.config.example.json");
}

export function loadTasqexConfig(rootDir: string): TasqexConfig {
  const configPath = resolveConfigPath(rootDir);
  const examplePath = resolveExampleConfigPath(rootDir);

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Missing ${path.relative(rootDir, configPath)}. Run \`pnpm tasqex init\` or copy ${path.relative(rootDir, examplePath)}.`,
    );
  }

  const raw = fs.readFileSync(configPath, "utf8");
  return JSON.parse(raw) as TasqexConfig;
}

export function assertConfigShape(config: TasqexConfig): void {
  if (config.version !== TASQEX_CONFIG_VERSION) {
    throw new Error(
      `Unsupported config version ${String(config.version)}. Expected ${TASQEX_CONFIG_VERSION}.`,
    );
  }

  if (!config.channels || typeof config.channels !== "object") {
    throw new Error("config.channels is required");
  }

  if (!config.integrations || typeof config.integrations !== "object") {
    throw new Error("config.integrations is required");
  }
}
