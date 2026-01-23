import { expect, test } from "./fixtures/dashboard";

test.describe("Home", () => {
  test("should be able to navigate to dashboard home page", async ({
    dashboardPage,
    page,
  }) => {
    // Navigate using sidebar
    await dashboardPage.navigateTo("Dashboard", "/");
    await dashboardPage.waitForContentLoading();
    // Verify page loaded correctly
    const main = page.getByRole('main');
    await expect(
      main.getByRole("link", { name: "Analytics" })
    ).toBeVisible();
    await expect(
        main.getByRole("link", { name: "Documentation" })
    ).toBeVisible();
    await expect(main.getByRole("heading", { name: "Activity Feed" })).toBeVisible();
    await dashboardPage.waitForContentLoaded();
  });


  test('events will be displayed in the activity feed', async ({
    dashboardPage,
    page,
  }) => {
    const eventName = `test-${new Date().getTime()}`;
    await dashboardPage.navigateTo("Events", "/events");
    await dashboardPage.waitForContentLoading();
    await dashboardPage.waitForContentLoaded();
    await page.getByRole("button", { name: "New" }).click();
    await page.getByRole("textbox", { name: "Event" }).fill(eventName);
    await page.getByRole("button", { name: "Trigger" }).click();
    await page.getByText("Created new event").waitFor({ state: "visible" });
    await page.reload();
    await dashboardPage.navigateTo("Dashboard", "/");
    await page.getByText(eventName).waitFor({ state: 'visible' });
  });
});
