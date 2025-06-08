import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import type { UserConfig as VitestUserConfigInterface } from "vitest/config";

import path from "path"; // Needed for resolve.alias

const vitestConfig: VitestUserConfigInterface["test"] = {
  globals: true,
  environment: "jsdom", // Ensure JSDOM environment for navigator
  setupFiles: ["./app/test-setup.ts"], // Path to my setup file
};

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  test: vitestConfig, // Add the 'test' property here
  resolve: {
    alias: {
      // Alias 'leaflet' to the mock module.
      // This might help the React Router plugin during its analysis phase.
      // 'leaflet': path.resolve(__dirname, './app/mock-leaflet.js'),
    },
  },
});
