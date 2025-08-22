export type FaceCaptureStep =
  | 'queued'
  | 'scanning'
  | 'qa'
  | 'metahuman'
  | 'anim'
  | 'scene'
  | 'render'
  | 'upload'
  | 'done'
  | 'failed';

export interface FaceCaptureJobInput {
  userId: number;
  personId?: number;
  photos: string[];
  audioUrl: string;
  sceneId?: string;
  sceneConfig?: Record<string, unknown>;
  quality?: 'standard' | 'pro';
}

export interface JobArtifact {
  kind: 'mesh' | 'metahuman' | 'curves' | 'scene' | 'mp4' | 'thumb';
  uri: string;
  meta?: Record<string, unknown>;
}

export interface FaceCaptureJob {
  id: string;
  input: FaceCaptureJobInput;
  status: 'active' | 'completed' | 'failed' | 'pending';
  step: FaceCaptureStep;
  percent: number;
  artifacts: JobArtifact[];
  error?: string;
  createdAt: string;
  updatedAt: string;
}

const jobMap = new Map<string, FaceCaptureJob>();

export function createJob(input: FaceCaptureJobInput): FaceCaptureJob {
  const id = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const now = new Date().toISOString();
  const job: FaceCaptureJob = {
    id,
    input,
    status: 'pending',
    step: 'queued',
    percent: 0,
    artifacts: [],
    createdAt: now,
    updatedAt: now,
  };
  jobMap.set(id, job);
  return job;
}

export function getJob(jobId: string): FaceCaptureJob | undefined {
  return jobMap.get(jobId);
}

export function updateJob(jobId: string, update: Partial<FaceCaptureJob>) {
  const job = jobMap.get(jobId);
  if (!job) return;
  const next: FaceCaptureJob = {
    ...job,
    ...update,
    updatedAt: new Date().toISOString(),
  } as FaceCaptureJob;
  jobMap.set(jobId, next);
}

export function addArtifact(jobId: string, artifact: JobArtifact) {
  const job = jobMap.get(jobId);
  if (!job) return;
  job.artifacts.push(artifact);
  job.updatedAt = new Date().toISOString();
}


