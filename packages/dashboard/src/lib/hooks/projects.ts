import type { Action, Contact, Email, Membership, ProjectIdentity, ProjectKeys, PublicProject } from "@sendra/shared";
import { useAtom } from "jotai";
import { useMemo } from "react";
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
  const [activeProjectId, setActiveProjectId] = useAtom(atomActiveProject);
  const { data: projects } = useProjects();

  const activeProject = useMemo(() => {
    if (!projects || projects.length === 0) {
      return null;
    }

    let foundProject = projects.find((project) => project.id === activeProjectId);
    if (!foundProject && projects.length > 0) {
      foundProject = projects[0];
      window.localStorage.setItem("project", foundProject.id);
      setActiveProjectId(foundProject.id);
    }
    return foundProject ?? null;
  }, [projects, activeProjectId, setActiveProjectId]);

  return activeProject;
}

/**
 *
 */
export function useActiveProjectMemberships() {
  const activeProject = useActiveProject();

  return useSWR<{ members: Membership[] }>(activeProject?.id ? `/projects/${activeProject.id}/members` : null);
}

/**
 *
 */
export function useActiveProjectFeed() {
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
  >(activeProject?.id ? `/projects/${activeProject.id}/feed` : null);
}

/**
 *
 */
export function useActiveProjectIdentity() {
  const activeProject = useActiveProject();

  return useSWR<{
    identity: ProjectIdentity;
    status: "Pending" | "Success" | "Failed" | "TemporaryFailure" | "NotStarted";
    dkimTokens?: string[];
    dkimEnabled?: boolean;
  }>(activeProject ? `/projects/${activeProject.id}/identity` : null);
}

export function useActiveProjectKeys() {
  const activeProject = useActiveProject();

  return useSWR<ProjectKeys>(activeProject?.id ? `/projects/${activeProject.id}/keys` : null);
}
