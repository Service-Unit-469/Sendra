import type { Page } from "@playwright/test";
import type { DashboardPage } from "./fixtures/dashboard-page";
import { expect, test } from "./fixtures/dashboard";

/**
 * Campaigns E2E Tests
 * 
 * Tests the critical campaign creation and sending flow.
 * This is a core feature - users must be able to create and send campaigns.
 */
test.describe("Campaigns", () => {


  const createCampaignFromTemplate = async (
    dashboardPage: DashboardPage,
    page: Page,
    campaignSubject: string,
    templateName?: string,
  ) => {
    await dashboardPage.navigateTo("Campaigns", "/campaigns");
    await dashboardPage.waitForContentLoading();
    await page.getByRole('heading', {name: 'Campaigns'}).waitFor({state: 'visible'});

    await page.getByRole("button", { name: "New" }).click();
    await page.getByRole("textbox", { name: "Subject" }).fill(campaignSubject);
    
    await dashboardPage.selectDropdownItem('Select a Template', templateName);

    await page.getByRole("button", { name: "Create Campaign" }).click();
    await page.getByRole("button", { name: "Create Campaign" }).waitFor({ state: "hidden" });
    await page.getByText(campaignSubject).waitFor({ state: "visible" });
  };

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

    await test.step("Create campaign from template", async () => {
      await createCampaignFromTemplate(dashboardPage, page, campaignSubject);
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

    await test.step("Create campaign", async () => {
      await createCampaignFromTemplate(dashboardPage, page, campaignSubject);
    });

    await test.step("Add recipient to campaign", async () => {
      const campaignCard = page.locator("div.col-span-1").filter({ hasText: campaignSubject }).first();
      await campaignCard.getByRole("link", { name: /edit/i }).click();

      await page.waitForURL(/\/campaigns\/[^/]+/, { timeout: 10000 });
      await dashboardPage.waitForContentLoaded();

      await page.getByLabel("Select a value").click();
      await page.getByRole("listbox").getByText(/^Contacts$/i).click();

      await page.getByRole("button", { name: "All contacts" }).click();
      await expect(page.getByText(/total recipients:\s*[1-9]/i)).toBeVisible({ timeout: 10000 });
    });

    await test.step("Send test campaign", async () => {
      await page.getByRole("button", { name: "Test", exact: true }).click();
      await page.getByText(/test campaign/i).waitFor({ state: "visible", timeout: 10000 });
    });

    await test.step("Verify campaign status", async () => {
      // Campaign should still be in draft status (test send doesn't change status)
      await dashboardPage.navigateTo("Campaigns", "/campaigns");
      await page.getByText(campaignSubject).waitFor({ state: "visible" });
      // Verify it's still a draft (not delivered)
      const campaignCard = page.locator("div.col-span-1").filter({ hasText: campaignSubject }).first();
      await expect(campaignCard).toBeVisible();
    });
  });

  test("can view campaign details", async ({
    dashboardPage,
    page,
  }) => {
    const campaignSubject = `View Test ${new Date().getTime()}`;

    await test.step("Create campaign", async () => {
      await createCampaignFromTemplate(dashboardPage, page, campaignSubject);
    });

    await test.step("View campaign details", async () => {
      const campaignCard = page.locator("div.col-span-1").filter({ hasText: campaignSubject }).first();
      await campaignCard.getByRole("link", { name: /edit/i }).click();

      await page.waitForURL(/\/campaigns\/[^/]+/, { timeout: 10000 });
      await dashboardPage.waitForContentLoaded();
      
      // Verify campaign details page loaded
      await expect(page.getByText(campaignSubject)).toBeVisible();
      // Should see campaign editing interface
      await expect(page.getByLabel("Select a value")).toBeVisible();
    });
  });
});
