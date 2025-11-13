import { createRoute, z } from "@hono/zod-openapi";
import { MembershipPersistence, ProjectPersistence, rootLogger, UserPersistence } from "@sendra/lib";
import { MembershipSchema, MembershipSchemas, ProjectSchema } from "@sendra/shared";
import type { AppType } from "../app";
import { NotAllowed, NotFound } from "../exceptions";
import { getProblemResponseSchema } from "../exceptions/responses";
import { BearerAuth, isAuthenticatedProjectAdmin, isAuthenticatedProjectMember } from "../middleware/auth";
import { SystemEmailService } from "../services/SystemEmailService";

const logger = rootLogger.child({
  module: "Memberships",
});

export const registerMembershipsRoutes = (app: AppType) => {
  app.openapi(
    createRoute({
      operationId: "invite-member",
      method: "post",
      path: "/memberships/invite",
      request: {
        body: {
          content: {
            "application/json": {
              schema: MembershipSchemas.invite,
            },
          },
        },
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: z.object({
                success: z.boolean(),
                memberships: z.array(MembershipSchema),
              }),
            },
          },
          description: "Invite a member to a project",
        },
        400: getProblemResponseSchema(400),
        404: getProblemResponseSchema(404),
        409: getProblemResponseSchema(409),
      },
      ...BearerAuth,
      middleware: [isAuthenticatedProjectAdmin],
      hide: true,
    }),
    async (c) => {
      const body = await c.req.json();
      const { projectId, email, role } = MembershipSchemas.invite.parse(body);

      logger.info({ projectId, email, role }, "Inviting user to project");

      const userPersistence = new UserPersistence();
      const invitedUser = await userPersistence.getByEmail(email);

      const projectPersistence = new ProjectPersistence();
      const project = await projectPersistence.get(projectId);
      if (!project) {
        logger.warn({ projectId }, "Project not found");
        throw new NotFound("project");
      }

      const membershipPersistence = new MembershipPersistence();
      const alreadyMember = invitedUser ? await membershipPersistence.isMember(projectId, invitedUser.id) : false;
      const memberships = await membershipPersistence.getProjectMemberships(projectId);
      if (alreadyMember) {
        logger.warn({ projectId, email, role }, "User already a member of project");
        return c.json({ success: true, memberships }, 200);
      }

      await membershipPersistence.create({
        email,
        user: invitedUser?.id ?? "NEW_USER",
        project: projectId,
        role,
      });

      if (!invitedUser) {
        logger.info({ email, projectId }, "Sending invitation email to new user");
        await SystemEmailService.sendInvitationEmail(email, project.name);
      }

      logger.info({ projectId, email, role }, "User invited to project");

      return c.json({ success: true, memberships }, 200);
    },
  );

  app.openapi(
    createRoute({
      operationId: "kick-member",
      method: "post",
      path: "/memberships/kick",
      request: {
        body: {
          content: {
            "application/json": {
              schema: MembershipSchemas.kick,
            },
          },
          description: "Kick a member from a project",
        },
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: z.object({
                success: z.boolean(),
                memberships: z.array(MembershipSchema),
              }),
            },
          },
          description: "Kick a member from a project",
        },
        400: getProblemResponseSchema(400),
        404: getProblemResponseSchema(404),
        409: getProblemResponseSchema(409),
      },
      ...BearerAuth,
      middleware: [isAuthenticatedProjectAdmin],
      hide: true,
    }),
    async (c) => {
      const body = await c.req.json();
      const { projectId, email } = MembershipSchemas.kick.parse(body);

      const userId = c.get("auth").sub;
      logger.info({ projectId, email }, "Kicking user from project");

      const membershipPersistence = new MembershipPersistence();

      const memberships = await membershipPersistence.getProjectMemberships(projectId);

      const kickedUser = await new UserPersistence().getByEmail(email);

      if (userId === kickedUser?.id) {
        logger.warn({ projectId, email }, "User cannot kick themselves");
        throw new NotAllowed("You cannot kick yourself");
      }

      await Promise.all(memberships.filter((membership) => membership.email === email).map((membership) => membershipPersistence.delete(membership.id)));
      logger.info({ projectId, email }, "Kicked user from project");

      return c.json(
        {
          success: true,
          memberships: memberships.filter((membership) => membership.email !== email),
        },
        200,
      );
    },
  );

  app.openapi(
    createRoute({
      operationId: "leave-project",
      method: "post",
      path: "/memberships/leave",
      request: {
        body: {
          content: {
            "application/json": {
              schema: z.object({
                projectId: z.string(),
              }),
            },
          },
        },
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: z.object({
                success: z.boolean(),
                memberships: z.array(ProjectSchema),
              }),
            },
          },
          description: "Leave a project",
        },
      },
      ...BearerAuth,
      middleware: [isAuthenticatedProjectMember],
      hide: true,
    }),
    async (c) => {
      const body = await c.req.json();
      const { projectId } = z.object({ projectId: z.string() }).parse(body);

      const userId = c.get("auth").sub;
      logger.info({ projectId, userId }, "Leaving project");

      const membershipPersistence = new MembershipPersistence();
      const memberships = await membershipPersistence.getUserMemberships(userId);

      await Promise.all(memberships.filter((membership) => membership.project === projectId).map((membership) => membershipPersistence.delete(membership.id)));

      const projectPersistence = new ProjectPersistence();
      const projects = await projectPersistence.batchGet(memberships.filter((membership) => membership.project === projectId).map((membership) => membership.project));

      logger.info({ projectId, userId, projects: projects.length }, "Left project");

      return c.json({ success: true, memberships: projects }, 200);
    },
  );
};
