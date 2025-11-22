import type { Email } from "@sendra/shared";
import useSWR from "swr";
import { useCurrentProject } from "./projects";

export function useEmailsByCampaign(campaignId?: string) {
  const currentProject = useCurrentProject();
  return useSWR<Email[]>(`/projects/${currentProject.id}/emails/all?campaign=${campaignId}`);
}
