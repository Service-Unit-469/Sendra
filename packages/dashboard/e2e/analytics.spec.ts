import { test, expect } from "./fixtures/dashboard";

test.describe("Analytics", () => {
  test("Analytics page", async ({ page, dashboardPage, isMobile }) => {
    await dashboardPage.navigateTo("Analytics", "/analytics");

    await expect(page.getByText("Bounce Rate")).toBeVisible();
    await expect(page.getByText("Spam Rate")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Contacts" })).toBeVisible();

    if (isMobile) {
      await expect(page.getByLabel("Select a tab")).toBeVisible();
      await page.getByLabel("Select a tab").selectOption("/analytics/clicks");
    } else {
      await page.getByRole("link", { name: "Clicks" }).click();
    }

    await expect(page.getByRole("heading", { name: "Clicks" })).toBeVisible();
  });
});
