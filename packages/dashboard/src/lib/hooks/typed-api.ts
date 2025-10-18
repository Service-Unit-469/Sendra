/**
 * Example typed API hooks with SWR
 *
 * This file demonstrates best practices for creating type-safe API hooks
 * that work with SWR's caching and revalidation features.
 *
 * The recommended approach is to use the string-based SWR pattern with
 * explicit TypeScript types, which provides a good balance of type safety
 * and simplicity.
 */

import type { User } from "@sendra/shared";
import useSWR from "swr";

/**
 * Example: Typed user hook using explicit types
 * This is the recommended approach - simple and type-safe
 */
export function useUserTyped() {
  return useSWR<Pick<User, "id" | "email">>("/@me");
}

/**
 * Example: Health check with typed response
 */
export function useHealthCheck() {
  return useSWR<{ success: boolean }>("/health");
}

/**
 * Example: Hook with dynamic parameters
 */
export function useProject(projectId: string | null) {
  return useSWR<{ id: string; name: string }>(projectId ? `/projects/${projectId}` : null);
}

/**
 * Note: For routes with dynamic parameters, you'll still want to use
 * the traditional approach or create helper functions. For example:
 *
 * export function useProjectTyped(projectId: string) {
 *   return useSWR(
 *     projectId ? `/projects/${projectId}` : null,
 *     createHonoFetcher(() =>
 *       client.projects[':id'].$get({
 *         param: { id: projectId }
 *       })
 *     )
 *   );
 * }
 *
 * However, for most use cases, the existing string-based approach
 * with the typed apiFetcher is sufficient and simpler.
 */
