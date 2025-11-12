import type { Email } from "@sendra/shared";
import useSWR from "swr";
import { useActiveProject } from "./projects";

export function useEmailsByCampaign(campaignId?: string) {
  const activeProject = useActiveProject();
  return useSWR<Email[]>(activeProject && campaignId ? `/projects/${activeProject.id}/emails/all?campaign=${campaignId}` : null);
}
