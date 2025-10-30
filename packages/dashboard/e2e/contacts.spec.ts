import { expect, test } from "./fixtures/dashboard";

test.describe("Contacts", () => {
  test("should be able to navigate to contacts page", async ({
    dashboardPage,
    page,
  }) => {
    // Navigate using sidebar
    await dashboardPage.navigateTo("Contacts", "/contacts");

    // Verify page loaded correctly
    await expect(
      page.getByRole("searchbox", { name: "Filter contacts by email" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Filter contacts by status" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "New" })).toBeVisible();
  });

  test("Can modify a contact", async ({
    dashboardPage,
    page,
    browserName,
  }) => {
    await dashboardPage.navigateTo("Contacts", "/contacts");
    const email = `test+${browserName}+${new Date().getTime()}@example.com`;

    await test.step("Create new contact", async () => {
      await page.getByRole("button", { name: "New" }).click();

      await page.getByRole("textbox", { name: "Email" }).fill(email);

      await page.getByRole("button", { name: "Add" }).click();
      await page.getByRole("textbox", { name: "Key" }).fill("browser");
      await page.getByRole("textbox", { name: "Value" }).fill(browserName);

      await page.getByRole("button", { name: "Create" }).click();
    });

    await test.step("Verify contact is created", async () => {
      await page
        .getByRole("searchbox", { name: "Filter contacts by email" })
        .fill(email);
      await page
        .getByRole("cell", { name: email })
        .waitFor({ state: "visible" });

      const editContact = page
        .locator("tr")
        .filter({ hasText: email })
        .getByRole("link", { name: "Edit contact" });
      await editContact.scrollIntoViewIfNeeded();
      await editContact.click();
    });

    await test.step("Verify contact can be edited", async () => {
      await page
        .getByRole("heading", { name: email })
        .waitFor({ state: "visible", timeout: 5_000 });

      await expect(
        page.getByText("This contact has opted-in to")
      ).toBeVisible();
      await page.getByRole("switch").click();
      await expect(page.getByText("This contact prefers not to")).toBeVisible();

      await page.getByRole("button", { name: "Remove field" }).click();
      await page.getByRole("heading", { name: "Journey" }).click();
      await page.getByRole("button", { name: "Open options" }).click();
      await page.getByRole("menuitem", { name: "Delete" }).click();
      await page.waitForURL("**/contacts");
      await expect(
        page.getByText("Deleted contact")
      ).toBeVisible();
    });
  });
});
