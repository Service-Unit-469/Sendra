import z from "zod";
import { BaseSchema, email } from "./common";

export const password = z.string().min(6, "Password needs to be at least 6 characters long");

export const UserSchema = BaseSchema.extend({
  email,
  password: z.string().optional(),
});

export const UserSchemas = {
  credentials: UserSchema.pick({ email: true }).extend({ password }),
  get: UserSchema.omit({ password: true }),
  
};
