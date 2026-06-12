import { z } from "zod";

export const SubscriberSchema = z.object({
  email: z.string(),
  subscriptions: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      subscribed: z.boolean(),
    }),
  ),
});

export const SubscriberUpdateSchema = z.object({
  email: z.string(),
  subscriptions: z.array(
    z.object({
      id: z.string(),
      subscribed: z.boolean(),
    }),
  ),
});
