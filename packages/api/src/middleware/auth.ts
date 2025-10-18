import { MembershipPersistence, ProjectPersistence } from "@sendra/lib";
import type { HonoRequest } from "hono";
import { createMiddleware } from "hono/factory";
import { HttpException } from "../exceptions";
import { logger } from "../log";
import { AuthService } from "../services/AuthService";

async function getProjectId(request: HonoRequest): Promise<string> {
  let projectId = request.param("projectId") || request.query("projectId");

  if (!projectId) {
    const body = await request.json();
    projectId = body.projectId as string | undefined;
  }

  if (!projectId) {
    throw new HttpException(400, "Project ID is required");
  }

  return projectId;
}

export const BearerAuth = {
  security: [
    {
      bearerAuth: [],
    },
  ],
};

export const isAuthenticatedUser = createMiddleware(async (c, next) => {
  c.set("auth", AuthService.parseToken(c, { type: "user" }));
  await next();
});

export const isAuthenticatedProjectMemberKey = createMiddleware(async (c, next) => {
  const projectId = await getProjectId(c.req);
  const projectPersistence = new ProjectPersistence();
  const project = await projectPersistence.get(projectId);
  if (!project) {
    throw new HttpException(404, "Project not found");
  }

  const auth = AuthService.parseToken(c, { project });
  if (auth.type === "secret" || auth.type === "public") {
    if (project.id !== auth.sub || (project.secret !== auth.kid && project.public !== auth.kid)) {
      throw new HttpException(403, "Project not found");
    }
  } else {
    const membershipPersistence = new MembershipPersistence();
    const isMember = await membershipPersistence.isMember(projectId, auth.sub);
    if (!isMember) {
      throw new HttpException(404, "Project not found");
    }
  }
  c.set("auth", auth);
  c.set("project", project);
  await next();
});

export const isAuthenticatedProjectMemberOrSecretKey = createMiddleware(async (c, next) => {
  const projectId = await getProjectId(c.req);
  const projectPersistence = new ProjectPersistence();
  const project = await projectPersistence.get(projectId);
  if (!project) {
    throw new HttpException(404, "Project not found");
  }

  const auth = AuthService.parseToken(c, { project });
  if (auth.type !== "user" && auth.type !== "secret") {
    logger.warn({ auth }, "Invalid public authorization token for request");
    throw new HttpException(400, "Invalid authorization token for request");
  }
  if (auth.type === "user") {
    const membershipPersistence = new MembershipPersistence();
    const isMember = await membershipPersistence.isMember(projectId, auth.sub);
    if (!isMember) {
      logger.warn({ auth, projectId }, "User is not a member of the project");
      throw new HttpException(404, "Project not found");
    }
  }
  c.set("auth", auth);
  c.set("project", project);
  await next();
});

export const isAuthenticatedProjectMember = createMiddleware(async (c, next) => {
  const auth = AuthService.parseToken(c, { type: "user" });
  if (auth.type !== "user") {
    logger.warn({ auth }, "Invalid non-user authorization token for request");
    throw new HttpException(400, "Invalid authorization token for request");
  }

  const projectId = await getProjectId(c.req);
  const membershipPersistence = new MembershipPersistence();
  const isMember = await membershipPersistence.isMember(projectId, auth.sub);
  if (!isMember) {
    logger.warn({ auth, projectId }, "User is not a member of the project");
    throw new HttpException(404, "Project not found");
  }
  c.set("auth", auth);
  await next();
});

export const isAuthenticatedProjectAdmin = createMiddleware(async (c, next) => {
  const auth = AuthService.parseToken(c, { type: "user" });
  if (auth.type !== "user") {
    logger.warn({ auth }, "Invalid non-user authorization token for request");
    throw new HttpException(400, "Invalid authorization token for request");
  }

  const projectId = await getProjectId(c.req);
  const membershipPersistence = new MembershipPersistence();
  const isAdmin = await membershipPersistence.isAdmin(projectId, auth.sub);
  const isMember = await membershipPersistence.isMember(projectId, auth.sub);
  if (!isAdmin && !isMember) {
    logger.warn({ auth, projectId }, "User is not a member of the project");
    throw new HttpException(404, "Project not found");
  }
  if (!isAdmin) {
    logger.warn({ auth, projectId }, "User is not an admin of the project");
    throw new HttpException(403, "You do not have permission to perform this action");
  }
  c.set("auth", auth);
  await next();
});
