import type { Page } from "@playwright/test";

export class DashboardPage {
  constructor(public readonly page: Page, public readonly isMobile: boolean) { }

  async login() {
    await this.page.goto("/dashboard#/auth/login", {});
    await this.page.getByLabel(/email/i).waitFor({ state: "visible" });
    await this.page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL!);
    await this.page
      .getByLabel(/password/i)
      .fill(process.env.E2E_USER_PASSWORD!);
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
