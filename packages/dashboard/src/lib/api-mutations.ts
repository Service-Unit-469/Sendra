/**
 * Example API mutation utilities
 *
 * This file demonstrates how to create type-safe mutation functions
 * for POST, PUT, and DELETE operations.
 *
 * These can be used with SWR's mutate function or directly in event handlers.
 */

import type { ContactCreate, ContactUpdate } from "@sendra/shared";
import { createMutation } from "./api-client";
import { API_URI, TOKEN_KEY } from "./constants";

/**
 * Helper to create fetch requests with auth
 */
function createAuthenticatedRequest(url: string, init?: RequestInit): Promise<Response> {
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  return fetch(`${API_URI}${url}`, {
    ...init,
    headers: {
      ...init?.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
  });
}

/**
 * Example: Direct mutation function
 * This approach gives you full control and type safety
 */
export async function updateUserProfile(data: { email?: string }): Promise<{ id: string; email: string }> {
  const response = await createAuthenticatedRequest("/@me", {
    method: "PUT",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error?.message ?? "Failed to update profile");
  }

  return response.json();
}

/**
 * Example: Using the createMutation helper
 * This simplifies error handling and response parsing
 */
export const mutations = {
  /**
   * Update user profile
   */
  updateUser: createMutation<{ email?: string }, { id: string; email: string }>((data) =>
    createAuthenticatedRequest("/@me", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  ),

  /**
   * Create a contact for a project
   * Note: For routes with dynamic parameters, you'll need to pass them as arguments
   */
  createContact: (projectId: string) =>
    createMutation<ContactCreate, { id: string }>((data) =>
      createAuthenticatedRequest(`/projects/${projectId}/contacts`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    ),

  /**
   * Update a contact
   */
  updateContact: (projectId: string, contactId: string) =>
    createMutation<Omit<ContactUpdate, "id">, { id: string }>((data) =>
      createAuthenticatedRequest(`/projects/${projectId}/contacts/${contactId}`, {
        method: "PUT",
        body: JSON.stringify({ ...data, id: contactId }),
      }),
    ),

  /**
   * Delete a contact
   */
  deleteContact: (projectId: string, contactId: string) =>
    createMutation<void, void>(() =>
      createAuthenticatedRequest(`/projects/${projectId}/contacts/${contactId}`, {
        method: "DELETE",
      }),
    ),
};

/**
 * Example usage in a component:
 *
 * import { mutations } from '@/lib/api-mutations';
 * import { mutate } from 'swr';
 * import { toast } from 'sonner';
 *
 * function MyComponent() {
 *   const handleUpdate = async (data: ContactCreate) => {
 *     try {
 *       await mutations.createContact('project-id')(data);
 *       // Revalidate SWR cache
 *       await mutate('/projects/project-id/contacts');
 *       toast.success('Contact created!');
 *     } catch (error) {
 *       toast.error(error.message);
 *     }
 *   };
 *
 *   // Or with toast.promise for automatic loading/success/error states:
 *   const handleUpdateWithToast = (data: ContactCreate) => {
 *     toast.promise(
 *       mutations.createContact('project-id')(data),
 *       {
 *         loading: 'Creating contact...',
 *         success: () => {
 *           mutate('/projects/project-id/contacts');
 *           return 'Contact created!';
 *         },
 *         error: 'Failed to create contact',
 *       }
 *     );
 *   };
 * }
 */

/**
 * Helper to create a mutation with automatic SWR cache revalidation
 */
export function createMutationWithRevalidation<TInput, TOutput>(mutationFn: (input: TInput) => Promise<TOutput>, revalidateKeys: string[] | ((input: TInput) => string[])) {
  return async (input: TInput): Promise<TOutput> => {
    const result = await mutationFn(input);

    // Dynamically import mutate to avoid issues with SSR
    const { mutate } = await import("swr");

    const keys = typeof revalidateKeys === "function" ? revalidateKeys(input) : revalidateKeys;
    await Promise.all(keys.map((key) => mutate(key)));

    return result;
  };
}

/**
 * Example with automatic revalidation:
 *
 * const createContactWithRevalidation = createMutationWithRevalidation(
 *   mutations.createContact('project-id'),
 *   ['projects/project-id/contacts']
 * );
 */
