import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import type { UserConfig as VitestUserConfigInterface } from "vitest/config";

import path from "path"; // Needed for resolve.alias

const vitestConfig: VitestUserConfigInterface["test"] = {
  globals: true,
  environment: "jsdom", // Ensure JSDOM environment for navigator
  setupFiles: ["./app/test-setup.ts", "./app/test-setup-mocks.tsx"], // Path to setup files
};

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  test: vitestConfig, // Add the 'test' property here
  resolve: {
    alias: {
      // Alias 'leaflet' to the mock module for SSR/build
      // 'leaflet': path.resolve(__dirname, './app/mock-leaflet.js'),
    },
  },
  // Ensure CSS imports don't fail during testing
  css: {
    // Don't extract CSS during testing
    devSourcemap: true,
  },
});
