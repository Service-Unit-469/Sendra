import { hc } from "hono/client";
import { getApiUrl, getToken } from "./config";

/**
 * Hono RPC client for CLI
 * Automatically uses configuration from config file or environment variables
 */
export function createClient() {
  const apiUrl = getApiUrl();
  const token = getToken();

  // biome-ignore lint/suspicious/noExplicitAny: Using any due to cross-package type compatibility
  return hc<any>(apiUrl, {
    headers: (): Record<string, string> => {
      if (token) {
        return { Authorization: `Bearer ${token}` };
      }
      return {};
    },
  });
}

/**
 * Make a typed API request
 * Automatically handles errors and returns parsed JSON
 */
export async function apiRequest<T>(requestFn: () => Promise<Response>): Promise<T> {
  const response = await requestFn();

  if (!response.ok) {
    const error = (await response.json().catch(() => ({
      message: "Unknown error occurred",
    }))) as { message?: string; detail?: string };
    throw new Error(error?.message ?? error?.detail ?? "API request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/**
 * Make an authenticated HTTP request
 * Single method handles all HTTP methods - no duplication!
 */
export async function request<T = unknown, B = unknown>(method: "GET" | "POST" | "PUT" | "DELETE", path: string, body?: B): Promise<T> {
  const apiUrl = getApiUrl();
  const token = getToken();

  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({
      message: "Unknown error",
    }))) as { message?: string; detail?: string };
    throw new Error(error?.message ?? error?.detail ?? `${method} request failed`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// Convenience wrappers for backward compatibility and cleaner syntax
export const get = <T>(path: string) => request<T>("GET", path);
export const post = <T, B = unknown>(path: string, body?: B) => request<T, B>("POST", path, body);
export const put = <T, B = unknown>(path: string, body?: B) => request<T, B>("PUT", path, body);
export const del = <T = void>(path: string) => request<T>("DELETE", path);
