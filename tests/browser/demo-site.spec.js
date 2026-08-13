import { expect, test } from "@playwright/test";

test("standalone demo mounts and exports LaTeX", async ({ page }) => {
  const errors = [];
  const missingFonts = [];
  page.on("pageerror", error => errors.push(error));
  page.on("response", response => {
    if (/\.(woff2?|ttf|otf)(\?|$)/.test(response.url()) && response.status() >= 400) {
      missingFonts.push(`${response.status()} ${response.url()}`);
    }
  });
  await page.goto("/standalone.html");
  await expect(page.locator(".interactive-mathml")).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.fonts.check('16px "Latin Modern Math Upright"'))).toBe(true);
  await page.getByRole("button", { name: "Show export" }).click();
  await expect(page.locator("pre")).toContainText("int");
  await expect(page.getByText("Desktop browser and physical keyboard required.")).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(missingFonts).toEqual([]);
});

test("theme demo exposes both VietaMath CSS-variable layers", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error));
  await page.goto("/theme.html");
  await expect(page.locator(".interactive-mathml")).toBeVisible();
  await expect(page.locator(".theme-demo code")).toHaveCount(2);
  await page.getByRole("button", { name: "Use dark values" }).click();
  await expect(page.locator(".theme-dark")).toBeVisible();
  expect(errors).toEqual([]);
});

test("standalone demo keeps its host and VietaMath themes in sync", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/standalone.html");
  await expect(page.locator(".demo-card")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".demo-card")).toHaveClass(/site-dark/);
  await expect.poll(() => page.locator(".math-mount .vieta-root").evaluate(element => getComputedStyle(element).getPropertyValue("--bg-primary").trim())).toBe("#0f1113");
});

test("an unconfigured host remains light under a dark system preference", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/standalone.html");
  await expect.poll(() => page.evaluate(() => {
    const root = document.createElement("div");
    root.className = "vieta-root";
    document.body.appendChild(root);
    const value = getComputedStyle(root).getPropertyValue("--bg-primary").trim();
    root.remove();
    return value;
  })).toBe("#ffffff");
});

test("ProseMirror demo creates an inline VietaMath node", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error));
  await page.goto("/prosemirror.html");
  await expect(page.locator(".ProseMirror")).toBeVisible();
  await page.getByRole("button", { name: "Insert math" }).click();
  await expect(page.locator(".pm-vieta-math-wrapper")).toBeVisible();
  await expect(page.locator(".interactive-mathml")).toBeVisible();
  expect(errors).toEqual([]);
});
