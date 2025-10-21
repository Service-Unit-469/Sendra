import type { Sms } from "@sendra/shared";
import useSWR from "swr";
import { useActiveProject } from "./projects";

export function useSmsesByCampaign(campaignId?: string) {
  const activeProject = useActiveProject();
  return useSWR<Sms[]>(activeProject && campaignId ? `/projects/${activeProject.id}/sms/all?filter=source&value=${campaignId}` : null);
}
