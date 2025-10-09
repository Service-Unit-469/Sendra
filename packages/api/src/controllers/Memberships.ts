import { createRoute, z } from "@hono/zod-openapi";
import { MembershipPersistence, ProjectPersistence, UserPersistence } from "@sendra/lib";
import { MembershipSchema, MembershipSchemas, ProjectSchema } from "@sendra/shared";
import type { AppType } from "../app";
import { Conflict, HttpException, NotAllowed, NotFound } from "../exceptions";
import { getProblemResponseSchema } from "../exceptions/responses";
import { isAuthenticatedProjectAdmin, isAuthenticatedProjectMember } from "../middleware/auth";

export const registerMembershipsRoutes = (app: AppType) => {
  app.openapi(
    createRoute({
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
      middleware: [isAuthenticatedProjectAdmin],
    }),
    async (c) => {
      const body = await c.req.json();
      const { projectId, email, role } = MembershipSchemas.invite.parse(body);

      const userPersistence = new UserPersistence();
      const invitedUser = await userPersistence.getByEmail(email);

      if (!invitedUser) {
        throw new HttpException(404, "We could not find that user, please ask them to sign up first.");
      }

      const membershipPersistence = new MembershipPersistence();
      const alreadyMember = await membershipPersistence.isMember(projectId, invitedUser.id);

      const memberships = await membershipPersistence.getProjectMemberships(projectId);
      if (alreadyMember) {
        return c.json({ success: true, memberships }, 200);
      }

      await membershipPersistence.invite(projectId, email, role);

      return c.json({ success: true, memberships }, 200);
    },
  );

  app.openapi(
    createRoute({
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
      middleware: [isAuthenticatedProjectAdmin],
    }),
    async (c) => {
      const body = await c.req.json();
      const { projectId, email } = MembershipSchemas.kick.parse(body);

      const userId = c.get("auth").sub;
      const userPersistence = new UserPersistence();
      const membershipPersistence = new MembershipPersistence();
      const kickedUser = await userPersistence.getByEmail(email);

      if (!kickedUser) {
        throw new NotFound("user");
      }

      const isMember = await membershipPersistence.isMember(projectId, kickedUser.id);

      if (!isMember) {
        throw new Conflict();
      }

      if (userId === kickedUser.id) {
        throw new NotAllowed();
      }

      await membershipPersistence.kick(projectId, kickedUser.id);

      const memberships = await membershipPersistence.getProjectMemberships(projectId);

      return c.json({ success: true, memberships }, 200);
    },
  );

  app.openapi(
    createRoute({
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
      middleware: [isAuthenticatedProjectMember],
    }),
    async (c) => {
      const body = await c.req.json();
      const { projectId } = z.object({ projectId: z.string() }).parse(body);

      const userId = c.get("auth").sub;

      const membershipPersistence = new MembershipPersistence();

      await membershipPersistence.kick(projectId, userId);

      const memberships = await membershipPersistence.getUserMemberships(userId);

      const projectPersistence = new ProjectPersistence();
      const projects = await projectPersistence.batchGet(memberships.map((membership) => membership.project));

      return c.json({ success: true, memberships: projects }, 200);
    },
  );
};
