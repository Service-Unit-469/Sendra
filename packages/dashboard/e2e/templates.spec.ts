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
      await page.waitForURL("**/templates");
    });

    await test.step('Verify New Template Created', async () => {
      await dashboardPage.navigateTo("Templates", "/templates");
      await page.getByText(templateName).waitFor({state: 'visible'});
    });
  });

  test.skip("Can create a quick email template", async ({
    dashboardPage,
    page,
  }) => {
    await dashboardPage.navigateTo("Templates", "/templates");
    const templateName = `test-${new Date().getTime()}`;

    await test.step("Create new template", async () => {
      await dashboardPage.createTemplate(templateName, async () => {
        const previewFrame = dashboardPage.getPreviewFrame();
        await previewFrame.locator('#frame-root').waitFor({
          state: 'visible'
        });
        await previewFrame.locator('#frame-root').click();
        await page.locator('#root_select_quickEmail').selectOption({label: 'Yes'});
        await page.getByRole('textbox', {name: 'Preview'}).fill('{{quickBody}}');
        await previewFrame.locator('#frame-root').click();
        await previewFrame.getByText("{{quickBody}}").waitFor({state: 'visible'});
      });
    });

    await test.step('Verify New Template Created', async () => {
      await dashboardPage.navigateTo("Templates", "/templates");
      await page.getByText(templateName).waitFor({state: 'visible'});
    });
  });
});
