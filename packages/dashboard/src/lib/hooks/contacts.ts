import type { Contact, Email, Event, Sms } from "@sendra/shared";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { useActiveProject } from "./projects";

type ContactWithEvents = Contact & { _embed: { events: Event[] } };

/**
 *
 * @param id.id
 * @param id
 * @param id.withProject
 */
export function useContact(id: string) {
  const activeProject = useActiveProject();
  return useSWR<Contact & { _embed: { events: Event[]; emails: Email[], smses: Sms[] } }>(id && activeProject?.id ? `/projects/${activeProject.id}/contacts/${id}?embed=events&embed=emails&embed=smses` : null);
}

export function useAllContacts() {
  const activeProject = useActiveProject();
  return useSWR<Contact[]>(activeProject?.id ? `/projects/${activeProject.id}/contacts/all` : null);
}

export function useAllContactsWithEvents() {
  const activeProject = useActiveProject();
  return useSWR<ContactWithEvents[]>(activeProject?.id ? `/projects/${activeProject.id}/contacts/all?embed=events` : null);
}

/**
 *
 * @param cursor
 */
export function useContacts() {
  const activeProject = useActiveProject();

  return useSWRInfinite<{
    items: Contact[];
    cursor: string;
    count: number;
  }>((_, prev) => {
    if (!activeProject) {
      return null;
    }
    if (!prev) {
      return `/projects/${activeProject.id}/contacts`;
    }
    if (!prev.cursor) {
      return null; // reached the end
    }

    const params = new URLSearchParams({ cursor: prev.cursor });
    return `/projects/${activeProject.id}/contacts?${params.toString()}`; // SWR key
  });
}
