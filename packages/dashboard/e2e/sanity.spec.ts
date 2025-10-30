import { expect, test } from "./fixtures/dashboard";

test.describe("Can navigate through the UI", () => {
  test("Dashboard", async ({ dashboardPage, isMobile }) => {
    const page = dashboardPage.page;

    test.step("should be able to view the dashboard", async () => {
      // check for the activity feed
      await page.getByText("Activity feed").waitFor({ state: "visible" });
      // check for all the headings in the dashboard
      await page
        .getByRole("heading", { name: "Analytics" })
        .waitFor({ state: "visible" });
      await page
        .getByRole("heading", { name: "Documentation" })
        .waitFor({ state: "visible" });
    });

    if (isMobile) {
      test.step("test responsive elements on mobile", async () => {
        const openSidebarButton = page.getByRole("button", {
          name: "Open sidebar",
        });
        await openSidebarButton.waitFor({ state: "visible" });
        await openSidebarButton.click();
        await page
          .getByRole("navigation")
          .getByRole("link", { name: "Dashboard" })
          .waitFor({ state: "visible" });
        await page
          .getByRole("button", { name: "Close sidebar" })
          .waitFor({ state: "visible" });
      });
    } else {
      test.step("test responsive elements on desktop", async () => {
        await page
          .getByRole("navigation")
          .getByRole("link", { name: "Dashboard" })
          .waitFor({ state: "visible" });
        await page
          .getByRole("button", { name: "Toggle sidebar" })
          .waitFor({ state: "hidden" });
        await page
          .getByRole("img", { name: "Sendra Logo" })
          .waitFor({ state: "visible" });
      });
    }
  })

    test("should be able to navigate to contacts page", async ({ dashboardPage, page }) => {

      // Navigate using sidebar
      await dashboardPage.navigateTo("Contacts");

      // Verify page loaded correctly
      await page
        .getByRole("heading", { name: /cont/i })
        .waitFor({ state: "visible" });
      await page
        .getByText(/send your contacts emails in bulk/i)
        .waitFor({ state: "visible" });
      await page
        .getByRole("button", { name: /new/i })
        .waitFor({ state: "visible" });

      // Verify URL changed
      await expect(page).toHaveURL(/\/campaigns$/);
    });

    // test.step("should be able to navigate to templates page", async () => {
    //   const nav = page.getByRole("navigation");

    //   // Navigate using sidebar
    //   await nav.getByRole("link", { name: /templates/i }).click();

    //   // Verify page loaded correctly
    //   await page
    //     .getByRole("heading", { name: /templates/i })
    //     .waitFor({ state: "visible" });
    //   await page
    //     .getByText(/reusable blueprints of your emails/i)
    //     .waitFor({ state: "visible" });
    //   await page
    //     .getByRole("button", { name: /new/i })
    //     .waitFor({ state: "visible" });

    //   // Verify URL changed
    //   await expect(page).toHaveURL(/\/templates$/);
    // });

    // test.step("should be able to navigate to actions page", async () => {
    //   const nav = page.getByRole("navigation");

    //   // Navigate using sidebar
    //   await nav.getByRole("link", { name: /^actions$/i }).click();

    //   // Verify page loaded correctly
    //   await expect(
    //     page.getByRole("heading", { name: /actions/i })
    //   ).toBeVisible();
    //   await expect(
    //     page.getByText(/automated emails triggered by events/i)
    //   ).toBeVisible();
    //   await expect(page.getByRole("button", { name: /new/i })).toBeVisible();

    //   // Verify URL changed
    //   await expect(page).toHaveURL(/\/actions$/);
    // });

    // test.step("should be able to navigate to events page", async () => {
    //   const nav = page.getByRole("navigation");

    //   // Navigate using sidebar
    //   await nav.getByRole("link", { name: /events/i }).click();

    //   // Verify page loaded correctly
    //   await expect(
    //     page.getByRole("heading", { name: /events/i })
    //   ).toBeVisible();
    //   await expect(
    //     page.getByText(/track what your users are doing/i)
    //   ).toBeVisible();

    //   // Verify URL changed
    //   await expect(page).toHaveURL(/\/events$/);
    // });

    // test.step("should be able to navigate to contacts page", async () => {
    //   const nav = page.getByRole("navigation");

    //   // Navigate using sidebar
    //   await nav.getByRole("link", { name: /contacts/i }).click();

    //   // Verify page loaded correctly
    //   await expect(
    //     page.getByRole("heading", { name: /contacts/i })
    //   ).toBeVisible();
    //   await expect(
    //     page.getByText(/view and manage your contacts/i)
    //   ).toBeVisible();
    //   await expect(page.getByRole("button", { name: /new/i })).toBeVisible();
    //   await expect(page.getByPlaceholder(/filter contacts/i)).toBeVisible();

    //   // Verify URL changed
    //   await expect(page).toHaveURL(/\/contacts$/);
    // });

    // test.step("should be able to navigate to groups page", async () => {
    //   const nav = page.getByRole("navigation");

    //   // Navigate using sidebar
    //   await nav.getByRole("link", { name: /contact groups/i }).click();

    //   // Verify page loaded correctly
    //   await expect(
    //     page.getByRole("heading", { name: /contact groups/i })
    //   ).toBeVisible();
    //   await expect(page.getByText(/manage your contact groups/i)).toBeVisible();
    //   await expect(page.getByRole("button", { name: /new/i })).toBeVisible();

    //   // Verify URL changed
    //   await expect(page).toHaveURL(/\/groups$/);
    // });

    // test.step("should be able to navigate to analytics page", async () => {
    //   const nav = page.getByRole("navigation");

    //   // Navigate using sidebar
    //   await nav.getByRole("link", { name: /analytics/i }).click();

    //   // Verify page loaded correctly
    //   await expect(
    //     page.getByRole("heading", { name: /analytics/i })
    //   ).toBeVisible();
    //   await expect(
    //     page.getByText(/discover insights about your emails/i)
    //   ).toBeVisible();

    //   // Verify analytics tabs are present
    //   await expect(page.getByRole("link", { name: /overview/i })).toBeVisible();

    //   // Verify URL changed
    //   await expect(page).toHaveURL(/\/analytics$/);
    // });

    // test.step("should be able to navigate to project settings page", async () => {
    //   const nav = page.getByRole("navigation");

    //   // Navigate using sidebar
    //   await nav.getByRole("link", { name: /project settings/i }).click();

    //   // Verify page loaded correctly
    //   await expect(
    //     page.getByRole("heading", { name: /project settings/i })
    //   ).toBeVisible();

    //   // Verify settings tabs are present
    //   await expect(
    //     page.getByRole("link", { name: /project settings/i })
    //   ).toBeVisible();
    //   await expect(
    //     page.getByRole("link", { name: /api access/i })
    //   ).toBeVisible();
    //   await expect(
    //     page.getByRole("link", { name: /verified identity/i })
    //   ).toBeVisible();
    //   await expect(page.getByRole("link", { name: /members/i })).toBeVisible();

    //   // Verify URL changed
    //   await expect(page).toHaveURL(/\/settings\/project$/);
    // });

    // test.step("should be able to navigate to API settings via tabs", async () => {
    //   // First navigate to project settings
    //   await page
    //     .getByRole("navigation")
    //     .getByRole("link", { name: /project settings/i })
    //     .click();

    //   // Then navigate to API settings via tab
    //   await page.getByRole("link", { name: /api access/i }).click();

    //   // Verify page loaded correctly
    //   await expect(
    //     page.getByRole("heading", { name: /api access/i })
    //   ).toBeVisible();
    //   await expect(
    //     page.getByText(/manage your project api keys/i)
    //   ).toBeVisible();

    //   // Verify URL changed
    //   await expect(page).toHaveURL(/\/settings\/api$/);
    // });

    // test.step("should be able to navigate to identity settings via tabs", async () => {
    //   // First navigate to project settings
    //   await page
    //     .getByRole("navigation")
    //     .getByRole("link", { name: /project settings/i })
    //     .click();

    //   // Then navigate to identity settings via tab
    //   await page.getByRole("link", { name: /verified identity/i }).click();

    //   // Verify page loaded correctly
    //   await expect(
    //     page.getByRole("heading", { name: /verified identity/i })
    //   ).toBeVisible();
    //   await expect(
    //     page.getByText(/configure your verified domain/i)
    //   ).toBeVisible();

    //   // Verify URL changed
    //   await expect(page).toHaveURL(/\/settings\/identity$/);
    // });

    // test.step("should be able to navigate to members settings via tabs", async () => {
    //   // First navigate to project settings
    //   await page
    //     .getByRole("navigation")
    //     .getByRole("link", { name: /project settings/i })
    //     .click();

    //   // Then navigate to members settings via tab
    //   await page.getByRole("link", { name: /^members$/i }).click();

    //   // Verify page loaded correctly
    //   await expect(
    //     page.getByRole("heading", { name: /^members$/i })
    //   ).toBeVisible();
    //   await expect(
    //     page.getByText(/manage who has access to this project/i)
    //   ).toBeVisible();

    //   // Verify URL changed
    //   await expect(page).toHaveURL(/\/settings\/members$/);
    // });
  });
});
