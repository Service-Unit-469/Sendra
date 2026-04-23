import { expect, type Page } from "@playwright/test";
import { getAuthCredentials } from "../util/auth-credentials";

export class DashboardPage {
  constructor(public readonly page: Page, public readonly isMobile: boolean) { }

  async login() {
    const { email, password } = getAuthCredentials();
    await this.page.goto("/dashboard#/auth/login", {});
    await this.page.getByLabel(/email/i).waitFor({ state: "visible" });
    await this.page.getByLabel(/email/i).fill(email);
    await this.page.getByLabel(/password/i).fill(password);
    await this.page.getByRole("button", { name: /login/i }).click();
    await this.page.waitForURL(/\/(?!auth)/);
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
    await this.page.getByText(templateName, { exact: false }).scrollIntoViewIfNeeded();
    await this.page.getByText(templateName, { exact: false }).waitFor({ state: "attached" });
    await this.page.getByText('Created new template!').waitFor({state: 'hidden'});
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

  async selectDropdownItem(dropdownAriaLabel: string, value: string) {
    const dropdownButton = this.page.getByLabel(dropdownAriaLabel);
    await expect(dropdownButton).not.toBeDisabled();
    await dropdownButton.click();

    const dropdown =  dropdownButton.locator('..').getByRole('listbox');
    await dropdown.waitFor({state:'visible'});
    const item = dropdown.getByRole('listitem', {name: value});
    await item.scrollIntoViewIfNeeded();
    await item.click();
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
