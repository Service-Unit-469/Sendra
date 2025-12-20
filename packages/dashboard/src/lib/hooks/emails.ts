import type { Campaign, Email } from "@sendra/shared";
import useSWR from "swr";
import { useCurrentProject } from "./projects";

export function useEmailsByCampaign(campaign?: Campaign) {
  const currentProject = useCurrentProject();
  let input: string | null = null;
  if (campaign?.id && campaign?.status === "DELIVERED") {
    input = `/projects/${currentProject.id}/emails/all?filter=source&value=${campaign.id}`;
  }
  return useSWR<Email[]>(input);
}
