import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: "jsdom",
      include: ["app/**/*.test.{ts,tsx}"],
      coverage: {
        include: ["app/**/*.{ts,tsx}"],
        exclude: ["app/**/*.test.{ts,tsx}", "app/test/**", "app/types/**"],
      },
      setupFiles: ["./app/test/setup.ts"],
    },
  })
);
