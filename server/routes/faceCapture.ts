import { Router } from 'express';
import { z } from 'zod';
import { createJob, getJob, updateJob, addArtifact } from '../services/jobs';
import { log } from '../vite';

const router = Router();

const jobInputSchema = z.object({
  userId: z.number().int().positive(),
  personId: z.number().int().positive().optional(),
  photos: z.array(z.string().url()).min(3),
  audioUrl: z.string().min(1),
  sceneId: z.string().optional(),
  sceneConfig: z.record(z.any()).optional(),
  quality: z.enum(['standard','pro']).optional()
});

router.post('/face-capture/jobs', (req, res) => {
  try {
    const input = jobInputSchema.parse(req.body);
    const job = createJob(input);
    // Kick off async stub pipeline
    setImmediate(() => runStubPipeline(job.id));
    return res.status(202).json({ jobId: job.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.issues });
    }
    return res.status(500).json({ message: 'Failed to create job' });
  }
});

router.get('/face-capture/jobs/:jobId', (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({ message: 'Job not found' });
  return res.json(job);
});

async function runStubPipeline(jobId: string) {
  const advance = async (step: any, percent: number, delayMs: number) => {
    updateJob(jobId, { status: 'active', step, percent });
    await new Promise(r => setTimeout(r, delayMs));
  };
  try {
    await advance('scanning', 10, 500);
    addArtifact(jobId, { kind: 'mesh', uri: `r2://jobs/${jobId}/mesh.glb` });
    await advance('qa', 25, 300);
    await advance('metahuman', 45, 700);
    addArtifact(jobId, { kind: 'metahuman', uri: `r2://jobs/${jobId}/metahuman.pack` });
    await advance('anim', 60, 500);
    addArtifact(jobId, { kind: 'curves', uri: `r2://jobs/${jobId}/facial.curves` });
    await advance('scene', 75, 500);
    await advance('render', 90, 1000);
    addArtifact(jobId, { kind: 'mp4', uri: `r2://jobs/${jobId}/final.mp4` });
    await advance('upload', 95, 300);
    updateJob(jobId, { status: 'completed', step: 'done', percent: 100 });
  } catch (err) {
    log(`Face-capture job ${jobId} failed: ${(err as Error).message}`, 'routes');
    updateJob(jobId, { status: 'failed', step: 'failed', error: (err as Error).message });
  }
}

export default router;


