import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  // Load env file based on mode (development, production, etc.)
  const env = loadEnv(mode, process.cwd(), ""); // Load all env variables

  return {
    plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
    base: env.BASE_URL || "/", // Set base path from BASE_URL env var, default to '/'
  };
});
