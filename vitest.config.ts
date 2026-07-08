import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

// Domain logic is framework-free and runs in a plain node environment; component
// tests (*.test.tsx) opt into jsdom with a `// @vitest-environment jsdom`
// docblock. Mirrors the `@` alias from vite.config.ts so tests import the same
// way the app does. setup.ts registers jest-dom matchers + DOM cleanup.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/test/setup.ts"],
  },
});
