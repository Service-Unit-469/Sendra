import useSWR from "swr";
import { useActiveProject } from "./projects";

/**

 * @param period
 */
export function useAnalytics(period?: "week" | "month" | "year") {
  const activeProject = useActiveProject();

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
  }>(activeProject ? `/projects/${activeProject.id}/analytics?period=${period ?? "week"}` : null);
}
