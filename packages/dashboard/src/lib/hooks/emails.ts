import type { Email } from "@sendra/shared";
import useSWR from "swr";
import { useActiveProject } from "./projects";

/**
 *
 */
export function useEmails() {
  const activeProject = useActiveProject();
  return useSWR<{
    items: Email[];
    cursor: string;
    hasMore: boolean;
    count: number;
  }>(activeProject ? `/projects/${activeProject.id}/emails` : null);
}

export function useEmailsByCampaign(campaignId?: string) {
  const activeProject = useActiveProject();
  return useSWR<Email[]>(activeProject && campaignId ? `/projects/${activeProject.id}/emails/all?filter=source&value=${campaignId}` : null);
}
