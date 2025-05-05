import { defineConfig } from "vitest/config";
import { vitestSparqlPlugin } from "./build/sparql-compiler.mjs";

export default defineConfig({
  plugins: [vitestSparqlPlugin()],
  test: {
    include: ["src/**/*.(spec|test).[jt]s"],
    globals: true,
  },
});
