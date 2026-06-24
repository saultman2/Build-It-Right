import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  numeric,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const estimateStatusEnum = ["draft", "sent", "approved", "declined"] as const;
export const laborMethodEnum = ["flat", "hourly", "line_items"] as const;
export const estimateSectionEnum = ["material", "labor", "equipment", "other"] as const;

export const estimatesTable = pgTable("estimates", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  jobId: integer("job_id"),
  clientId: integer("client_id"),
  estimateNumber: text("estimate_number"),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"),
  estimateDate: text("estimate_date"),
  validUntil: text("valid_until"),
  scopeOfWork: text("scope_of_work"),
  // section toggles
  includeMaterials: boolean("include_materials").notNull().default(true),
  includeLabor: boolean("include_labor").notNull().default(false),
  includeEquipment: boolean("include_equipment").notNull().default(false),
  includePermits: boolean("include_permits").notNull().default(false),
  includeDisposal: boolean("include_disposal").notNull().default(false),
  includeDelivery: boolean("include_delivery").notNull().default(false),
  includeSubcontractor: boolean("include_subcontractor").notNull().default(false),
  includeOverhead: boolean("include_overhead").notNull().default(false),
  includeProfit: boolean("include_profit").notNull().default(false),
  includeTax: boolean("include_tax").notNull().default(false),
  includeDiscount: boolean("include_discount").notNull().default(false),
  includeDeposit: boolean("include_deposit").notNull().default(false),
  // labor config
  laborMethod: text("labor_method").notNull().default("hourly"),
  laborFlatCost: numeric("labor_flat_cost", { precision: 12, scale: 2 }).notNull().default("0"),
  // computed subtotals / charges
  materialSubtotal: numeric("material_subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  laborSubtotal: numeric("labor_subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  equipmentSubtotal: numeric("equipment_subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  permitsAmount: numeric("permits_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  disposalAmount: numeric("disposal_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  deliveryAmount: numeric("delivery_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  subcontractorAmount: numeric("subcontractor_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  overheadAmount: numeric("overhead_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  otherChargesSubtotal: numeric("other_charges_subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  markupPct: numeric("markup_pct", { precision: 5, scale: 2 }).notNull().default("0"),
  markupAmount: numeric("markup_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  depositRequired: numeric("deposit_required", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  terms: text("terms"),
  warrantyNote: text("warranty_note"),
  sentAt: timestamp("sent_at"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const estimateItemsTable = pgTable("estimate_items", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  estimateId: integer("estimate_id").notNull(),
  section: text("section").notNull().default("material"),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull().default("0"),
  unit: text("unit").notNull().default("ea"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
  hours: numeric("hours", { precision: 12, scale: 2 }).notNull().default("0"),
  hourlyRate: numeric("hourly_rate", { precision: 12, scale: 2 }).notNull().default("0"),
  lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull().default("0"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertEstimateSchema = createInsertSchema(estimatesTable).omit({
  id: true,
  companyId: true,
  createdAt: true,
  sentAt: true,
  approvedAt: true,
});
export const updateEstimateSchema = insertEstimateSchema.partial();
export const insertEstimateItemSchema = createInsertSchema(estimateItemsTable).omit({
  id: true,
  companyId: true,
  estimateId: true,
  lineTotal: true,
});
export const updateEstimateItemSchema = insertEstimateItemSchema.partial();
export type InsertEstimate = z.infer<typeof insertEstimateSchema>;
export type InsertEstimateItem = z.infer<typeof insertEstimateItemSchema>;
export type Estimate = typeof estimatesTable.$inferSelect;
export type EstimateItem = typeof estimateItemsTable.$inferSelect;
