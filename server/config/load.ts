import fs from "node:fs";
import path from "node:path";
import {
  assertConfigShape,
  loadTasqexConfig as loadSharedConfig,
  resolveConfigPath as resolveSharedConfigPath,
  resolveExampleConfigPath,
} from "@shared/tasqex-config/load";
import type { TasqexConfig } from "@shared/tasqex-config/types";

function projectRoot(): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), ".");
}

export function resolveConfigPath(configPath?: string): string {
  if (configPath) {
    return path.isAbsolute(configPath)
      ? configPath
      : path.join(projectRoot(), configPath);
  }

  return resolveSharedConfigPath(projectRoot());
}

function readAndAssertConfig(filePath: string): TasqexConfig {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing config file ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const config = JSON.parse(raw) as TasqexConfig;
  assertConfigShape(config);
  return config;
}

export function loadTasqexConfig(configPath?: string): TasqexConfig {
  if (configPath) {
    return readAndAssertConfig(resolveConfigPath(configPath));
  }

  const config = loadSharedConfig(projectRoot());
  assertConfigShape(config);
  return config;
}

export function defaultTasqexConfig(): TasqexConfig {
  return loadTasqexConfig();
}

export { resolveExampleConfigPath };
