import type { User } from "@sendra/shared";
import useSWR from "swr";

/**
 * Fetch the current user. undefined means loading, null means logged out
 *
 */
export function useUser() {
  return useSWR<Pick<User, "id" | "email">>("/@me", { shouldRetryOnError: false });
}
