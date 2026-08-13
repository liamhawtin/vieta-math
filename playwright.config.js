import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 30_000,
  use: {
    browserName: "chromium",
    launchOptions: process.env.CI ? {} : {
      executablePath: "/usr/bin/google-chrome",
      args: ["--no-sandbox"],
    },
    baseURL: "http://127.0.0.1:4175",
  },
  webServer: {
    command: "npm run dev --workspace=@vietamath/demo-site -- --force --host 127.0.0.1 --port 4175",
    url: "http://127.0.0.1:4175/",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
