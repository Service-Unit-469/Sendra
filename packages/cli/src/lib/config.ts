import Conf from "conf";

export interface Config {
  apiUrl: string;
  token?: string;
}

/**
 * CLI configuration manager using conf
 * Stores API URL and authentication token
 */
export const config = new Conf<Config>({
  projectName: "sendra-cli",
  defaults: {
    apiUrl: "http://localhost:4000",
  },
});

/**
 * Get the API URL from config or environment
 */
export function getApiUrl(): string {
  return process.env.SENDRA_API_URL || config.get("apiUrl");
}

/**
 * Get the auth token from config or environment
 */
export function getToken(): string | undefined {
  return process.env.SENDRA_TOKEN || config.get("token");
}

/**
 * Set the API URL
 */
export function setApiUrl(url: string): void {
  config.set("apiUrl", url);
}

/**
 * Set the auth token
 */
export function setToken(token: string): void {
  config.set("token", token);
}

/**
 * Clear all configuration
 */
export function clearConfig(): void {
  config.clear();
}

/**
 * Get all configuration
 */
export function getAllConfig(): Config {
  return {
    apiUrl: getApiUrl(),
    token: getToken(),
  };
}
