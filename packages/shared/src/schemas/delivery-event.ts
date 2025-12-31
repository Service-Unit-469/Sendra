import { z } from "@hono/zod-openapi";

export const MailSchema = z.looseObject({
  timestamp: z.string(),
  messageId: z.string(),
  source: z.string(),
  sendingAccountId: z.string(),
  destination: z.array(z.string()),
});

export const DeliveryEventSchema = z.discriminatedUnion("eventType", [
  z.object({
    eventType: z.literal("Bounce"),
    mail: MailSchema,
    bounce: z.looseObject({}),
  }),
  z.object({
    eventType: z.literal("Click"),
    mail: MailSchema,
    click: z.looseObject({}),
  }),
  z.object({
    eventType: z.literal("Complaint"),
    mail: MailSchema,
    complaint: z.looseObject({}),
  }),
  z.object({
    eventType: z.literal("Delivery"),
    mail: MailSchema,
    delivery: z.looseObject({}),
  }),
  z.object({
    eventType: z.literal("Open"),
    mail: MailSchema,
    open: z.looseObject({}),
  }),
  z.object({
    eventType: z.literal("Reject"),
    mail: MailSchema,
    reject: z.looseObject({}),
  }),
  z.object({
    eventType: z.literal("Send"),
    mail: MailSchema,
    send: z.looseObject({}),
  }),
]);

export const DeliveryEventTypes = z.enum(["Bounce", "Click", "Complaint", "Delivery", "Open", "Reject", "Send"]);
