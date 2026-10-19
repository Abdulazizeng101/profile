import { z } from "zod";

export const contactMessageSchema = z.object({
  name: z.string().trim().min(1, { message: "name_required" }).max(100, { message: "too_long" }),
  email: z
    .string()
    .trim()
    .max(200, { message: "too_long" })
    .pipe(z.email({ message: "email_invalid" })),
  company: z.string().trim().max(120, { message: "too_long" }).default(""),
  subject: z.string().trim().max(150, { message: "too_long" }).default(""),
  message: z.string().trim().min(10, { message: "message_short" }).max(5000, { message: "message_long" }),
  locale: z.enum(["en", "ar"]).default("en"),
});
export type ContactMessageInput = z.input<typeof contactMessageSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1).max(200),
  password: z.string().min(1).max(256),
});
