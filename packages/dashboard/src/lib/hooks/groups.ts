import type { Group } from "@sendra/shared";
import useSWR from "swr";
import { useCurrentProject } from "./projects";

export function useAllGroups() {
  const currentProject = useCurrentProject();
  return useSWR<Group[]>(`/projects/${currentProject.id}/groups/all`);
}

export const useGroup = (groupId: string) => {
  const currentProject = useCurrentProject();
  return useSWR<Group>(`/projects/${currentProject.id}/groups/${groupId}`);
};
