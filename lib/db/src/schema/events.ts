import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventTypeEnum = [
  "estimate_appointment",
  "job_start",
  "job_finish",
  "follow_up",
  "payment_reminder",
  "meeting",
  "other",
] as const;

export const calendarEventsTable = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  jobId: integer("job_id"),
  clientId: integer("client_id"),
  title: text("title").notNull(),
  type: text("type").notNull().default("other"),
  startDatetime: text("start_datetime").notNull(),
  endDatetime: text("end_datetime"),
  allDay: boolean("all_day").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCalendarEventSchema = createInsertSchema(calendarEventsTable).omit({
  id: true,
  companyId: true,
  createdAt: true,
});
export const updateCalendarEventSchema = insertCalendarEventSchema.partial();
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEventsTable.$inferSelect;
