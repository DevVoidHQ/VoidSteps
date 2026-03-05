import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://voidsteps.com",
  integrations: [react(), sitemap()],
  vite: {
    resolve: {
      alias: {
        "@": "/src",
      },
    },
  },
});
