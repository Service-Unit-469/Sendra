import { expect, type Page } from "@playwright/test";
import { getAuthCredentials } from "../util/auth-credentials";

let cachedAuthToken: string | null = null;

export class DashboardPage {
  constructor(public readonly page: Page, public readonly isMobile: boolean) { }

  async login() {
    if (cachedAuthToken) {
      await this.page.goto("/dashboard#/auth/login");
      await this.page.evaluate((token: string) => {
        localStorage.setItem("sendra.token", token);
      }, cachedAuthToken);
      await this.page.reload();
      await this.page.goto("/dashboard#/");
      try {
        await this.page.waitForURL(/\/dashboard#\/(?!auth)/, { timeout: 10_000 });
        await this.page.getByRole("navigation").waitFor({ state: "visible", timeout: 10_000 });
        await this.waitForReady();
        return;
      } catch {
        cachedAuthToken = null;
      }
    }

    const { email, password } = getAuthCredentials();
    await this.page.goto("/dashboard#/auth/login");
    await this.page.getByLabel(/email/i).waitFor({ state: "visible" });
    await this.page.getByLabel(/email/i).fill(email);
    await this.page.getByLabel(/password/i).fill(password);
    await this.page.getByRole("button", { name: /login/i }).click();
    await this.page.waitForURL(/\/dashboard#\/(?!auth)/, { timeout: 10_000 });

    cachedAuthToken = await this.page.evaluate(() => localStorage.getItem("sendra.token"));
    if (!cachedAuthToken) {
      throw new Error("UI login succeeded but auth token was not found in localStorage");
    }

    await this.waitForReady();
  }

  async clickTab(name: string, path: string) {
    if (this.isMobile) {
      await this.page.getByLabel("Select a tab").selectOption(path);
    } else {
      await this.page.getByRole("link", { name }).click();
    }
    await this.page.waitForURL(`**${path}`);
  }

  async createTemplate(templateName: string, beforeSave?: () => Promise<void>) {
    await this.navigateTo("Templates", "/templates");
    await this.page.getByRole('heading', {name: 'Templates'}).waitFor({state: 'visible'});
    await this.page.getByRole("button", { name: "New" }).click();
    await this.page.getByRole("button", { name: "Create" }).waitFor({ state: "visible" });
    await this.page.getByRole("textbox", { name: "Subject" }).fill(templateName);
    await this.page.getByRole('heading', {name:templateName}).waitFor({state: 'visible'});
    if(beforeSave) {
      await beforeSave();
    }
    const createButton = this.page.getByRole("button", { name: "Create" });
    await expect(createButton).not.toBeDisabled();
    await createButton.click();
    await this.page.waitForURL("**/templates");
    const createdToast = this.page.getByText('Created new template!');
    await createdToast.waitFor({ state: 'visible' });
    await createdToast.waitFor({state: 'hidden'});
    const templateInList = this.page.getByText(templateName, { exact: false });
    try {
      await templateInList.waitFor({ state: "attached", timeout: 5_000 });
      await templateInList.scrollIntoViewIfNeeded();
    } catch {
    }
  };

  getPreviewFrame() {
    return this.page.locator('#preview-frame').contentFrame();
  }

  async navigateTo(name: string, path: string) {
    if (this.isMobile) {
      const openSidebarButton = this.page.getByRole("button", {
        name: "Open sidebar",
      });
      await openSidebarButton.waitFor({ state: "visible" });
      await openSidebarButton.click();
    }
    const nav = this.page.getByRole("navigation");
    await nav.getByRole("link", { name }).click();
    await this.page.waitForURL(`**${path}`);
    await this.waitForReady();
  }

  async selectDropdownItem(dropdownAriaLabel: string, value?: string) {
    const dropdownButton = this.page.getByLabel(dropdownAriaLabel);
    await expect(dropdownButton).not.toBeDisabled();
    await dropdownButton.click();

    const dropdown =  dropdownButton.locator('..').getByRole('listbox');
    await dropdown.waitFor({state:'visible'});
    await expect(dropdown).toBeEnabled();
    let item = dropdown.locator("li").filter({ hasNotText: /no results found/i }).first();
    if (value) {
      const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const namedItem = dropdown.locator("li").filter({ hasText: new RegExp(`^\\s*${escapedValue}\\s*$`, "i") }).first();
      try {
        await namedItem.waitFor({ state: "visible", timeout: 10_000 });
        item = namedItem;
      } catch {
        await item.waitFor({ state: "visible", timeout: 10_000 });
      }
    } else {
      await item.waitFor({ state: "visible", timeout: 10_000 });
    }
    await item.click();
    try {
      await dropdown.waitFor({ state: "hidden", timeout: 2_000 });
    } catch {
      await dropdownButton.click();
      await dropdown.waitFor({ state: "hidden", timeout: 2_000 });
    }
  } 

  async waitForReady() {
    await this.page
      .getByRole("heading", { name: "Loading..." })
      .waitFor({ state: "hidden" });
  }

  async waitForContentLoading() {
    try {
      await this.page.getByRole('main')
        .getByRole("status",)
        .waitFor({ state: "visible", timeout: 500 });
    } catch (error) {
      // If the status is not visible that is generally fine as it means the content is already loaded
    }
  }

  async waitForContentLoaded() {
    await this.page.getByRole('main')
      .getByRole("status")
      .waitFor({ state: "hidden" });
  }
}
