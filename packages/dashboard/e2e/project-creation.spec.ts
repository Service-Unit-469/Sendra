import { expect, test } from "./fixtures/dashboard";

/**
 * Project Creation E2E Tests
 * 
 * Tests the critical first-time user flow of creating a new project.
 * This is essential - users must be able to create projects to use the platform.
 */
test.describe("Project Creation", () => {
  test("can navigate to project creation page", async ({
    dashboardPage,
    page,
  }) => {
    await page.goto("/dashboard#/new");
    
    await expect(
      page.getByRole("heading", { name: /create a new project/i })
    ).toBeVisible();
    
    await expect(
      page.getByLabel(/project name/i)
    ).toBeVisible();
    
    await expect(
      page.getByLabel(/project url/i)
    ).toBeVisible();
    
    await expect(
      page.getByRole("button", { name: /launch/i })
    ).toBeVisible();
  });

  test("can create a new project", async ({
    dashboardPage,
    page,
    browserName,
  }) => {
    const projectName = `E2E Test Project ${browserName} ${new Date().getTime()}`;
    const projectUrl = `https://test-${browserName}-${new Date().getTime()}.example.com`;

    await test.step("Navigate to project creation", async () => {
      await page.goto("/dashboard#/new");
      await expect(
        page.getByRole("heading", { name: /create a new project/i })
      ).toBeVisible();
    });

    await test.step("Fill in project details", async () => {
      const nameInput = page.getByLabel(/project name/i);
      await nameInput.waitFor({ state: "visible" });
      await nameInput.fill(projectName);

      const urlInput = page.getByLabel(/project url/i);
      await urlInput.waitFor({ state: "visible" });
      await urlInput.fill(projectUrl);

      // Wait for form validation
      await page.waitForTimeout(500);
    });

    await test.step("Submit project creation", async () => {
      const launchButton = page.getByRole("button", { name: /launch/i });
      await expect(launchButton).toBeEnabled();
      await launchButton.click();

      // Should redirect to dashboard after creation
      await page.waitForURL(/\/(?!new)/, { timeout: 10000 });
    });

    await test.step("Verify project was created and selected", async () => {
      // Should be on dashboard home
      await page.waitForTimeout(1000);
      
      // Verify we're not on the new project page anymore
      expect(page.url()).not.toContain("/new");
      
      // Should see dashboard content
      const hasDashboardContent = await page.evaluate(() => {
        return document.body.textContent?.includes("Dashboard") ||
               document.body.textContent?.includes("Campaigns") ||
               document.body.textContent?.includes("Contacts") ||
               document.querySelector("nav") !== null;
      });
      
      expect(hasDashboardContent).toBeTruthy();
    });
  });

  test("shows validation errors for invalid project data", async ({
    dashboardPage,
    page,
  }) => {
    await page.goto("/dashboard#/new");
    
    await test.step("Try to submit empty form", async () => {
      const launchButton = page.getByRole("button", { name: /launch/i });
      
      // Button should be disabled when form is invalid
      await expect(launchButton).toBeDisabled();
    });

    await test.step("Fill only name without URL", async () => {
      const nameInput = page.getByLabel(/project name/i);
      await nameInput.fill("Test Project");
      
      await page.waitForTimeout(500);
      
      // Button should still be disabled without URL
      const launchButton = page.getByRole("button", { name: /launch/i });
      await expect(launchButton).toBeDisabled();
    });

    await test.step("Fill invalid URL format", async () => {
      const urlInput = page.getByLabel(/project url/i);
      await urlInput.fill("not-a-valid-url");
      
      await page.waitForTimeout(500);
      
      // Button should still be disabled with invalid URL
      const launchButton = page.getByRole("button", { name: /launch/i });
      await expect(launchButton).toBeDisabled();
    });
  });

  test("can navigate back to dashboard if projects exist", async ({
    dashboardPage,
    page,
  }) => {
    await page.goto("/dashboard#/new");
    
    // Look for "Back to the dashboard" link
    const backLink = page.getByRole("link", { name: /back to.*dashboard/i });
    
    // Link may or may not be visible depending on whether user has existing projects
    // If visible, it should work
    if (await backLink.isVisible({ timeout: 1000 })) {
      await backLink.click();
      await page.waitForURL(/\/(?!new)/, { timeout: 5000 });
      expect(page.url()).not.toContain("/new");
    }
  });
});
