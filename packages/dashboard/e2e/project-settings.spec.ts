import { expect, test } from "./fixtures/dashboard";

test.describe("Project Settings", () => {
  test("should be able to navigate to project settings page", async ({
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
      await expect(page.getByRole("button", { name: "Delete project" })).toBeVisible({ timeout: 30000 });
    });
  });

  test("can navigate to API access page", async ({ dashboardPage, page }) => {
    await dashboardPage.navigateTo("Project Settings", "/settings/project");
    await dashboardPage.clickTab("API Access", "/settings/api");
    await expect(
      page.getByRole("heading", { name: "API Access" })
    ).toBeVisible();
    await expect(page.getByTestId("api-endpoint-value")).toBeVisible();
    await expect(page.getByTestId("project-id-value")).toBeVisible();
  });

  test("masks secret key with explicit reveal toggle", async ({ dashboardPage, page }) => {
    await dashboardPage.navigateTo("Project Settings", "/settings/project");
    await dashboardPage.clickTab("API Access", "/settings/api");

    const secretKeyValue = page.getByTestId("secret-api-key-value");
    await expect(page.getByTestId("secret-api-key-mask")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reveal key" })).toBeVisible();
    await expect(page.getByText("Warning: Never expose this key in client-side code or public repositories.")).toBeVisible();

    await page.getByRole("button", { name: "Reveal key" }).click();
    await expect(page.getByRole("button", { name: "Hide key" })).toBeVisible();
    await expect(page.getByTestId("secret-api-key-mask")).toHaveCount(0);
    await expect(secretKeyValue).not.toContainText("Unavailable");

    await page.getByRole("button", { name: "Hide key" }).click();
    await expect(page.getByTestId("secret-api-key-mask")).toBeVisible();
  });

  test("can navigate to Verified Identity page", async ({ dashboardPage, page }) => {
    await dashboardPage.navigateTo("Project Settings", "/settings/project");
    await dashboardPage.clickTab("Verified Identity", "/settings/identity");
    await page.getByRole("heading", { name: "Identity" }).waitFor({state: 'visible'});
    await page.getByRole("heading", { name: "Sender" }).waitFor({state: 'visible'});
  })
});
