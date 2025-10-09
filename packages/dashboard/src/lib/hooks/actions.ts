import type { Action, Email, Event, Template, Trigger } from "@sendra/shared";
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
  return useSWR<
    (Action & {
      events: Event[];
      notevents: Event[];
      triggers: Trigger[];
      emails: Email[];
      template: Template;
    })[]
  >(activeProject ? `/projects/${activeProject.id}/actions/${id}/related` : null);
}

/**
 *
 */
export function useActions() {
  const activeProject = useActiveProject();

  return useSWR<
    (Action & {
      triggers: Trigger[];
      emails: Email[];
    })[]
  >(activeProject ? `/projects/${activeProject.id}/actions/all?embed=triggers&embed=emails` : null);
}
