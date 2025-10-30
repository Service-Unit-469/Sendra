import { test as base } from "@playwright/test";
import { DashboardPage } from "./dashboard-page";

export type DashboardFixtures = {
  dashboardPage: DashboardPage;
};

export const test = base.extend<DashboardFixtures>({
  dashboardPage: async ({ page, isMobile }, use) => {
    const dashboardPage = new DashboardPage(page, isMobile);
    await dashboardPage.login();
    await use(dashboardPage);
  },
});
export { expect } from "@playwright/test";
