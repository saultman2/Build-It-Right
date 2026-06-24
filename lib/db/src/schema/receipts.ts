import { pgTable, serial, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const receiptCategoryEnum = [
  "materials",
  "labor",
  "fuel",
  "permits",
  "equipment",
  "other",
] as const;

export const receiptsTable = pgTable("receipts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  jobId: integer("job_id"),
  vendor: text("vendor").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  date: text("date"),
  category: text("category").notNull().default("materials"),
  description: text("description"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReceiptSchema = createInsertSchema(receiptsTable).omit({
  id: true,
  companyId: true,
  createdAt: true,
});
export const updateReceiptSchema = insertReceiptSchema.partial();
export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type Receipt = typeof receiptsTable.$inferSelect;
