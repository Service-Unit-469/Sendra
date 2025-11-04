import type { z } from "@hono/zod-openapi";
import type {
  ActionSchema,
  ActionSchemas,
  AssetSchema,
  AssetSchemas,
  BaseSchema,
  CampaignSchema,
  CampaignSchemas,
  ContactSchema,
  ContactSchemas,
  DeliveryEventSchema,
  EmailSchema,
  EventSchema,
  EventSchemas,
  GroupSchema,
  GroupSchemas,
  IdentitySchema,
  MembershipRoleSchema,
  MembershipSchema,
  MembershipSchemas,
  ProjectKeysSchema,
  ProjectSchema,
  ProjectSchemas,
  PublicProjectSchema,
  SEND_TYPES,
  SubscriberSchema,
  SubscriberUpdateSchema,
  TaskSchema,
  TemplateSchema,
  TemplateSchemas,
  UserSchema,
  UserSchemas,
} from "./schemas";

export type Action = z.infer<typeof ActionSchema>;
export type ActionCreate = z.infer<typeof ActionSchemas.create>;
export type ActionUpdate = z.infer<typeof ActionSchemas.update>;

export type Asset = z.infer<typeof AssetSchema>;
export type AssetCreate = z.infer<typeof AssetSchemas.create>;
export type AssetUpdate = z.infer<typeof AssetSchemas.update>;
export type AssetUploadUrl = z.infer<typeof AssetSchemas.uploadUrl>;

export type BaseType = z.infer<typeof BaseSchema>;

export type Contact = z.infer<typeof ContactSchema>;
export type ContactCreate = z.infer<typeof ContactSchemas.create>;
export type ContactUpdate = z.infer<typeof ContactSchemas.update>;
export type Campaign = z.infer<typeof CampaignSchema>;
export type CampaignCreate = z.infer<typeof CampaignSchemas.create>;
export type CampaignUpdate = z.infer<typeof CampaignSchemas.update>;

export type DeliveryEvent = z.infer<typeof DeliveryEventSchema>;
export type Email = z.infer<typeof EmailSchema>;
export type Event = z.infer<typeof EventSchema>;
export type EventTrack = z.infer<typeof EventSchemas.track>;

export type Group = z.infer<typeof GroupSchema>;
export type GroupCreate = z.infer<typeof GroupSchemas.create>;
export type GroupUpdate = z.infer<typeof GroupSchemas.update>;

export type Membership = z.infer<typeof MembershipSchema>;
export type MembershipRole = z.infer<typeof MembershipRoleSchema>;
export type MembershipInvite = z.infer<typeof MembershipSchemas.invite>;
export type MembershipKick = z.infer<typeof MembershipSchemas.kick>;

export type Project = z.infer<typeof ProjectSchema>;
export type ProjectCreate = z.infer<typeof ProjectSchemas.create>;
export type ProjectUpdate = z.infer<typeof ProjectSchemas.update>;
export type ProjectIdentity = z.infer<typeof IdentitySchema>;
export type ProjectKeys = z.infer<typeof ProjectKeysSchema>;
export type PublicProject = z.infer<typeof PublicProjectSchema>;
export type Task = z.infer<typeof TaskSchema>;

export type Template = z.infer<typeof TemplateSchema>;
export type TemplateCreate = z.infer<typeof TemplateSchemas.create>;
export type TemplateUpdate = z.infer<typeof TemplateSchemas.update>;

export type SendTypes = (typeof SEND_TYPES)[number];
export type Subscriber = z.infer<typeof SubscriberSchema>;
export type SubscriberUpdate = z.infer<typeof SubscriberUpdateSchema>;

export type User = z.infer<typeof UserSchema>;

export type UserCredentials = z.infer<typeof UserSchemas.credentials>;
export type UserVerify = z.infer<typeof UserSchemas.verify>;
export type UserReset = z.infer<typeof UserSchemas.reset>;
export type UserRequestReset = z.infer<typeof UserSchemas.requestReset>;
export type UserGet = z.infer<typeof UserSchemas.get>;

/**
 * Out-of-the-box event types that are automatically tracked by the system.
 * These events are always available and should not be added to project.eventTypes.
 */
export const OOTB_EVENTS = {
  SUBSCRIBE: "subscribe",
  UNSUBSCRIBE: "unsubscribe",
  EMAIL_DELIVERY: "email.delivery",
  EMAIL_BOUNCE: "email.bounce",
  EMAIL_COMPLAINT: "email.complaint",
  EMAIL_OPEN: "email.open",
  EMAIL_CLICK: "email.click",
  EMAIL_REJECT: "email.reject",
} as const;

export const OOTB_EVENT_VALUES: readonly string[] = Object.values(OOTB_EVENTS);
export type OOTBEvent = (typeof OOTB_EVENTS)[keyof typeof OOTB_EVENTS];
