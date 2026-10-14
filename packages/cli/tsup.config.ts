import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/main.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  clean: true,
  dts: true,
  sourcemap: true,
  splitting: false,
  external: ["@tasqex/api-client", "commander"],
  noExternal: ["@tasqex/api-spec"],
});
