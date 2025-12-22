import type { EmbedLimit } from "@sendra/lib";
import type { Event } from "@sendra/shared";
import useSWR from "swr";
import { useCurrentProject } from "./projects";

export type EventType = {
  name: string;
  _embed: {
    events: Event[];
  };
};

/**
 *
 */
export function useEventTypes() {
  const currentProject = useCurrentProject();

  return useSWR<{ eventTypes: { name: string }[] }>(`/projects/${currentProject.id}/event-types/all`);
}

export function useEventTypesWithEvents(embedLimit?: EmbedLimit) {
  const currentProject = useCurrentProject();

  return useSWR<{ eventTypes: EventType[] }>(`/projects/${currentProject.id}/event-types/all?embed=events&embedLimit=${embedLimit}`);
}
