import { expect, test } from "./fixtures/dashboard";

test.describe("Templates", () => {
  test("should be able to navigate to templates page", async ({
    dashboardPage,
    page,
  }) => {
    // Navigate using sidebar
    await dashboardPage.navigateTo("Templates", "/templates");

    // Verify page loaded correctly
    await expect(
      page.getByRole("heading", { name: "Templates" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "New" })).toBeVisible();
  });

  test("Can create a template", async ({
    dashboardPage,
    page,
  }) => {
    await dashboardPage.navigateTo("Templates", "/templates");
    const templateName = `test-${new Date().getTime()}`;

    await test.step("Create new template", async () => {
      await page.getByRole("button", { name: "New" }).click();

      await page.getByRole("button", { name: "Create" }).waitFor({ state: "visible" });
      await page.getByRole("textbox", { name: "Subject" }).fill(templateName);


      await page.getByRole("button", { name: "Create" }).click();
    });

  });
});
