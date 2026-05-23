import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  // Load env file based on mode (development, production, etc.)
  const env = loadEnv(mode, process.cwd(), ""); // Load all env variables

  return {
    plugins: [
      tailwindcss(),
      reactRouter(),
      VitePWA({
        registerType: "autoUpdate",
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff,woff2}"],
          navigateFallback: "index.html",
        },
        manifest: {
          name: "Traillog",
          short_name: "Traillog",
          description: "Privacy-First Trail Logging & Route Planning Companion",
          theme_color: "#1e3a8a",
          background_color: "#ffffff",
          display: "standalone",
          orientation: "portrait",
          icons: [
            {
              src: "traillog_icon.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },
      }),
    ],
    base: env.BASE_URL || "/", // Set base path from BASE_URL env var, default to '/'
    resolve: {
      tsconfigPaths: true,
    }
  };
});
