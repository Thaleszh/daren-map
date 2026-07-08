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
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "html"],
      include: ["src/**/*.{ts,tsx}"],
      // Not testable-in-isolation code: the app shell wiring, static data, the
      // dev-only annotate editor, pure style tables, and generated types.
      exclude: [
        "src/main.tsx",
        "src/vite-env.d.ts",
        "src/data/**",
        "src/annotate/**",
        "src/**/*Style.ts",
        "src/test/**",
      ],
      // Gate the framework-free domain — the part with real logic and no excuse
      // to be untested. Component coverage is reported but not gated (yet).
      // Floors set a few points below current (stmts 97 / branch 85 / funcs 100
      // / lines 98) so a small regression is caught without spurious CI breaks.
      thresholds: {
        "src/domain/**": { statements: 93, branches: 80, functions: 95, lines: 93 },
      },
    },
  },
});
