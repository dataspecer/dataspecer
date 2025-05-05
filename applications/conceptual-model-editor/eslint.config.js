import eslint from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin-js";
import reactCompiler from "eslint-plugin-react-compiler";

export default tseslint.config(
  {
    // https://github.com/eslint/eslint/discussions/18304
    ignores: [
      // Exclude distribution directory.
      "dist/*",
      // Exclude shadcn directory.
      "src/user-interface/shadcn/",
      // Tailwind configuration file using require.
      "tailwind.config.js"
    ],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs["recommended-latest"],
  reactRefresh.configs.recommended,
  reactRefresh.configs.vite,
  reactCompiler.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      // Contains styles extracted from ESLint core.
      "@stylistic/js": stylistic,
    },
    rules: { // Sorted alphabetically.
      // Comments must start with a capital.
      "capitalized-comments": ["error", "always", {
        "ignoreConsecutiveComments": true
      }],
      // Use === and !==.
      "eqeqeq": ["error"],
      // Disallow the use of alert, confirm, and prompt.
      "no-alert": ["error"],
      // Prevent multiple empty lines.
      "@stylistic/js/no-multiple-empty-lines": ["error", {
        "max": 1,
      }],
      // Files should not be too big.
      "max-lines": ["warn", {
        "max": 666,
        "skipBlankLines": true,
      }],
      // Suggest function size limit.
      // https://tigerstyle.dev/
      // "max-lines-per-function": ["warn", 70],
      // Use const where possible.
      "prefer-const": ["error", {
        "destructuring": "any",
        "ignoreReadBeforeAssign": false,
      }],
      // For now only a warning.
      "@typescript-eslint/no-explicit-any": ["warn"],
      // Ignore unused variables and arguments starting with underscore.
      "@typescript-eslint/no-unused-vars": ["error", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
      }],
      // Line length, we allow 120 as a compromise between 80 and infinity.
      "@stylistic/js/max-len": ["warn", {
        "code": 120,
      }],
      // Double quotes.
      "@stylistic/js/quotes": ["error", "double"],
      // Using two spaces.
      "@stylistic/js/indent": ["error", 2],
      // Spaces around objects.
      "@stylistic/js/object-curly-spacing": ["error", "always"],
      // No spaces around arrays.
      "@stylistic/js/array-bracket-spacing": ["error", "never"],
      // Force \n.
      "@stylistic/js/linebreak-style": ["error", "unix"],
    },
  });
