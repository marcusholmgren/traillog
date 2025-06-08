// vitest.config.ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig({
  plugins: [tsconfigPaths()], // Use tsconfig paths but don't include the react-router plugin
  test: {
    globals: true,
    environment: "jsdom", // Ensure JSDOM environment for components using DOM
    setupFiles: ["./app/test-setup.ts", "fake-indexeddb/auto"], // Include any global setup files
    exclude: ["node_modules", "dist", ".react-router", "build"],
    include: ["**/*.test.{ts,tsx}"],
    // deps: {
    //   optimizer: {
    //     web: {
    //       include: ["leaflet", "react-leaflet"],
    //     },
    //   },
    //   // inline: ['leaflet', 'react-leaflet'], // Automatically mock these modules in tests
    // },
  },
  // resolve: {
  //   alias: {
  //     // Ensure any imports to these modules use our test mocks
  //     leaflet: path.resolve(__dirname, "./app/mock-leaflet.js"),
  //   },
  // },
  // css: {
  //   // Handle CSS imports in tests (just parse them but don't process)
  //   modules: {
  //     // Allow CSS modules but treat them as noop in tests
  //     localsConvention: "camelCase",
  //   },
  // },
});
