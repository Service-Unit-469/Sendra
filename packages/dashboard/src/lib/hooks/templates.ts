import type { Action, Template } from "@sendra/shared";
import useSWR from "swr";
import { useActiveProject } from "./projects";

export type TemplateWithActions = Template & {
  _embed: { actions: Action[] };
};

/**
 *
 * @param id
 */
export function useTemplate(id: string) {
  const activeProject = useActiveProject();
  return useSWR<TemplateWithActions>(
    activeProject
      ? `/projects/${activeProject.id}/templates/${id}?embed=actions`
      : null
  );
}

/**
 *
 */
export function useTemplates() {
  const activeProject = useActiveProject();

  return useSWR<TemplateWithActions[]>(
    activeProject
      ? `/projects/${activeProject.id}/templates/all?embed=actions`
      : null
  );
}
