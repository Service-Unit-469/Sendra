import type { Group } from "@sendra/shared";
import useSWR from "swr";
import { useActiveProject } from "./projects";

export function useAllGroups() {
  const activeProject = useActiveProject();
  return useSWR<Group[]>(activeProject?.id ? `/projects/${activeProject.id}/groups/all` : null);
}

export const useGroup = (groupId: string) => {
  const activeProject = useActiveProject();
  return useSWR<Group>(activeProject?.id ? `/projects/${activeProject.id}/groups/${groupId}` : null);
};
