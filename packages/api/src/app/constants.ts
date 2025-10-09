/**
 * Safely parse environment variables
 * @param key The key
 * @param defaultValue An optional default value if the environment variable does not exist
 */
export function validateEnv<T extends string = string>(key: keyof NodeJS.ProcessEnv, defaultValue?: T): T {
  const value = process.env[key] as T | undefined;

  if (!value) {
    if (typeof defaultValue !== "undefined") {
      return defaultValue;
    }
    throw new Error(`${key} is not defined in environment variables`);
  }

  return value;
}

// ENV
export const JWT_SECRET = validateEnv("JWT_SECRET");
export const NODE_ENV = validateEnv<"development" | "production">("NODE_ENV", "production");

export const DISABLE_SIGNUPS = validateEnv("DISABLE_SIGNUPS", "false").toLowerCase() === "true";

// URLs
export const API_URI = validateEnv("API_URI", "http://localhost:4000");
export const APP_URI = validateEnv("APP_URI", "http://localhost:3000");

if (!API_URI.startsWith("http")) {
  throw new Error("API_URI must start with 'http'");
}

if (!APP_URI.startsWith("http")) {
  throw new Error("APP_URI must start with 'http'");
}

export const AUTH_ISSUER = validateEnv("AUTH_ISSUER", "sendra");
export const AUTH_TTL_SECRET = validateEnv("AUTH_TTL_SECRET", "90 days");
export const AUTH_TTL_PUBLIC = validateEnv("AUTH_TTL_PUBLIC", "265 days");
export const AUTH_TTL_USER = validateEnv("AUTH_TTL_USER", "24 hours");
export const AUTH_COOKIE_NAME = validateEnv("AUTH_COOKIE_NAME", "token");

export const authConfig = {
  issuer: AUTH_ISSUER,
  ttl: {
    secret: AUTH_TTL_SECRET,
    public: AUTH_TTL_PUBLIC,
    user: AUTH_TTL_USER,
  },
  cookieName: AUTH_COOKIE_NAME,
  disableSignups: DISABLE_SIGNUPS,
};
