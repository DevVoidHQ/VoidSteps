import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: "jsdom",
      include: ["app/**/*.test.{ts,tsx}"],
      setupFiles: ["./app/test/setup.ts"],
    },
  })
);
