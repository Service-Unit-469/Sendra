import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

interface AuthCredentials {
  email: string;
  password: string;
  projectId: string;
}

let cachedCredentials: AuthCredentials | null = null;

/**
 * Get E2E test credentials from the file written by global.setup.ts
 * Falls back to environment variables for backwards compatibility
 */
export function getAuthCredentials(): AuthCredentials {
  if (cachedCredentials) {
    return cachedCredentials;
  }

  // Try to read from file first (for CI/shared projects)
  const credentialsPath = join(__dirname, "..", ".auth-credentials.json");
  if (existsSync(credentialsPath)) {
    try {
      console.log(`Reading credentials from file: ${credentialsPath}`);
      cachedCredentials = JSON.parse(
        readFileSync(credentialsPath, "utf-8"),
      ) as AuthCredentials;
      return cachedCredentials;
    } catch (error) {
      console.warn(`Failed to read credentials from tile: ${credentialsPath}`, error);
      // Fall through to environment variables
    }
  }

  // Fall back to environment variables (for local development)
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  const projectId = process.env.E2E_PROJECT_ID;
  console.log('Using env variable credentials');

  if (!email || !password || !projectId) {
    throw new Error(
      "E2E credentials not found. Make sure global.setup.ts has run successfully.",
    );
  }

  cachedCredentials = { email, password, projectId };
  return cachedCredentials;
}
