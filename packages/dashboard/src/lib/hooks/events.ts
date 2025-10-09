import type { Event, Trigger } from "@sendra/shared";
import useSWR from "swr";
import { useActiveProject } from "./projects";

/**
 *
 */
export function useEvents() {
  const activeProject = useActiveProject();

  return useSWR<Event[]>(activeProject ? `/projects/${activeProject.id}/events/all` : null);
}

export function useEventsWithTriggers() {
  const activeProject = useActiveProject();

  return useSWR<(Event & { triggers: Trigger[] })[]>(activeProject ? `/projects/${activeProject.id}/events/all?embed=triggers` : null);
}
