import { expect, test } from "@playwright/test";

const runtime = process.env.PLAYWRIGHT_RUNTIME ?? "public";

test.describe("local runtime", () => {
  test.skip(runtime !== "local", "This suite runs against the localhost development server.");

  test("settings page exposes token controls only in local runtime", async ({ page }) => {
    await page.goto("/app/settings");

    await expect(page.getByText("GitHub access")).toBeVisible();
    await expect(page.getByText("GitHub token")).toBeVisible();
    await expect(page.getByPlaceholder("Cole um GitHub Personal Access Token")).toBeVisible();
  });
});
