import type { Action, Contact, Email, Event, Membership, ProjectKeys, PublicProject } from "@sendra/shared";
import { useAtom } from "jotai";
import useSWR from "swr";
import { atomActiveProject } from "../atoms/project";

/**
 *
 */
export function useProjects() {
  return useSWR<PublicProject[]>("/projects");
}

/**
 *
 */
export function useActiveProject(): PublicProject | null {
  const [activeProject, setActiveProject] = useAtom(atomActiveProject);
  const { data: projects } = useProjects();

  if (!projects) {
    return null;
  }

  if (activeProject && !projects.find((project) => project.id === activeProject)) {
    setActiveProject(null);
    window.localStorage.removeItem("project");
  }

  if (!activeProject && projects.length > 0) {
    setActiveProject(projects[0].id);
    window.localStorage.setItem("project", projects[0].id);
  }

  return projects.find((project) => project.id === activeProject) ?? null;
}

/**
 *
 */
export function useActiveProjectMemberships() {
  const activeProject = useActiveProject();

  return useSWR<{ members: Membership[] }>(activeProject ? `/projects/${activeProject.id}/members` : null);
}

/**
 *
 */
export function useActiveProjectFeed(page: number) {
  const activeProject = useActiveProject();

  return useSWR<
    (
      | {
          createdAt: Date;
          contact?: Contact;
          event?: {
            name: string;
          };
          action?: Action;
        }
      | ({
          createdAt: Date;
          contact?: Contact;
        } & Pick<Email, "messageId" | "status">)
    )[]
  >(activeProject ? `/projects/${activeProject.id}/feed?page=${page}` : null);
}

/**
 *
 */
export function useActiveProjectVerifiedIdentity() {
  const activeProject = useActiveProject();

  return useSWR<{
    verified: boolean;
    tokens: string[];
  }>(activeProject ? `/projects/${activeProject.id}/identity` : null);
}

export function useActiveProjectKeys() {
  const activeProject = useActiveProject();

  return useSWR<ProjectKeys>(activeProject ? `/projects/${activeProject.id}/keys` : null);
}
