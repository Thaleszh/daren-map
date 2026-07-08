import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

// Flat config. Scoped to the app source (src/); the build/generator scripts and
// generated JSON are intentionally out of scope. tsc is the type gate — ESLint
// here is for the hook/closure and dead-code bugs the compiler can't see.
export default tseslint.config(
  { ignores: ["dist", "coverage", "node_modules", "**/*.tsbuildinfo"] },
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // The two classic, high-value hook rules — not the v7 React-Compiler
      // memoization rules, which this project (no compiler) doesn't want.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // Branded-id casts and Zod-inferred narrowing occasionally need an escape
      // hatch; require it to be explicit rather than silent.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  // Size caps for non-render logic only. `*.ts` (not `*.tsx`) targets the
  // framework-free domain/util/data code, where a long file or function is a
  // real smell — unlike JSX components, which get long legitimately. Tests and
  // the fixture are exempt (assertion-heavy by nature). skipBlankLines/Comments
  // so a well-documented file isn't punished for its comments.
  {
    files: ["src/**/*.ts"],
    ignores: ["src/**/*.test.ts", "src/**/*.d.ts", "src/domain/world.fixture.ts"],
    rules: {
      "max-lines": ["error", { max: 320, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": [
        "error",
        { max: 80, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
    },
  },
);
