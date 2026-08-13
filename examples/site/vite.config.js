import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, "index.html"),
        standalone: resolve(import.meta.dirname, "standalone.html"),
        theme: resolve(import.meta.dirname, "theme.html"),
        prosemirror: resolve(import.meta.dirname, "prosemirror.html"),
      },
    },
  },
});
