import { hc } from "hono/client";
import { API_URI, TOKEN_KEY } from "./constants";

/**
 * Hono RPC client for direct API calls
 * Note: Full type inference requires matching Hono versions between packages.
 * For now, we'll use this primarily for the fetcher utilities.
 */
// biome-ignore lint/suspicious/noExplicitAny: Using any due to Hono version mismatch between packages
export const client = hc<any>(API_URI, {
  headers: (): Record<string, string> => {
    const token = typeof window !== "undefined" ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  },
});

/**
 * Type-safe fetcher function for SWR
 * This is a drop-in replacement for the existing network.fetch fetcher
 *
 * @param url - The API endpoint path
 * @param init - Fetch options
 * @returns Parsed JSON response
 */
export async function apiFetcher<T>(url: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? sessionStorage.getItem(TOKEN_KEY) : null;

  const response = await fetch(API_URI + url, {
    ...init,
    headers: {
      ...init?.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Something went wrong!" }));
    throw new Error(error?.message ?? error?.detail ?? "Something went wrong!");
  }

  if (init?.method === "DELETE") {
    return undefined as unknown as T;
  }

  return response.json();
}

/**
 * Wrapper to convert Hono client calls to SWR-compatible fetchers
 * Use this to create typed fetchers for SWR hooks
 *
 * @example
 * const fetcher = createHonoFetcher(() => client['@me'].$get())
 * const { data } = useSWR('/@me', fetcher)
 */
export function createHonoFetcher<T>(honoCall: () => Promise<Response>): () => Promise<T> {
  return async () => {
    const response = await honoCall();
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "API error" }));
      throw new Error(error?.message ?? error?.detail ?? "API error");
    }
    return response.json();
  };
}

/**
 * Helper to create typed mutation functions (POST, PUT, DELETE)
 * These return typed results and work with SWR's mutate function
 *
 * @example
 * const updateUser = createMutation((data: UpdateUserInput) =>
 *   client['@me'].$put({ json: data })
 * )
 */
export function createMutation<TInput, TOutput>(mutationFn: (input: TInput) => Promise<Response>): (input: TInput) => Promise<TOutput> {
  return async (input: TInput) => {
    const response = await mutationFn(input);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Mutation failed" }));
      throw new Error(error?.message ?? error?.detail ?? "Mutation failed");
    }

    if (response.status === 204) {
      return undefined as unknown as TOutput;
    }

    return response.json();
  };
}
