import { expect, test } from "@playwright/test";

test("standalone demo mounts and exports LaTeX", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error));
  await page.goto("/standalone.html");
  await expect(page.locator(".interactive-mathml")).toBeVisible();
  await page.getByRole("button", { name: "Show export" }).click();
  await expect(page.locator("pre")).toContainText("int");
  await expect(page.getByText("Desktop browser and physical keyboard required.")).toHaveCount(0);
  expect(errors).toEqual([]);
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
