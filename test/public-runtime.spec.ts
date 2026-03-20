import { expect, test } from "@playwright/test";

const runtime = process.env.PLAYWRIGHT_RUNTIME ?? "public";

test.describe("public runtime", () => {
  test.skip(runtime !== "public", "This suite runs against the published-style preview build.");

  test("settings page stays snapshot-only", async ({ page }) => {
    await page.goto("/app/settings");

    await expect(page.getByRole("heading", { name: "Snapshot status" })).toBeVisible();
    await expect(page.getByText("The published site does not accept a GitHub token.")).toBeVisible();
    await expect(page.getByPlaceholder("Cole um GitHub Personal Access Token")).toHaveCount(0);
    await expect(page.getByText("Current identity")).toHaveCount(0);
  });

  test("dashboard avoids synthetic metrics", async ({ page }) => {
    await page.goto("/app");

    await expect(page.getByRole("heading", { name: "Tracked Repositories" })).toBeVisible();
    await expect(page.getByText("Global Uptime")).toHaveCount(0);
    await expect(page.getByText("Traffic (24h)")).toHaveCount(0);
  });
});
