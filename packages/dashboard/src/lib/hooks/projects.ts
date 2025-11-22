import type { Action, Contact, Email, Membership, ProjectIdentity, ProjectKeys, PublicProject } from "@sendra/shared";
import { useAtom } from "jotai";
import { useMemo } from "react";
import useSWR from "swr";
import { atomActiveProjectId, atomCurrentProject } from "../atoms/project";

/**
 *
 */
export function useProjects() {
  return useSWR<PublicProject[]>("/projects");
}

/**
 * Call this to get the active project ID and set the current project in the atom.
 */
export function useActiveProject(): PublicProject | null {
  const [activeProjectId, setActiveProjectId] = useAtom(atomActiveProjectId);
  const [, setCurrentProject] = useAtom(atomCurrentProject);
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
    if (foundProject) {
      setCurrentProject(foundProject);
    }
    return foundProject ?? null;
  }, [projects, activeProjectId, setActiveProjectId, setCurrentProject]);

  return activeProject;
}

/**
 * Call this to get the current project from a dashboard screen.
 */
export function useCurrentProject() {
  const [currentProject] = useAtom(atomCurrentProject);
  if (!currentProject) {
    throw new Error("No current project found");
  }
  return currentProject;
}

/**
 *
 */
export function useCurrentProjectMemberships() {
  const activeProject = useCurrentProject();

  return useSWR<{ members: Membership[] }>(activeProject?.id ? `/projects/${activeProject.id}/members` : null);
}

/**
 *
 */
export function useCurrentProjectFeed() {
  const currentProject = useCurrentProject();
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
  >(`/projects/${currentProject.id}/feed`);
}

/**
 *
 */
export function useCurrentProjectIdentity() {
  const currentProject = useCurrentProject();
  return useSWR<{
    identity: ProjectIdentity;
    status: "Pending" | "Success" | "Failed" | "TemporaryFailure" | "NotStarted";
    dkimTokens?: string[];
    dkimEnabled?: boolean;
  }>(`/projects/${currentProject.id}/identity`);
}

export function useCurrentProjectKeys() {
  const currentProject = useCurrentProject();
  return useSWR<ProjectKeys>(`/projects/${currentProject.id}/keys`);
}
