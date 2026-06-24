import { pgTable, serial, text, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const companiesTable = pgTable("companies", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull().unique(),
  name: text("name"),
  logoUrl: text("logo_url"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  licenseNumber: text("license_number"),
  insuranceNote: text("insurance_note"),
  defaultTaxRate: numeric("default_tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  defaultLaborRate: numeric("default_labor_rate", { precision: 12, scale: 2 }).notNull().default("0"),
  defaultMarkupPct: numeric("default_markup_pct", { precision: 5, scale: 2 }).notNull().default("0"),
  defaultTerms: text("default_terms"),
  estimateFooter: text("estimate_footer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const updateCompanySchema = createInsertSchema(companiesTable)
  .omit({ id: true, ownerId: true, createdAt: true })
  .partial();
export type UpdateCompany = z.infer<typeof updateCompanySchema>;
export type Company = typeof companiesTable.$inferSelect;
