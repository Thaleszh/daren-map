import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

// Domain logic is framework-free, so tests run in a plain node environment (no
// jsdom). Mirrors the `@` alias from vite.config.ts so tests import the same way
// the app does.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
