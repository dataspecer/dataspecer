import eslint from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import { defineConfig } from "eslint/config";
import boundaries from "eslint-plugin-boundaries";
import reactHooks from "eslint-plugin-react-hooks";
// This introduce a dependency on zod@3 wich is in conflict
// with other packages that requires zod@4.
// import reactCompiler from "eslint-plugin-react-compiler";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import globals from "globals";

export default defineConfig([{
  ignores: [
    // Exclude distribution directory.
    "dist/**",
    // Tailwind configuration file using require.
    "tailwind.config.js"
  ],
}, {
  extends: [
    eslint.configs.recommended,
    // Error: typescript-eslint does not support TS 7.0.
    // tseslint.configs.recommended,
    reactHooks.configs.flat["recommended-latest"],
    reactRefresh.configs.recommended,
    reactRefresh.configs.vite,
    // reactCompiler.configs.recommended,
  ],
  languageOptions: {
    ecmaVersion: 2020,
    globals: globals.browser,
  },
  rules: {
    // Comments must start with a capital.
    "capitalized-comments": ["error", "always", {
      "ignoreConsecutiveComments": true
    }],
    // Use === and !==.
    "eqeqeq": ["error"],
    // Ban use of alert, confirm, and prompt.
    "no-alert": ["error"],
    // Prevent multiple empty lines.
    "@stylistic/js/no-multiple-empty-lines": ["error", {
      "max": 1,
    }],
    // Files should not be too big.
    "max-lines": ["warn", {
      "max": 666, "skipBlankLines": true,
    }],
    // Suggest function size limit.
    // https://tigerstyle.dev/
    "max-lines-per-function": ["warn", 70],
    // Use const where possible.
    "prefer-const": ["error", {
      "destructuring": "any", "ignoreReadBeforeAssign": false,
    }],
    // For now only a warning.
    // "@typescript-eslint/no-explicit-any": ["warn"],
    // Ignore unused variables and arguments starting with underscore.
    // "@typescript-eslint/no-unused-vars": ["error", {
    //   "argsIgnorePattern": "^_",
    //   "varsIgnorePattern": "^_",
    // }],
  },
}, {
  plugins: {
    "@stylistic/js": stylistic,
  },
  rules: {
    // Line length, we allow 120 as a compromise between 80 and infinity.
    "@stylistic/js/max-len": ["warn", { "code": 120 }],
    // Double quotes.
    "@stylistic/js/quotes": ["error", "double"],
    // Using two spaces for indentation.
    "@stylistic/js/indent": ["error", 2],
    // Spaces around objects.
    "@stylistic/js/object-curly-spacing": ["error", "always"],
    // No spaces around arrays.
    "@stylistic/js/array-bracket-spacing": ["error", "never"],
    // Force \n.
    "@stylistic/js/linebreak-style": ["error", "unix"],
  }
}, {
  plugins: {
    boundaries
  },
  extends: [
    boundaries.configs.recommended,
  ],
  settings: {
    // `**` (not `*`) is required: these types must match nested files, not
    // just direct children (micromatch `*` does not cross `/`).
    "boundaries/elements": [
      { type: "application", pattern: "src-v2/application/**" },
      { type: "core", pattern: "src-v2/core/**" },
      { type: "features", pattern: "src-v2/features/**" },
      { type: "infrastructure", pattern: "src-v2/infrastructure/**" },
      { type: "modes", pattern: "src-v2/modes/**" },
      { type: "shared", pattern: "src-v2/shared/**" },
      { type: "shell", pattern: "src-v2/shell/**" },
    ],
    "boundaries/files": [
      { pattern: "**/*.spec.js", category: "test" },
      { pattern: "**/*.css", category: "style" },
      // Standalone composition-root file (not a folder, so it can't be a
      // `boundaries/elements` entry) — same allowances as `application`.
      { pattern: "src-v2/application.ts", category: "composition-root" },
    ],
  },
  rules: {
    // NOTE: this was previously (incorrectly) placed under `settings`, where
    // eslint-plugin-boundaries never reads rule options from, so this policy
    // was silently never enforced. Rule options belong under `rules`.
    "boundaries/dependencies": [2, {
      default: "disallow",
      policies: [
        {
          // Utilities: no outward src-v2 dependency but on each other.
          from: { element: { type: "infrastructure" } },
          allow: { to: { element: { type: "infrastructure" } } },
        },
        {
          from: { element: { type: ["core", "modes"] } },
          allow: { to: { element: { type: ["core", "modes", "infrastructure", "shared"] } } },
        },
        {
          // NOTE: "features" is one coarse type covering every feature
          // folder, so this does not yet stop one feature importing
          // another directly (would need per-feature captured elements).
          // Nothing currently does this; worth tightening in a follow-up.
          from: { element: { type: "features" } },
          allow: { to: { element: { type: ["features", "core", "infrastructure", "shared"] } } },
        },
        {
          // Shell is a pure host: it may reach utilities but never a
          // feature directly — only the composition root may do that.
          from: { element: { type: "shell" } },
          allow: { to: { element: { type: ["shell", "core", "infrastructure", "shared", "modes"] } } },
        },
        {
          // The composition root: the only place allowed to import a
          // feature module directly, to register it into core registries.
          from: { element: { type: "application" } },
          allow: {
            to: {
              element: {
                type: ["application", "core", "features", "infrastructure", "shared", "modes"],
              },
            },
          },
        },
        {
          from: { file: { category: "composition-root" } },
          allow: {
            to: {
              element: {
                type: ["application", "core", "features", "infrastructure", "shared", "modes"],
              },
            },
          },
        },
        {
          disallow: { to: { file: { categories: "test" } } }
        },
      ],
    }],
  },
}]);
