import { apiRequest } from '@/lib/queryClient';

export function normalizeJob(input: any): { jobId: string | null } {
  const jobId = input?.job_id ?? input?.id ?? input?.jobId ?? null;
  return { jobId: jobId != null ? String(jobId) : null };
}

export function normalizeAudio(input: any): string | null {
  return input?.audio_base64 ?? input?.audioBase64 ?? null;
}

async function safeJson(res: Response): Promise<any | null> {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export const VoiceAPI = {
  async getPerson(id: number): Promise<{ ok: boolean; data: any | null; status: number }> {
    const res = await apiRequest('GET', `/api/people/${id}`);
    const data = await safeJson(res);
    return { ok: res.ok, data, status: res.status };
  },
  async preview(args: any): Promise<{ ok: boolean; data: any | null; status: number }> {
    const res = await apiRequest('POST', '/api/voice/preview', args);
    const data = await safeJson(res);
    return { ok: res.ok, data, status: res.status };
  },
  async startQC(args: any): Promise<{ ok: boolean; data: any | null; status: number }> {
    // Use server app route that accepts JSON and posts multipart to agent
    const res = await apiRequest('POST', '/api/voice/clone/start', args);
    const data = await safeJson(res);
    return { ok: res.ok, data, status: res.status };
  },
  async job(id: string, params?: { personId?: number }): Promise<{ ok: boolean; data: any | null; status: number }> {
    const qs = params?.personId != null ? `?personId=${encodeURIComponent(String(params.personId))}` : '';
    // Use server app route that also persists completed results to DB
    const res = await apiRequest('GET', `/api/voice/jobs/${encodeURIComponent(id)}${qs}`);
    const data = await safeJson(res);
    return { ok: res.ok, data, status: res.status };
  },
};


