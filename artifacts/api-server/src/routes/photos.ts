import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, jobPhotosTable, jobsTable } from "@workspace/db";
import {
  ListJobPhotosParams,
  CreateJobPhotoParams,
  CreateJobPhotoBody,
  UpdateJobPhotoParams,
  UpdateJobPhotoBody,
  DeleteJobPhotoParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { serializeJobPhoto } from "../lib/serialize";

const router: IRouter = Router();

router.use(requireAuth);

async function ensureJob(companyId: number, jobId: number) {
  const [job] = await db
    .select({ id: jobsTable.id })
    .from(jobsTable)
    .where(and(eq(jobsTable.id, jobId), eq(jobsTable.companyId, companyId)));
  return !!job;
}

router.get("/jobs/:jobId/photos", async (req, res): Promise<void> => {
  const params = ListJobPhotosParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const photos = await db
    .select()
    .from(jobPhotosTable)
    .where(
      and(
        eq(jobPhotosTable.jobId, params.data.jobId),
        eq(jobPhotosTable.companyId, req.companyId!),
      ),
    )
    .orderBy(desc(jobPhotosTable.createdAt));
  res.json(photos.map(serializeJobPhoto));
});

router.post("/jobs/:jobId/photos", async (req, res): Promise<void> => {
  const params = CreateJobPhotoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateJobPhotoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!(await ensureJob(req.companyId!, params.data.jobId))) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  const [photo] = await db
    .insert(jobPhotosTable)
    .values({
      ...parsed.data,
      companyId: req.companyId!,
      jobId: params.data.jobId,
    })
    .returning();
  res.status(201).json(serializeJobPhoto(photo));
});

router.patch("/job-photos/:id", async (req, res): Promise<void> => {
  const params = UpdateJobPhotoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateJobPhotoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [photo] = await db
    .update(jobPhotosTable)
    .set(parsed.data)
    .where(
      and(
        eq(jobPhotosTable.id, params.data.id),
        eq(jobPhotosTable.companyId, req.companyId!),
      ),
    )
    .returning();
  if (!photo) {
    res.status(404).json({ error: "Photo not found" });
    return;
  }
  res.json(serializeJobPhoto(photo));
});

router.delete("/job-photos/:id", async (req, res): Promise<void> => {
  const params = DeleteJobPhotoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [photo] = await db
    .delete(jobPhotosTable)
    .where(
      and(
        eq(jobPhotosTable.id, params.data.id),
        eq(jobPhotosTable.companyId, req.companyId!),
      ),
    )
    .returning();
  if (!photo) {
    res.status(404).json({ error: "Photo not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
