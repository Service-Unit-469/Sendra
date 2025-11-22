import useSWR from "swr";
import { useCurrentProject } from "./projects";

export function useAnalytics(period?: "week" | "month" | "year") {
  const project = useCurrentProject();

  return useSWR<{
    contacts: {
      timeseries: {
        day: Date;
        count: number;
      }[];
      subscribed: number;
      unsubscribed: number;
    };
    emails: {
      total: number;
      bounced: number;
      opened: number;
      complaint: number;
      totalPrev: number;
      bouncedPrev: number;
      openedPrev: number;
      complaintPrev: number;
    };
    clicks: { link: string; name: string; count: number }[];
  }>(`/projects/${project.id}/analytics?period=${period ?? "week"}`);
}
