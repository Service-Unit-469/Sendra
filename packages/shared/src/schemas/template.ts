import z from "zod";
import { email, ProjectEntitySchema, SEND_TYPES } from "./common";

export const TemplateSchema = ProjectEntitySchema.extend({
  subject: z.string().min(1, "Subject can't be empty").max(70, "Subject needs to be less than 70 characters long"),
  body: z.string().min(1, "Body can't be empty"),
  email: email.optional().or(z.literal("")),
  from: z.string().optional(),
  templateType: z.enum(SEND_TYPES).default(SEND_TYPES[0]),
  quickEmail: z.boolean().default(false),
});

export const TemplateSchemas = {
  create: TemplateSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    project: true,
  }),
  update: TemplateSchema.omit({
    createdAt: true,
    updatedAt: true,
    project: true,
  }),
};
