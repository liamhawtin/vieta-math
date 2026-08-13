import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const installedPackage = resolve(import.meta.dirname, "node_modules/vieta-math/dist/index.mjs");
const installedProseMirrorPackage = resolve(import.meta.dirname, "node_modules/vieta-math/dist/vieta-math-prosemirror.mjs");
const sourcePackage = resolve(import.meta.dirname, "../../dist/index.mjs");
const sourceProseMirrorPackage = resolve(import.meta.dirname, "../../dist/vieta-math-prosemirror.mjs");

export default defineConfig({
  base: "./",
  resolve: {
    alias: {
      // CI uses the local root artifact. Pages installs an exact npm version
      // into this workspace first, so that deployed build uses that package.
      "vieta-math/prosemirror": existsSync(installedProseMirrorPackage)
        ? installedProseMirrorPackage
        : sourceProseMirrorPackage,
      "vieta-math": existsSync(installedPackage) ? installedPackage : sourcePackage,
    },
  },
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
