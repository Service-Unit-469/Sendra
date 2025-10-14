import { MembershipPersistence, ProjectPersistence } from "@sendra/lib";
import type { HonoRequest } from "hono";
import { createMiddleware } from "hono/factory";
import { HttpException } from "../exceptions";
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
  c.set("auth", AuthService.parseToken(c, "user"));
  await next();
});

export const isAuthenticatedProjectMemberKey = createMiddleware(async (c, next) => {
  const auth = AuthService.parseToken(c);
  const projectId = await getProjectId(c.req);
  if (auth.type === "secret" || auth.type === "public") {
    const projectPersistence = new ProjectPersistence();
    const project = await projectPersistence.get(projectId);
    if (!project) {
      throw new HttpException(404, "Project not found");
    }
    if (project.id !== auth.sub || (project.secret !== auth.kid && project.public !== auth.kid)) {
      throw new HttpException(403, "Project not found");
    }
    c.set("auth", auth);
  } else {
    const membershipPersistence = new MembershipPersistence();
    const isMember = await membershipPersistence.isMember(projectId, auth.sub);
    if (!isMember) {
      throw new HttpException(404, "Project not found");
    }
  }
  await next();
});

export const isAuthenticatedProjectMemberOrSecretKey = createMiddleware(async (c, next) => {
  const auth = AuthService.parseToken(c);
  if (auth.type !== "user" && auth.type !== "secret") {
    throw new HttpException(400, "Invalid authorization token for request");
  }
  const projectId = await getProjectId(c.req);
  if (auth.type === "secret") {
    const projectPersistence = new ProjectPersistence();
    const project = await projectPersistence.get(projectId);
    if (!project) {
      throw new HttpException(404, "Project not found");
    }
    if (project.id !== auth.sub || project.secret !== auth.kid) {
      throw new HttpException(403, "Project not found");
    }
    c.set("auth", auth);
  } else {
    const membershipPersistence = new MembershipPersistence();
    const isMember = await membershipPersistence.isMember(projectId, auth.sub);
    if (!isMember) {
      throw new HttpException(404, "Project not found");
    }
  }
  await next();
});

export const isAuthenticatedProjectMember = createMiddleware(async (c, next) => {
  const auth = AuthService.parseToken(c, "user");
  if (auth.type !== "user") {
    throw new HttpException(400, "Invalid authorization token for request");
  }

  const projectId = await getProjectId(c.req);
  const membershipPersistence = new MembershipPersistence();
  const isMember = await membershipPersistence.isMember(projectId, auth.sub);
  if (!isMember) {
    throw new HttpException(404, "Project not found");
  }
  c.set("auth", auth);
  await next();
});

export const isAuthenticatedProjectAdmin = createMiddleware(async (c, next) => {
  const auth = AuthService.parseToken(c, "user");
  if (auth.type !== "user") {
    throw new HttpException(400, "Invalid authorization token for request");
  }

  const projectId = await getProjectId(c.req);
  const membershipPersistence = new MembershipPersistence();
  const isAdmin = await membershipPersistence.isAdmin(projectId, auth.sub);
  const isMember = await membershipPersistence.isMember(projectId, auth.sub);
  if (!isAdmin && !isMember) {
    throw new HttpException(404, "Project not found");
  }
  if (!isAdmin) {
    throw new HttpException(403, "You do not have permission to perform this action");
  }
  c.set("auth", auth);
  await next();
});

export const isAuthenticatedSecretKey = createMiddleware(async (c, next) => {
  const auth = AuthService.parseToken(c, "secret");
  const projectId = await getProjectId(c.req);
  if (auth.sub !== projectId) {
    throw new HttpException(400, "Invalid authorization token for request");
  }
  c.set("auth", auth);
  await next();
});

export const isAuthenticatedPublicKey = createMiddleware(async (c, next) => {
  const auth = AuthService.parseToken(c, "public");
  const projectId = await getProjectId(c.req);
  if (auth.sub !== projectId) {
    throw new HttpException(400, "Invalid authorization token for request");
  }
  c.set("auth", auth);
  await next();
});
