import type { Campaign, Email } from "@sendra/shared";
import useSWR from "swr";
import { useCurrentProject } from "./projects";

/**
 *
 * @param id
 */
export function useCampaign(id: string) {
  const currentProject = useCurrentProject();
  return useSWR<Campaign>(`/projects/${currentProject.id}/campaigns/${id}`);
}

/**
 * Campaign list without embedded emails (uses denormalized `stats` for aggregates).
 */
export function useCampaigns() {
  const currentProject = useCurrentProject();
  return useSWR<Campaign[]>(`/projects/${currentProject.id}/campaigns/all`);
}

/**
 * @deprecated Prefer `useCampaigns()`; embedding all emails does not scale.
 */
export function useCampaignsWithEmails() {
  const currentProject = useCurrentProject();
  return useSWR<(Campaign & { _embed: { emails: Email[] } })[]>(`/projects/${currentProject.id}/campaigns/all?embed=emails`);
}
