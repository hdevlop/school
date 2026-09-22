import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "react/display-name": "off",
      "react/jsx-key": "off",
      "react/jsx-no-comment-textnodes": "off",
      "react/jsx-no-duplicate-props": "off",
      "react/jsx-no-undef": "off",
      "react/jsx-uses-react": "off",
      "react/jsx-uses-vars": "off",
      "react/no-children-prop": "off",
      "react/no-danger-with-children": "off",
      "react/no-deprecated": "off",
      "react/no-direct-mutation-state": "off",
      "react/no-find-dom-node": "off",
      "react/no-is-mounted": "off",
      "react/no-render-return-value": "off",
      "react/no-string-refs": "off",
      "react/no-unescaped-entities": "off",
      "react/require-render-return": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/static-components": "off",
      "@typescript-eslint/ban-types": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_", "caughtErrorsIgnorePattern": "^_" }],
      "prefer-const": "warn",
      // The dashboard is App Router only. With no pages/ directory the rule
      // has nothing to check and only warns when lint runs from the root.
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  {
    // Two boundaries the dashboard spent a long migration establishing, and
    // which nothing in the type system would stop a future import from
    // crossing again.
    files: ["apps/dashboard/src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [
          {
            name: "@/lib/validations",
            message:
              "Form schemas and their field primitives are owned by the feature that binds them: features/<Feature>/config/<feature>Schemas.ts.",
          },
          {
            name: "@/lib/ZodEnum",
            message:
              "Build the Zod enum from the shared tuple instead: z.enum(SOMETHING_VALUES) with SOMETHING_VALUES imported from @sms/contracts.",
          },
          {
            name: "@/lib/ENUMS",
            message:
              "Shared domain values live in @sms/contracts. Labels and translation keys belong to the feature that renders them.",
          },
          {
            name: "@/hooks/useEnum",
            message:
              "Selects are built by typed, self-contained feature option builders in features/<Feature>/config/<feature>Options.ts.",
          },
        ],
        patterns: [
          {
            // @sms/contracts is browser-safe; the server's own modules are
            // not, and reaching into them from a component pulls Drizzle and
            // the database driver toward the browser. The complete graph rule
            // is scripts/check-workspace-boundaries.mjs; this is the fast
            // editor-time hint for the most common mistake.
            group: ["@server/*", "@sms/server/modules", "@sms/server/modules/*", "@sms/seed", "@sms/seed/*"],
            message:
              "Do not import server or seed code from the dashboard. Shared values, catalogs and fixtures come from @sms/contracts (./locales, ./fixtures).",
          },
        ],
      }],
    },
  },
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "libs/**",
    "storage/**",
    "next-env.d.ts",
  ]),
]);
