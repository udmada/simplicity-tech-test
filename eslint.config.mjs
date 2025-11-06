import path from "node:path";
import { fileURLToPath } from "node:url";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const tsProjects = [
  "./packages/finance-client/tsconfig.json",
  "./packages/finance-client/tsconfig.eslint.json",
  "./packages/finance-powertools/tsconfig.json",
  "./packages/finance-powertools/tsconfig.eslint.json",
  "./packages/finance-powertools/tsconfig.cjs.json",
  "./apps/web/tsconfig.json",
  "./apps/web/tsconfig.eslint.json",
];

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/*.d.ts",
      "pnpm-lock.yaml",
    ],
  },
  // Config for .mjs files (config files, etc.)
  {
    files: ["**/*.mjs"],
    ...eslint.configs.recommended,
    languageOptions: {
      sourceType: "module",
      ecmaVersion: "latest",
    },
  },
  // TypeScript configs with files scope
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["**/*.ts", "**/*.tsx"],
  })),
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ["**/*.ts", "**/*.tsx"],
  })),
  // TypeScript-specific overrides
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: tsProjects.map((project) => path.resolve(__dirname, project)),
        tsconfigRootDir: __dirname,
      },
      globals: {
        vi: "readonly",
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        beforeAll: "readonly",
        afterEach: "readonly",
        afterAll: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  // Disable formatting rules (handled by Prettier separately)
  eslintConfigPrettier
);
