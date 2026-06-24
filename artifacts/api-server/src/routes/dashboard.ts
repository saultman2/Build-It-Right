import { Router, type IRouter } from "express";
import { eq, and, inArray, desc, asc, gte, count, sum } from "drizzle-orm";
import {
  db,
  jobsTable,
  clientsTable,
  estimatesTable,
  invoicesTable,
  calendarEventsTable,
} from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { serializeJob, serializeEvent, n } from "../lib/serialize";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const companyId = req.companyId!;
  const companyCond = eq(jobsTable.companyId, companyId);

  const [
    activeJobsRows,
    inProgressRows,
    finishedRows,
    paidJobsRows,
    draftedRows,
    sentRows,
    clientsRows,
    unpaidRows,
    paidInvoiceRows,
    recentJobRows,
    upcomingEventRows,
  ] = await Promise.all([
    db
      .select({ c: count() })
      .from(jobsTable)
      .where(
        and(
          companyCond,
          inArray(jobsTable.status, [
            "new",
            "material_list",
            "estimate",
            "estimate_sent",
            "approved",
            "in_progress",
          ]),
        ),
      ),
    db
      .select({ c: count() })
      .from(jobsTable)
      .where(and(companyCond, eq(jobsTable.status, "in_progress"))),
    db
      .select({ c: count() })
      .from(jobsTable)
      .where(and(companyCond, eq(jobsTable.status, "finished"))),
    db
      .select({ c: count() })
      .from(jobsTable)
      .where(and(companyCond, eq(jobsTable.status, "paid"))),
    db
      .select({ c: count() })
      .from(estimatesTable)
      .where(
        and(
          eq(estimatesTable.companyId, companyId),
          eq(estimatesTable.status, "draft"),
        ),
      ),
    db
      .select({ c: count() })
      .from(estimatesTable)
      .where(
        and(
          eq(estimatesTable.companyId, companyId),
          eq(estimatesTable.status, "sent"),
        ),
      ),
    db
      .select({ c: count() })
      .from(clientsTable)
      .where(eq(clientsTable.companyId, companyId)),
    db
      .select({ c: count(), total: sum(invoicesTable.balanceDue) })
      .from(invoicesTable)
      .where(
        and(
          eq(invoicesTable.companyId, companyId),
          inArray(invoicesTable.status, ["unpaid", "partial", "overdue"]),
        ),
      ),
    db
      .select({ total: sum(invoicesTable.amountPaid) })
      .from(invoicesTable)
      .where(eq(invoicesTable.companyId, companyId)),
    db
      .select({ job: jobsTable, clientName: clientsTable.name })
      .from(jobsTable)
      .leftJoin(clientsTable, eq(jobsTable.clientId, clientsTable.id))
      .where(companyCond)
      .orderBy(desc(jobsTable.createdAt))
      .limit(5),
    db
      .select({
        event: calendarEventsTable,
        jobTitle: jobsTable.title,
        clientName: clientsTable.name,
      })
      .from(calendarEventsTable)
      .leftJoin(jobsTable, eq(calendarEventsTable.jobId, jobsTable.id))
      .leftJoin(clientsTable, eq(calendarEventsTable.clientId, clientsTable.id))
      .where(
        and(
          eq(calendarEventsTable.companyId, companyId),
          gte(calendarEventsTable.startDatetime, new Date().toISOString().slice(0, 10)),
        ),
      )
      .orderBy(asc(calendarEventsTable.startDatetime))
      .limit(5),
  ]);

  res.json({
    activeJobs: activeJobsRows[0].c,
    jobsInProgress: inProgressRows[0].c,
    jobsFinished: finishedRows[0].c,
    estimatesDrafted: draftedRows[0].c,
    estimatesSent: sentRows[0].c,
    totalClients: clientsRows[0].c,
    unpaidInvoices: unpaidRows[0].c,
    paidJobs: paidJobsRows[0].c,
    totalUnpaidAmount: n(unpaidRows[0].total),
    totalPaidAmount: n(paidInvoiceRows[0].total),
    recentJobs: recentJobRows.map((r) => serializeJob(r.job, r.clientName)),
    upcomingEvents: upcomingEventRows.map((r) =>
      serializeEvent(r.event, {
        jobTitle: r.jobTitle,
        clientName: r.clientName,
      }),
    ),
  });
});

export default router;
