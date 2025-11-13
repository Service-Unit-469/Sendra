import { createRoute, z } from "@hono/zod-openapi";
import { ActionPersistence, ContactPersistence, EmailPersistence, EventPersistence } from "@sendra/lib";
import type { Action, Contact, Email, Event } from "@sendra/shared";
import dayjs from "dayjs";
import type { AppType } from "../../app";
import { getProblemResponseSchema } from "../../exceptions/responses";
import { BearerAuth, isAuthenticatedProjectMemberOrSecretKey } from "../../middleware/auth";

export const registerProjectInfoRoutes = (app: AppType) => {
  app.openapi(
    createRoute({
      tags: ["Project"],
      operationId: "get-project-analytics",
      method: "get",
      path: "/projects/{projectId}/analytics",
      request: {
        params: z.object({
          projectId: z.string(),
        }),
        query: z.object({
          period: z.enum(["week", "month", "year"]),
        }),
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: z.object({
                contacts: z.object({
                  timeseries: z.array(
                    z.object({
                      day: z.string(),
                      count: z.number(),
                    }),
                  ),
                  subscribed: z.number(),
                  unsubscribed: z.number(),
                }),
                emails: z.object({
                  total: z.number(),
                  opened: z.number(),
                  bounced: z.number(),
                  complaint: z.number(),
                  totalPrev: z.number(),
                  bouncedPrev: z.number(),
                  complaintPrev: z.number(),
                  openedPrev: z.number(),
                }),
                clicks: z.array(
                  z.object({
                    link: z.string(),
                    name: z.string(),
                    count: z.number(),
                  }),
                ),
              }),
            },
          },
          description: "Get project analytics",
        },
      },
      ...BearerAuth,
      middleware: [isAuthenticatedProjectMemberOrSecretKey],
    }),
    async (c) => {
      const projectId = c.req.param("projectId");
      const { period } = c.req.query() as { period: "week" | "month" | "year" };

      const periods = {
        week: 7,
        month: 30,
        year: 365,
      };

      const start = dayjs()
        .subtract(periods[period ?? "week"], "days")
        .toDate();

      // Get all contacts and emails for the project
      const [allContacts, allEmails, allEvents] = await Promise.all([
        new ContactPersistence(projectId).listAll({
          stop: (c) => dayjs(c.createdAt).isBefore(start),
        }),
        new EmailPersistence(projectId).listAll({
          stop: (e) => dayjs(e.createdAt).isBefore(start),
        }),
        new EventPersistence(projectId).listAll({
          stop: (e) => dayjs(e.createdAt).isBefore(start),
        }),
      ]);

      // Basic contact analytics
      const subscribed = allContacts.filter((c) => c.subscribed).length;
      const unsubscribed = allContacts.filter((c) => !c.subscribed).length;

      // Basic email analytics
      const total = allEmails.length;
      const opened = allEmails.filter((e) => e.status === "OPENED").length;
      const bounced = allEmails.filter((e) => e.status === "BOUNCED").length;
      const complaint = allEmails.filter((e) => e.status === "COMPLAINT").length;

      // Filter emails by date range for previous period comparison
      const emailsInRange = allEmails.filter((e) => {
        const emailDate = new Date(e.createdAt);
        return emailDate <= start;
      });

      const totalPrev = emailsInRange.length;
      const openedPrev = emailsInRange.filter((e) => e.status === "OPENED").length;
      const bouncedPrev = emailsInRange.filter((e) => e.status === "BOUNCED").length;
      const complaintPrev = emailsInRange.filter((e) => e.status === "COMPLAINT").length;

      // Simple timeseries data (simplified version)
      const timeseries = [];
      for (let i = 0; i < periods[period ?? "week"]; i++) {
        const date = dayjs().subtract(i, "days").format("YYYY-MM-DD");
        const dayContacts = allContacts.filter((c) => dayjs(c.createdAt).format("YYYY-MM-DD") === date).length;
        timeseries.push({ day: date, count: dayContacts });
      }

      const clicks: { link: string; name: string; count: number }[] = [];
      const clickMap: Record<string, Record<string, number>> = {};
      allEvents
        .filter((e) => e.eventType === "email.click")
        .map((e) => ({
          link: e.data?.details?.link || "",
          name: e.data?.mail?.commonHeaders?.subject || "",
        }))
        .filter((c) => c.link)
        .forEach((c) => {
          const name = c.name ?? "unknown";
          if (!clickMap[c.link]) {
            clickMap[c.link] = {};
          }
          clickMap[c.link][name] = (clickMap[c.link][name] || 0) + 1;
        });
      Object.entries(clickMap).forEach(([link, names]) => {
        Object.entries(names).forEach(([name, count]) => {
          clicks.push({ link, name, count });
        });
      });

      return c.json(
        {
          contacts: { timeseries, subscribed, unsubscribed },
          emails: {
            total,
            opened,
            bounced,
            complaint,
            totalPrev,
            bouncedPrev,
            complaintPrev,
            openedPrev,
          },
          clicks,
        },
        200,
      );
    },
  );

  app.openapi(
    createRoute({
      tags: ["Project"],
      operationId: "get-project-feed",
      method: "get",
      path: "/projects/{projectId}/feed",
      request: {
        params: z.object({
          projectId: z.string(),
        }),
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: z.array(
                z.union([
                  z.object({
                    type: z.string(),
                    id: z.string(),
                    createdAt: z.string(),
                    contact: z
                      .object({
                        id: z.string(),
                        email: z.string(),
                      })
                      .optional(),
                    event: z
                      .object({
                        name: z.string(),
                      })
                      .optional(),
                    action: z
                      .object({
                        name: z.string(),
                      })
                      .optional(),
                  }),
                  z.object({
                    id: z.string(),
                    createdAt: z.string(),
                    messageId: z.string(),
                    status: z.string(),
                    contact: z
                      .object({
                        id: z.string(),
                        email: z.string(),
                      })
                      .optional(),
                  }),
                ]),
              ),
            },
          },
          description: "Get project feed",
        },
        400: getProblemResponseSchema(400),
        401: getProblemResponseSchema(401),
        404: getProblemResponseSchema(404),
        403: getProblemResponseSchema(403),
      },
      ...BearerAuth,
      middleware: [isAuthenticatedProjectMemberOrSecretKey],
    }),
    async (c) => {
      const projectId = c.req.param("projectId");

      // Get all triggers and emails for the project
      const [events, emails] = await Promise.all([new EventPersistence(projectId).list({ limit: 10 }), new EmailPersistence(projectId).list({ limit: 10 })]);

      const contactsPersistence = new ContactPersistence(projectId);

      const actionsPersistence = new ActionPersistence(projectId);
      const actions: Record<string, Action> = {};
      const contacts: Record<string, Contact> = {};

      const getContact = async (id: string) => {
        if (contacts[id]) {
          return contacts[id];
        }
        const contact = await contactsPersistence.get(id);
        contacts[id] = contact as Contact;
        return contact;
      };

      const getAction = async (id: string | undefined) => {
        if (!id) {
          return undefined;
        }
        if (actions[id]) {
          return actions[id];
        }
        const action = await actionsPersistence.get(id);
        actions[id] = action as Action;
        return action;
      };

      // Get contact and event details for triggers
      const eventsWithDetails = await Promise.all(
        events.items.map(async (event: Event) => {
          const [contact, action] = await Promise.all([getContact(event.contact), getAction(event.relationType === "ACTION" ? event.relation : undefined)]);
          return {
            type: "trigger",
            id: event.id,
            createdAt: new Date(event.createdAt),
            contact: contact
              ? {
                  id: contact.id,
                  email: contact.email,
                }
              : undefined,
            event: {
              name: event.eventType,
            },
            action: action
              ? {
                  name: action.name,
                }
              : undefined,
          } as const;
        }),
      );

      // Get contact details for emails
      const emailsWithDetails = await Promise.all(
        emails.items.map(async (email: Email) => {
          const contact = await getContact(email.contact);
          return {
            type: "email",
            id: email.id,
            createdAt: new Date(email.createdAt),
            messageId: email.messageId,
            status: email.status,
            contact: contact
              ? {
                  id: contact.id,
                  email: contact.email,
                }
              : undefined,
          } as const;
        }),
      );

      // Combine and sort by createdAt
      const combined = [...eventsWithDetails, ...emailsWithDetails];
      combined.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return c.json(combined, 200);
    },
  );

  app.openapi(
    createRoute({
      tags: ["Project"],
      operationId: "get-project-usage",
      method: "get",
      path: "/projects/{projectId}/usage",
      request: {
        params: z.object({
          projectId: z.string(),
        }),
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: z.object({
                transactional: z.number(),
                automation: z.number(),
                campaign: z.number(),
              }),
            },
          },
          description: "Get project usage",
        },
        400: getProblemResponseSchema(400),
        401: getProblemResponseSchema(401),
        404: getProblemResponseSchema(404),
        403: getProblemResponseSchema(403),
      },
      ...BearerAuth,
      middleware: [isAuthenticatedProjectMemberOrSecretKey],
    }),
    async (c) => {
      const projectId = c.req.param("projectId");

      const startOfMonth = new Date(dayjs().startOf("month").toISOString());
      const endOfMonth = new Date(dayjs().endOf("month").toISOString());

      // Get all emails for the project
      const allEmails = await new EmailPersistence(projectId).listAll();

      // Filter emails by date range
      const monthlyEmails = allEmails.filter((email) => {
        const emailDate = new Date(email.createdAt);
        return emailDate >= startOfMonth && emailDate <= endOfMonth;
      });

      // Count different types of emails
      const transactional = monthlyEmails.filter((email: Email) => !email.source).length;
      const automation = monthlyEmails.filter((email: Email) => email.source && email.sourceType === "ACTION").length;
      const campaign = monthlyEmails.filter((email: Email) => email.source && email.sourceType === "CAMPAIGN").length;

      return c.json(
        {
          transactional,
          automation,
          campaign,
        },
        200,
      );
    },
  );
};
