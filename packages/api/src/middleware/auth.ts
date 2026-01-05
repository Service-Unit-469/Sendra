import { ProjectPersistence, rootLogger } from "@sendra/lib";
import type { Project } from "@sendra/shared";
import type { HonoRequest } from "hono";
import { createMiddleware } from "hono/factory";
import { LRUCache } from "lru-cache";
import { HttpException } from "../exceptions";
import { type Auth, AuthService } from "../services/AuthService";

const logger = rootLogger.child({ module: "auth" });

const projectCache = new LRUCache<string, Project>({
  max: 500,
  ttl: 1000 * 30, // 30 seconds
  fetchMethod: (projectId) => {
    const projectPersistence = new ProjectPersistence();
    return projectPersistence.get(projectId);
  },
});

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

async function getProject(projectId: string): Promise<Project> {
  const project = await projectCache.fetch(projectId);
  if (!project) {
    throw new HttpException(404, "Project not found");
  }
  return project;
}

function isProjectMember(auth: Auth, projectId: string, role?: "MEMBER" | "ADMIN"): boolean {
  return auth.scopes.some((scope) => scope.projectId === projectId && (role ? scope.type === role : true));
}

export const BearerAuth = {
  security: [
    {
      bearerAuth: [],
    },
  ],
};

export const isAuthenticatedUser = createMiddleware(async (c, next) => {
  c.set("auth", AuthService.parseToken(c, { type: "USER" }));
  await next();
});

export const isAuthenticatedProjectMemberOrKey = createMiddleware(async (c, next) => {
  const projectId = await getProjectId(c.req);
  const project = await getProject(projectId);

  const auth = AuthService.parseToken(c, { project });
  if (!isProjectMember(auth, projectId)) {
    throw new HttpException(404, "Project not found");
  }
  c.set("auth", auth);
  c.set("project", project);
  await next();
});

export const isAuthenticatedProjectMemberOrSecretKey = createMiddleware(async (c, next) => {
  const projectId = await getProjectId(c.req);
  const project = await getProject(projectId);
  const auth = AuthService.parseToken(c, { project });
  if (!["USER", "SECRET"].includes(auth.type)) {
    logger.warn({ auth }, "Invalid public authorization token for request");
    throw new HttpException(403, "Forbidden");
  }
  if (!isProjectMember(auth, projectId)) {
    logger.warn({ auth, projectId }, "Token is not a member of the project");
    throw new HttpException(404, "Project not found");
  }
  c.set("auth", auth);
  c.set("project", project);
  await next();
});

export const isAuthenticatedProjectMember = createMiddleware(async (c, next) => {
  const auth = AuthService.parseToken(c, { type: "USER" });

  const projectId = await getProjectId(c.req);
  // Check if project exists first
  await getProject(projectId);
  if (!isProjectMember(auth, projectId)) {
    logger.warn({ auth, projectId }, "User is not a member of the project");
    throw new HttpException(404, "Project not found");
  }
  c.set("auth", auth);
  await next();
});

export const isAuthenticatedProjectAdmin = createMiddleware(async (c, next) => {
  const auth = AuthService.parseToken(c, { type: "USER" });
  const projectId = await getProjectId(c.req);
  // Check if project exists first
  await getProject(projectId);
  // Check if user is a member first
  if (!isProjectMember(auth, projectId)) {
    logger.warn({ auth, projectId }, "User is not a member of the project");
    throw new HttpException(404, "Project not found");
  }
  // Then check if user is an admin
  if (!isProjectMember(auth, projectId, "ADMIN")) {
    logger.warn({ auth, projectId }, "User is not an admin of the project");
    throw new HttpException(403, "You do not have permission to perform this action");
  }
  c.set("auth", auth);
  await next();
});
