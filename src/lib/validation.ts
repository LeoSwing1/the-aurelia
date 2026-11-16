import { z } from "zod";

export const reservationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().max(254),
  phone: z.string().trim().min(7).max(24),
  roomType: z.enum(["deluxe", "executive"]),
  checkIn: z.iso.date(),
  checkOut: z.iso.date(),
  adults: z.number().int().min(1).max(12),
  children: z.number().int().min(0).max(8).default(0),
  rooms: z.number().int().min(1).max(5).default(1),
  message: z.string().max(2000).optional().default(""),
  transactionalConsent: z.literal(true),
  emailMarketingConsent: z.boolean().default(false),
  whatsappMarketingConsent: z.boolean().default(false),
  smsMarketingConsent: z.boolean().default(false),
}).refine((v) => v.checkOut > v.checkIn, { path: ["checkOut"], message: "Departure must be after arrival." });

export const eventSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().max(254),
  phone: z.string().trim().min(7).max(24),
  eventType: z.enum(["Wedding", "Banquet", "Conference", "Social event", "Other"]),
  eventDate: z.iso.date(),
  guests: z.number().int().min(1).max(5000),
  venue: z.string().max(120).optional().default(""),
  message: z.string().max(3000).optional().default(""),
});
