import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import desktopConfig from "./desktop/tauri.conf.json";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: { headers: { "Content-Security-Policy": desktopConfig.app.security.csp } },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./app"),
    },
  },
});
