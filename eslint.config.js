import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

// Flat config. Scoped to the app source (src/); the build/generator scripts and
// generated JSON are intentionally out of scope. tsc is the type gate — ESLint
// here is for the hook/closure and dead-code bugs the compiler can't see.
export default tseslint.config(
  { ignores: ["dist", "node_modules", "**/*.tsbuildinfo"] },
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
);
