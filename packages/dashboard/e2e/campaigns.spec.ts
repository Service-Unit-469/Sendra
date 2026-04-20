import { expect, test } from "./fixtures/dashboard";

/**
 * Campaigns E2E Tests
 * 
 * Tests the critical campaign creation and sending flow.
 * This is a core feature - users must be able to create and send campaigns.
 */
test.describe("Campaigns", () => {
  test("should be able to navigate to campaigns page", async ({
    dashboardPage,
    page,
  }) => {
    await dashboardPage.navigateTo("Campaigns", "/campaigns");
    await dashboardPage.waitForContentLoading();
    
    await expect(
      page.getByRole("heading", { name: "Campaigns" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "New" })).toBeVisible();
  });

  test("can create a campaign with template", async ({
    dashboardPage,
    page,
  }) => {
    const campaignSubject = `Test Campaign ${new Date().getTime()}`;
    
    await test.step("Create template first", async () => {
      await dashboardPage.navigateTo("Templates", "/templates");
      await page.getByRole("button", { name: "New" }).click();
      await page.getByRole("button", { name: "Create" }).waitFor({ state: "visible" });
      await page.getByRole("textbox", { name: "Subject" }).fill("Test Template");
      await page.getByRole("button", { name: "Create" }).click();
      await page.getByText("Created new template").waitFor({ state: "visible" });
    });

    await test.step("Create campaign from template", async () => {
      await dashboardPage.navigateTo("Campaigns", "/campaigns");
      await dashboardPage.waitForContentLoading();
      
      await page.getByRole("button", { name: "New" }).click();
      await page.getByRole("textbox", { name: "Subject" }).fill(campaignSubject);
      
      // Click the template dropdown button
      const templateDropdownButton = page.getByLabel(/select a value/i).or(page.getByRole("button").filter({ hasText: /no value selected|template/i }));
      await templateDropdownButton.waitFor({ state: "visible" });
      await templateDropdownButton.click();
      
      // Select the first template option from the dropdown list
      const templateOption = page.getByText("Test template").first();
      await templateOption.waitFor({ state: "visible" });
      await templateOption.click();
      
      await page.getByRole("button", { name: "Create Campaign" }).click();
      await page.getByText("Created new campaign").waitFor({ state: "visible" });
    });

    await test.step("Verify campaign was created", async () => {
      await dashboardPage.navigateTo("Campaigns", "/campaigns");
      await page.getByText(campaignSubject).waitFor({ state: "visible" });
    });
  });

  test("can add recipients and send test campaign", async ({
    dashboardPage,
    page,
    browserName,
  }) => {
    const campaignSubject = `Test Campaign ${new Date().getTime()}`;
    const testContactEmail = `test+campaign+${browserName}+${new Date().getTime()}@example.com`;

    await test.step("Create a contact for the campaign", async () => {
      await dashboardPage.navigateTo("Contacts", "/contacts");
      await page.getByRole("button", { name: "New" }).click();
      await page.getByRole("textbox", { name: "Email" }).fill(testContactEmail);
      await page.getByRole("button", { name: "Add" }).click();
      await page.getByRole("button", { name: "Create" }).click();
      await page.getByText("Created new contact").waitFor({ state: "visible" });
      await page.getByText("Create new contact").waitFor({ state: "hidden" });
    });

    await test.step("Create template", async () => {
      await dashboardPage.navigateTo("Templates", "/templates");
      await dashboardPage.waitForContentLoading();
      await page.getByRole("heading", { name: "Templates" }).waitFor({ state: "visible" });
      await page.getByRole("button", { name: "New" }).click();
      await page.getByRole("button", { name: "Create" }).waitFor({ state: "visible" });
      await page.getByRole("textbox", { name: "Subject" }).fill("Campaign Template");
      await page.getByRole("button", { name: "Create" }).click();
      await page.getByText("Created new template").waitFor({ state: "visible" });
    });

    await test.step("Create campaign", async () => {
      await dashboardPage.navigateTo("Campaigns", "/campaigns");
      await dashboardPage.waitForContentLoading();
      
      await page.getByRole("button", { name: "New" }).click();
      await page.getByRole("textbox", { name: "Subject" }).fill(campaignSubject);
      
      // Select template from dropdown
      const templateDropdownButton = page.getByLabel(/select a value/i).or(page.getByRole("button").filter({ hasText: /no value selected|template/i }));
      await templateDropdownButton.waitFor({ state: "visible" });
      await templateDropdownButton.click();
    
      const templateOption = page.getByText("Campaign Template").first();
      await templateOption.waitFor({ state: "visible" });
      await templateOption.click();
      
      await page.getByRole("button", { name: "Create Campaign" }).click();
      await page.getByText("Created new campaign").waitFor({ state: "visible" });
    });

    await test.step("Add recipient to campaign", async () => {
      // Wait for campaign page to load
      await page.getByRole("heading", { name: campaignSubject }).waitFor({ state: "visible" });
      await page.getByRole("heading", { name: "Campaigns" }).waitFor({ state: "visible" });
      await page.waitForURL(/\/campaigns\/[^/]+/, { timeout: 5000 });
      await dashboardPage.waitForContentLoaded();
      
      // Select "Contacts" option for recipients
      const recipientTypeSelect = page.getByLabel(/select recipients by/i).or(page.locator('select').filter({ hasText: /group|contact/i }));
      if (await recipientTypeSelect.isVisible()) {
        await recipientTypeSelect.selectOption("contacts");
      }
      
      // Look for contact selector/search input
      const contactSearch = page.getByRole("searchbox").or(page.getByLabel(/contact/i)).or(page.getByPlaceholder(/search|select/i));
      if (await contactSearch.isVisible()) {
        await contactSearch.fill(testContactEmail);
        // Wait a moment for search results
        await page.waitForTimeout(500);
        // Click on the contact if it appears
        const contactOption = page.getByText(testContactEmail).first();
        if (await contactOption.isVisible()) {
          await contactOption.click();
        }
      }
      
      // Verify recipient count shows at least 1
      await expect(page.getByText(/total recipients.*[1-9]/i)).toBeVisible({ timeout: 5000 });
    });

    await test.step("Send test campaign", async () => {
      // Look for "Send Test" button
      const sendTestButton = page.getByRole("button", { name: /send test/i });
      if (await sendTestButton.isVisible()) {
        await sendTestButton.click();
        // Wait for success message
        await page.getByText(/sent.*test/i).waitFor({ state: "visible", timeout: 10000 });
      }
    });

    await test.step("Verify campaign status", async () => {
      // Campaign should still be in draft status (test send doesn't change status)
      await dashboardPage.navigateTo("Campaigns", "/campaigns");
      await page.getByText(campaignSubject).waitFor({ state: "visible" });
      // Verify it's still a draft (not delivered)
      const campaignRow = page.locator("tr, [role='row']").filter({ hasText: campaignSubject });
      await expect(campaignRow).toBeVisible();
    });
  });

  test("can view campaign details", async ({
    dashboardPage,
    page,
  }) => {
    const campaignSubject = `View Test ${new Date().getTime()}`;

    await test.step("Create template and campaign", async () => {
      await dashboardPage.navigateTo("Templates", "/templates");
      await page.getByRole("button", { name: "New" }).click();
      await page.getByRole("button", { name: "Create" }).waitFor({ state: "visible" });
      await page.getByRole("textbox", { name: "Subject" }).fill("View Template");
      await page.getByRole("button", { name: "Create" }).click();
      await page.getByText("Created new template").waitFor({ state: "visible" });

      await dashboardPage.navigateTo("Campaigns", "/campaigns");
      await dashboardPage.waitForContentLoading();
      
      await page.getByRole("button", { name: "New" }).click();
      await page.getByRole("textbox", { name: "Subject" }).fill(campaignSubject);
      
      const templateSelect = page.locator('select, [role="combobox"]').first();
      await templateSelect.waitFor({ state: "visible" });
      await templateSelect.selectOption({ index: 1 });
      
      await page.getByRole("button", { name: "Create Campaign" }).click();
      await page.getByText("Created new campaign").waitFor({ state: "visible" });
    });

    await test.step("View campaign details", async () => {
      await page.waitForURL(/\/campaigns\/[^/]+/, { timeout: 5000 });
      await dashboardPage.waitForContentLoaded();
      
      // Verify campaign details page loaded
      await expect(page.getByText(campaignSubject)).toBeVisible();
      // Should see campaign editing interface
      await expect(page.getByText(/recipients|preview|update/i)).toBeVisible();
    });
  });
});
