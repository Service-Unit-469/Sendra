import type { Action, Template } from "@sendra/shared";
import useSWR from "swr";
import { useActiveProject } from "./projects";

/**
 *
 * @param id
 */
export function useTemplate(id: string) {
  const activeProject = useActiveProject();
  return useSWR(activeProject ? `/projects/${activeProject.id}/templates/${id}` : null);
}

/**
 *
 */
export function useTemplates() {
  const activeProject = useActiveProject();

  return useSWR<
    (Template & {
      actions: Action[];
    })[]
  >(activeProject ? `/projects/${activeProject.id}/templates/all?embed=actions` : null);
}
