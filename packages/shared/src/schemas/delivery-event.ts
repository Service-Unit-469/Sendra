import { z } from "zod";

export const MailSchema = z.object({
  timestamp: z.string(),
  messageId: z.string(),
  source: z.string(),
  sourceArn: z.string(),
  sendingAccountId: z.string(),
  destination: z.array(z.string()),
  headersTruncated: z.boolean(),
  headers: z.array(z.object({ name: z.string(), value: z.string() })),
  commonHeaders: z.record(z.string(), z.array(z.string())),
  tags: z.record(z.string(), z.array(z.string())),
});

export const RecipientSchema = z.object({
  emailAddress: z.string(),
  status: z.string(),
  action: z.string(),
  diagnosticCode: z.string(),
});

export const DeliveryEventSchema = z.discriminatedUnion("eventType", [
  z.object({
    eventType: z.literal("Bounce"),
    mail: MailSchema,
    bounce: z.object({
      bounceType: z.string(),
      bounceSubType: z.string(),
      recipients: z.array(RecipientSchema),
    }),
    timestamp: z.string(),
    feedbackId: z.string(),
    reportingMTA: z.string(),
  }),
  z.object({
    eventType: z.literal("Click"),
    mail: MailSchema,
    click: z.object({
      ipAddress: z.string(),
      timestamp: z.string(),
      userAgent: z.string(),
      link: z.string(),
      tags: z.record(z.string(), z.array(z.string())),
    }),
  }),
  z.object({
    eventType: z.literal("Complaint"),
    mail: MailSchema,
    complaint: z.object({
      complainedRecipients: z.array(RecipientSchema),
      timestamp: z.string(),
      feedbackId: z.string(),
      userAgent: z.string(),
      complaintFeedbackType: z.string(),
      arrivalDate: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal("Delivery"),
    mail: MailSchema,
    delivery: z.object({
      timestamp: z.string(),
      processingTimeMillis: z.number(),
      recipients: z.array(z.string()),
      smtpResponse: z.string(),
      remoteMtaIp: z.string(),
      reportingMTA: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal("Open"),
    mail: MailSchema,
    open: z.object({
      ipAddress: z.string(),
      timestamp: z.string(),
      userAgent: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal("Reject"),
    mail: MailSchema,
    reject: z.object({
      reason: z.string(),
    }),
  }),
  z.object({
    eventType: z.literal("Send"),
    mail: MailSchema,
    send: z.object({}),
  }),
]);

export const DeliveryEventTypes = z.enum(["Bounce", "Click", "Complaint", "Delivery", "Open", "Reject", "Send"]);
