import type { Action, Email, Event } from "@sendra/shared";
import useSWR from "swr";
import { useActiveProject } from "./projects";

/**
 *
 * @param id
 */
export function useAction(id: string) {
  const activeProject = useActiveProject();
  return useSWR<Action>(activeProject ? `/projects/${activeProject.id}/actions/${id}` : null);
}

/**
 *
 * @param id
 */
export function useRelatedActions(id: string) {
  const activeProject = useActiveProject();
  return useSWR<Action[]>(activeProject ? `/projects/${activeProject.id}/actions/${id}/related` : null);
}

/**
 *
 */
export function useActions() {
  const activeProject = useActiveProject();

  return useSWR<
    (Action & {
      _embed: {
        events: Event[];
        emails: Email[];
      };
    })[]
  >(activeProject ? `/projects/${activeProject.id}/actions/all?embed=events&embed=emails` : null);
}
