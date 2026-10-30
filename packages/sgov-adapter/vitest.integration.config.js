import { defineConfig } from "vitest/config";
import { vitestSparqlPlugin } from "./build/sparql-compiler.mjs";

export default defineConfig({
  plugins: [vitestSparqlPlugin()],
  test: {
    include: ["src/**/*.integration.test.ts"],
    globals: true,
  },
});
