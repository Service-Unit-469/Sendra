import type { Contact, Email, Event } from "@sendra/shared";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { useCurrentProject } from "./projects";

/**
 *
 * @param id.id
 * @param id
 * @param id.withProject
 */
export function useContact(id: string) {
  const currentProject = useCurrentProject();
  return useSWR<Contact & { _embed: { events: Event[]; emails: Email[] } }>(`/projects/${currentProject.id}/contacts/${id}?embed=events&embed=emails`);
}

export function useAllContacts(enabled = true) {
  const currentProject = useCurrentProject();
  return useSWR<Contact[]>(enabled ? `/projects/${currentProject.id}/contacts/all` : null);
}

/**
 *
 * @param cursor
 */
export function useContacts() {
  const currentProject = useCurrentProject();

  return useSWRInfinite<{
    items: Contact[];
    cursor: string;
    count: number;
  }>((_, prev) => {
    if (!prev) {
      return `/projects/${currentProject.id}/contacts?limit=50`;
    }
    if (!prev.cursor) {
      return null; // reached the end
    }

    const params = new URLSearchParams({ cursor: prev.cursor, limit: "50" });
    return `/projects/${currentProject.id}/contacts?${params.toString()}`; // SWR key
  });
}
