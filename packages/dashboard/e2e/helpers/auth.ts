import type { Page } from "@playwright/test";

/**
 * Helper to login a user via the UI
 * 
 * @requires Test account must exist in database with email verified
 */
export async function login(page: Page, email = "test@example.com", password = "password123") {
	await page.goto("/auth/login");
	await page.getByLabel(/email/i).fill(email);
	await page.getByLabel(/password/i).fill(password);
	await page.getByRole("button", { name: /log in/i }).click();
	await page.waitForURL(/\/(?!auth)/);
}

/**
 * Helper to logout a user
 */
export async function logout(page: Page) {
	await page.goto("/auth/logout");
	await page.waitForURL(/\/auth\/login/);
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
	const token = await page.evaluate(() => localStorage.getItem("sendra.token"));
	return token !== null;
}

/**
 * Set authentication token directly (bypass UI login)
 */
export async function setAuthToken(page: Page, token = "mock-test-token") {
	await page.evaluate((tokenValue: string) => {
		localStorage.setItem("sendra.token", tokenValue);
	}, token);
}

