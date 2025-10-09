import type { Contact, Email, Trigger } from "@sendra/shared";
import useSWR from "swr";
import { useActiveProject } from "./projects";

type ContactWithTrigger = Contact & { triggers: Trigger[] };

/**
 *
 * @param id.id
 * @param id
 * @param id.withProject
 */
export function useContact(id: string) {
  const activeProject = useActiveProject();
  return useSWR<Contact & { triggers: Trigger[]; emails: Email[] }>(id && activeProject?.id ? `/projects/${activeProject.id}/contacts/${id}?embed=triggers&embed=emails` : null);
}

export function useAllContacts() {
  const activeProject = useActiveProject();
  return useSWR<Contact[]>(activeProject?.id ? `/projects/${activeProject.id}/contacts/all` : null);
}

export function useAllContactsWithTriggers() {
  const activeProject = useActiveProject();
  return useSWR<(Contact & { triggers: Trigger[] })[]>(activeProject?.id ? `/projects/${activeProject.id}/contacts/all?embed=triggers` : null);
}

export function useContactsWithTriggers(cursor?: string) {
  const activeProject = useActiveProject();
  return useSWR<{
    items: ContactWithTrigger[];
    cursor?: string;
    count: number;
  }>(activeProject ? `/projects/${activeProject?.id}/contacts?embed=triggers${cursor ? `&cursor=${cursor}` : ""}` : null);
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
  }>(activeProject ? `/projects/${activeProject.id}/contacts?cursor=${cursor}` : null);
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
      url = `/projects/${activeProject.id}/contacts?embed=triggers`;
    }
  }
  return useSWR<{
    contacts: (Contact & {
      triggers: Trigger[];
      emails: Email[];
    })[];
    count: number;
  }>(url, {
    revalidateOnFocus: false,
    refreshInterval: 0,
  });
}
