import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, companiesTable } from "@workspace/db";
import { UpdateCompanyBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { serializeCompany, toNumStr } from "../lib/serialize";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/company", async (req, res): Promise<void> => {
  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.id, req.companyId!));
  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  res.json(serializeCompany(company));
});

router.patch("/company", async (req, res): Promise<void> => {
  const parsed = UpdateCompanyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const [company] = await db
    .update(companiesTable)
    .set({
      ...d,
      defaultTaxRate: toNumStr(d.defaultTaxRate),
      defaultLaborRate: toNumStr(d.defaultLaborRate),
      defaultMarkupPct: toNumStr(d.defaultMarkupPct),
    })
    .where(eq(companiesTable.id, req.companyId!))
    .returning();
  res.json(serializeCompany(company));
});

export default router;
