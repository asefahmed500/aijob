import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["app/**/*.tsx", "components/auth/**/*.tsx", "components/layout/**/*.tsx", "hooks/**/*.ts"],
    rules: {
      // Client pages read tenant data from the NestJS API (separate service,
      // no server component data layer). The async loaders set state after the
      // request resolves; moving them to use() requires a hosting change.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The NestJS backend has its own build/test pipeline; generated Prisma code
    // is not authored source and must not be linted with the frontend config.
    "server/**",
  ]),
]);

export default eslintConfig;
