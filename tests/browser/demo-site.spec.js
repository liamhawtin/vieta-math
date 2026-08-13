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

test("home page presents the VietaSpace identity and walkthrough", async ({ page }) => {
  const failures = [];
  page.on("response", response => {
    if (/vieta-space-logo|favicon|vieta-math-demo/.test(response.url()) && response.status() >= 400) {
      failures.push(`${response.status()} ${response.url()}`);
    }
  });
  await page.goto("/");
  await expect(page.locator(".wordmark img")).toHaveAttribute("src", "./favicon-64x64.png");
  await expect(page.locator(".brand-lockup")).toBeVisible();
  await expect(page.locator(".product-preview source")).toHaveAttribute("src", "./vieta-math-demo.mp4");
  expect(failures).toEqual([]);
});

test("standalone Tab opens the shared Smart Menu", async ({ page }) => {
  await page.goto("/standalone.html");
  const editor = page.locator(".interactive-mathml");
  await editor.click({ position: { x: 12, y: 12 } });
  await page.keyboard.press("Tab");
  await expect(page.locator(".smart-menu")).toBeVisible();
  await expect(page.locator(".search-input")).toBeFocused();
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
  await expect.poll(() => page.evaluate(() => {
    const root = document.createElement("div");
    root.className = "vieta-root";
    const math = document.createElement("div");
    math.className = "interactive-mathml";
    root.appendChild(math);
    document.body.appendChild(root);
    const value = getComputedStyle(math).getPropertyValue("--mm-caret").trim();
    root.remove();
    return value;
  })).toBe("#004288");
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

test("ProseMirror Smart Menu is anchored to the caret in the viewport", async ({ page }) => {
  await page.goto("/prosemirror.html");
  await page.getByRole("button", { name: "Insert math" }).click();
  const editor = page.locator(".interactive-mathml");
  await editor.click({ position: { x: 12, y: 12 } });
  const caret = page.locator(".math-cursor");
  await expect(caret).toBeVisible();
  const caretBox = await caret.boundingBox();
  await page.keyboard.press("Tab");
  const menu = page.locator(".smart-menu");
  await expect(menu).toBeVisible();
  const menuBox = await menu.boundingBox();
  expect(caretBox).not.toBeNull();
  expect(menuBox).not.toBeNull();
  expect(Math.abs(menuBox.y - (caretBox.y + caretBox.height + 10))).toBeLessThanOrEqual(2);
});
