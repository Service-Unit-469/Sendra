import type { Action, Email, Event } from "@sendra/shared";
import useSWR from "swr";
import { useCurrentProject } from "./projects";

/**
 *
 * @param id
 */
export function useAction(id: string) {
  const currentProject = useCurrentProject();
  return useSWR<Action>(`/projects/${currentProject.id}/actions/${id}`);
}

/**
 *
 * @param id
 */
export function useRelatedActions(id: string) {
  const currentProject = useCurrentProject();
  return useSWR<Action[]>(`/projects/${currentProject.id}/actions/${id}/related`);
}

/**
 *
 */
export function useActions() {
  const currentProject = useCurrentProject();

  return useSWR<
    (Action & {
      _embed: {
        events: Event[];
        emails: Email[];
      };
    })[]
  >(`/projects/${currentProject.id}/actions/all?embed=events&embed=emails`);
}
