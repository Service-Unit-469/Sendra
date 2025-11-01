import { expect, test } from "./fixtures/dashboard";

test.describe("Contacts", () => {
  test("should be able to navigate to contacts page", async ({
    dashboardPage,
    page,
  }) => {
    await dashboardPage.navigateTo("Project Settings", "/settings/project");

    await test.step("Verify project details page", async () => {
      await expect(
        page.getByRole("heading", { name: "Project details" })
      ).toBeVisible();
      await expect(page.getByRole("textbox", { name: "Name" })).toBeVisible();
      await expect(page.getByRole("textbox", { name: "URL" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Delete project" })
      ).toBeVisible();
    });
  });

  test("can navigate to API access page", async ({ dashboardPage, page }) => {
    await dashboardPage.navigateTo("Project Settings", "/settings/project");
    await dashboardPage.clickTab("API Access", "/settings/api");
    await expect(
      page.getByRole("heading", { name: "API Access" })
    ).toBeVisible();
    await expect(page.getByLabel("API Endpoint")).toBeVisible();
    await expect(page.getByLabel("Project ID")).toBeVisible();
  });

  test("can navigate to Verified Identity page", async ({ dashboardPage, page }) => {
    await dashboardPage.navigateTo("Project Settings", "/settings/project");
    await dashboardPage.clickTab("Verified Identity", "/settings/identity");
    await expect(page.getByRole("heading", { name: "Identity" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sender" })).toBeVisible();
  })
});
