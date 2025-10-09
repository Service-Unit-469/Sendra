import { ProjectPersistence } from "@sendra/lib";
import { NotAllowed } from "../../exceptions";

export const validateEmail = async (projectId: string, email?: string) => {
  const projectPersistence = new ProjectPersistence();
  const project = await projectPersistence.get(projectId);

  if (email && !project?.verified) {
    throw new NotAllowed("You need to attach a domain to your project to customize the sender address");
  }

  if (email && email.split("@")[1] !== project?.email?.split("@")[1]) {
    throw new NotAllowed("The sender address must be the same domain as the project's email address");
  }
};
