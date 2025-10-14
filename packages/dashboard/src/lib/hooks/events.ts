import type { Event, EventType } from "@sendra/shared";
import useSWR from "swr";
import { useActiveProject } from "./projects";

/**
 *
 */
export function useEventTypes() {
  const activeProject = useActiveProject();

  return useSWR<EventType[]>(activeProject ? `/projects/${activeProject.id}/event-types/all` : null);
}

export function useEventTypesWithEvents() {
  const activeProject = useActiveProject();

  return useSWR<(EventType & { _embed: { events: Event[] } })[]>(activeProject ? `/projects/${activeProject.id}/event-types/all?embed=events` : null);
}
