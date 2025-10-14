import type { Contact, Email, Event } from "@sendra/shared";
import useSWR from "swr";
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
  return useSWR<Contact & { _embed: { events: Event[]; emails: Email[] } }>(
    id && activeProject?.id
      ? `/projects/${activeProject.id}/contacts/${id}?embed=events&embed=emails`
      : null
  );
}

export function useAllContacts() {
  const activeProject = useActiveProject();
  return useSWR<Contact[]>(
    activeProject?.id ? `/projects/${activeProject.id}/contacts/all` : null
  );
}

export function useAllContactsWithEvents() {
  const activeProject = useActiveProject();
  return useSWR<ContactWithEvents[]>(
    activeProject?.id
      ? `/projects/${activeProject.id}/contacts/all?embed=events`
      : null
  );
}

export function useContactsWithEvents(cursor?: string) {
  const activeProject = useActiveProject();
  return useSWR<{
    items: ContactWithEvents[];
    cursor?: string;
    count: number;
  }>(
    activeProject
      ? `/projects/${activeProject?.id}/contacts?embed=events${
          cursor ? `&cursor=${cursor}` : ""
        }`
      : null
  );
}

/**
 *
 * @param cursor
 */
export function useContacts(cursor?: string) {
  const activeProject = useActiveProject();

  return useSWR<{
    contacts: Contact[];
    cursor: string;
    count: number;
  }>(
    activeProject
      ? `/projects/${activeProject.id}/contacts?cursor=${cursor}`
      : null
  );
}

/**
 *
 * @param query
 */
export function searchContacts(query: string | undefined) {
  const activeProject = useActiveProject();

  let url = null;
  if (activeProject) {
    if (query) {
      url = `/projects/${activeProject.id}/contacts/search?query=${query}`;
    } else {
      url = `/projects/${activeProject.id}/contacts?embed=events`;
    }
  }
  return useSWR<{
    contacts: (Contact & { _embed: { events: Event[]; emails: Email[] } })[];
    count: number;
  }>(url, {
    revalidateOnFocus: false,
    refreshInterval: 0,
  });
}
