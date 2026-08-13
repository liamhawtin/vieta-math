import { resolve } from "node:path";
import { defineConfig } from "vite";

// Vite does not reliably resolve the workspace package back through its own
// symlink during a clean install. The root build runs before example builds.
export default defineConfig({
  resolve: {
    alias: {
      "vieta-math": resolve(import.meta.dirname, "../../dist/index.mjs"),
    },
  },
});
