import path  from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "istanbul",
      // Just CLI output do not produce report in a directory.
      reporter: ["text"],
    },
  },
  resolve: {
    alias: {
      // https://ui.shadcn.com/docs/installation/vite
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
