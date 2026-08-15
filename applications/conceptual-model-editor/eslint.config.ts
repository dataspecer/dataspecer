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
    reactHooks.configs["recommended-latest"],
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
    "boundaries/elements": [
      { type: "core", pattern: "src-v2/core/*" },
      { type: "features", pattern: "src-v2/features/*" },
      { type: "infrastructure", pattern: "src-v2/infrastructure/*" },
      { type: "modes", pattern: "src-v2/modes/*" },
      { type: "shared", pattern: "src-v2/shared/*" },
      { type: "shell", pattern: "src-v2/shell/*" },
    ],
    "boundaries/files": [
      { pattern: "**/*.spec.js", category: "test" },
      { pattern: "**/*.css", category: "style" }
    ],
    "boundaries/dependencies": [2, {
      default: "disallow",
      policies: [{
      //   from: { element: { type: "component" } },
      //   allow: { to: { element: { type: "helper" } } }
      // }, {
        disallow: { to: { file: { categories: "test" } } }
      }],
    }],
  },
}]);
