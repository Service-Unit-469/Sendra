import type { Group } from "@sendra/shared";
import useSWR from "swr";
import { useCurrentProject } from "./projects";

export function useAllGroups(enabled = true) {
  const currentProject = useCurrentProject();
  return useSWR<Group[]>(enabled ? `/projects/${currentProject.id}/groups/all` : null);
}

export const useGroup = (groupId: string) => {
  const currentProject = useCurrentProject();
  return useSWR<Group>(`/projects/${currentProject.id}/groups/${groupId}`);
};
