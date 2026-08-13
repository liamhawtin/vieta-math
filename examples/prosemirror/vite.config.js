import { resolve } from "node:path";
import { defineConfig } from "vite";

// Build the source example against the package artifact made by the root build.
export default defineConfig({
  resolve: {
    alias: {
      "vieta-math/prosemirror": resolve(import.meta.dirname, "../../dist/vieta-math-prosemirror.mjs"),
      "vieta-math": resolve(import.meta.dirname, "../../dist/index.mjs"),
    },
  },
});
