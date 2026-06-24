import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, companiesTable } from "@workspace/db";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      companyId?: number;
    }
  }
}

async function getOrCreateCompany(ownerId: string): Promise<number> {
  const [existing] = await db
    .select({ id: companiesTable.id })
    .from(companiesTable)
    .where(eq(companiesTable.ownerId, ownerId));
  if (existing) return existing.id;

  const [created] = await db
    .insert(companiesTable)
    .values({ ownerId })
    .onConflictDoNothing({ target: companiesTable.ownerId })
    .returning({ id: companiesTable.id });
  if (created) return created.id;

  const [after] = await db
    .select({ id: companiesTable.id })
    .from(companiesTable)
    .where(eq(companiesTable.ownerId, ownerId));
  return after!.id;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    req.userId = userId;
    req.companyId = await getOrCreateCompany(userId);
    next();
  } catch (err) {
    req.log?.error({ err }, "failed to resolve company");
    res.status(500).json({ error: "Failed to resolve company" });
  }
}
