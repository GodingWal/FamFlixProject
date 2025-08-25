import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { log } from '../vite';
import { storage } from '../storage';
import { insertPersonSchema, insertFaceImageSchema } from '@shared/schema';
import axios from 'axios';

const router = Router();

// Voice agent base URL (FastAPI). Defaults to local dev port 5050
const VOICE_AGENT_URL = process.env.VOICE_AGENT_URL || 'http://127.0.0.1:5050';
const DEFAULT_VOICE_ID = process.env.DEFAULT_VOICE_ID;

async function resolveDefaultVoiceId(): Promise<string | null> {
  try {
    if (DEFAULT_VOICE_ID && DEFAULT_VOICE_ID.trim().length > 0) {
      return DEFAULT_VOICE_ID.trim();
    }
    const url = `${VOICE_AGENT_URL}/api/voices`;
    const r = await axios.get(url, { timeout: 8000 });
    const voices = Array.isArray(r.data) ? r.data : [];
    if (voices.length > 0) {
      // Prefer a stable, kid-friendly voice if present; else first
      const preferred = voices.find((v: any) => /rachel|bella|ally|emma/i.test(String(v.name || '')));
      return String((preferred || voices[0]).id || (preferred || voices[0]).voice_id || '');
    }
    return null;
  } catch {
    return null;
  }
}

function setDbUnavailable(res: Response) {
  try { (res as any).statusMessage = 'Database not available'; } catch {}
}

// Helpers
const idParam = z.object({ id: z.string().regex(/^\d+$/).transform(v => parseInt(v, 10)) });
const userIdParam = z.object({ userId: z.string().regex(/^\d+$/).transform(v => parseInt(v, 10)) });
const personIdParam = z.object({ personId: z.string().regex(/^\d+$/).transform(v => parseInt(v, 10)) });

// People ---------------------------------------------------------------------
router.get('/users/:userId/people', async (req, res) => {
  try {
    const { userId } = userIdParam.parse(req.params);
    const rows = await storage.getPeopleByUserId(userId);
    return res.json(rows);
  } catch (error) {
    setDbUnavailable(res);
    return res.status(503).json({ message: 'Database not available' });
  }
});

router.get('/people/:personId', async (req, res) => {
  try {
    const { personId } = personIdParam.parse(req.params);
    const row = await storage.getPerson(personId);
    if (!row) return res.status(404).json({ message: 'Not found' });
    return res.json(row);
  } catch (error) {
    setDbUnavailable(res);
    return res.status(503).json({ message: 'Database not available' });
  }
});

router.post('/people', async (req, res) => {
  try {
    const data = insertPersonSchema.parse(req.body);
    const created = await storage.createPerson(data);
    return res.status(201).json(created);
  } catch (error) {
    log(`Create person error: ${(error as Error).message}`, 'routes');
    setDbUnavailable(res);
    return res.status(503).json({ message: 'Database not available' });
  }
});

router.patch('/people/:id', async (req, res) => {
  try {
    const { id } = idParam.parse(req.params);
    // Allow updating name, relationship, and ElevenLabs voice mapping for this person
    const body = z.object({
      name: z.string().min(1).optional(),
      relationship: z.string().min(1).optional(),
      elevenlabsVoiceId: z.string().min(1).optional(),
    }).parse(req.body);
    const updated = await storage.updatePerson(id, body);
    if (!updated) return res.status(404).json({ message: 'Not found' });
    return res.json(updated);
  } catch (error) {
    setDbUnavailable(res);
    return res.status(503).json({ message: 'Database not available' });
  }
});

router.delete('/people/:id', async (req, res) => {
  try {
    const { id } = idParam.parse(req.params);
    const ok = await storage.deletePerson(id);
    return res.json({ success: ok });
  } catch (error) {
    setDbUnavailable(res);
    return res.status(503).json({ message: 'Database not available' });
  }
});

// Face Images ----------------------------------------------------------------
router.get('/people/:personId/faceImages', async (req, res) => {
  try {
    const { personId } = personIdParam.parse(req.params);
    const rows = await storage.getFaceImagesByPersonId(personId);
    return res.json(rows);
  } catch (error) {
    setDbUnavailable(res);
    return res.status(503).json([]);
  }
});

router.get('/users/:userId/faceImages', async (req, res) => {
  try {
    const { userId } = userIdParam.parse(req.params);
    const rows = await storage.getFaceImagesByUserId(userId);
    return res.json(rows);
  } catch (error) {
    setDbUnavailable(res);
    return res.status(503).json([]);
  }
});

router.post('/faceImages', async (req, res) => {
  try {
    const data = insertFaceImageSchema.parse(req.body);
    const created = await storage.createFaceImage(data);
    return res.status(201).json(created);
  } catch (error) {
    log(`Create face image error: ${(error as Error).message}`, 'routes');
    setDbUnavailable(res);
    return res.status(503).json({ message: 'Database not available' });
  }
});

router.patch('/faceImages/:id/setDefault', async (req, res) => {
  try {
    const { id } = idParam.parse(req.params);
    const updated = await storage.setDefaultFaceImage(id);
    if (!updated) return res.status(404).json({ message: 'Not found' });
    return res.json(updated);
  } catch (error) {
    setDbUnavailable(res);
    return res.status(503).json({ message: 'Database not available' });
  }
});

router.delete('/faceImages/:id', async (req, res) => {
  try {
    const { id } = idParam.parse(req.params);
    const ok = await storage.deleteFaceImage(id);
    return res.json({ success: ok });
  } catch (error) {
    setDbUnavailable(res);
    return res.status(503).json({ message: 'Database not available' });
  }
});

// Voice Recordings ------------------------------------------------------------
const voiceRecordingBody = z.object({
  userId: z.number(),
  personId: z.number(),
  name: z.string().min(1),
  audioUrl: z.string().min(1).optional(),
  audioData: z.string().min(1).optional(),
  duration: z.number().optional(),
  isDefault: z.boolean().optional()
}).refine(v => !!(v.audioUrl || v.audioData), { message: 'audioUrl or audioData is required' });

router.get('/people/:personId/voiceRecordings', async (req, res) => {
  try {
    const { personId } = personIdParam.parse(req.params);
    const rows = await storage.getVoiceRecordingsByPersonId(personId);
    return res.json(rows);
  } catch (error) {
    setDbUnavailable(res);
    return res.status(503).json([]);
  }
});

router.get('/users/:userId/voiceRecordings', async (req, res) => {
  try {
    const { userId } = userIdParam.parse(req.params);
    const rows = await storage.getVoiceRecordingsByUserId(userId);
    return res.json(rows);
  } catch (error) {
    setDbUnavailable(res);
    return res.status(503).json([]);
  }
});

router.post('/voiceRecordings', async (req, res) => {
  try {
    const input = voiceRecordingBody.parse(req.body);
    const payload = {
      userId: input.userId,
      personId: input.personId,
      name: input.name,
      duration: input.duration ?? 0,
      isDefault: input.isDefault ?? false,
      audioUrl: input.audioUrl ?? input.audioData!,
      audioData: input.audioData
    } as any;
    const created = await storage.createVoiceRecording(payload);
    return res.status(201).json(created);
  } catch (error) {
    log(`Create voice recording error: ${(error as Error).message}`, 'routes');
    setDbUnavailable(res);
    return res.status(503).json({ message: 'Database not available' });
  }
});

router.patch('/voiceRecordings/:id/setDefault', async (req, res) => {
  try {
    const { id } = idParam.parse(req.params);
    const updated = await storage.setDefaultVoiceRecording(id);
    if (!updated) return res.status(404).json({ message: 'Not found' });
    return res.json(updated);
  } catch (error) {
    setDbUnavailable(res);
    return res.status(503).json({ message: 'Database not available' });
  }
});

router.delete('/voiceRecordings/:id', async (req, res) => {
  try {
    const { id } = idParam.parse(req.params);
    const ok = await storage.deleteVoiceRecording(id);
    return res.json({ success: ok });
  } catch (error) {
    setDbUnavailable(res);
    return res.status(503).json({ message: 'Database not available' });
  }
});

// Voice AI endpoints (stubs) --------------------------------------------------
const voicePreviewBody = z.object({
  // Prefer voiceId for direct ElevenLabs mapping; personId kept for future mapping
  voiceId: z.string().min(1).optional(),
  personId: z.number().optional(),
  text: z.string().min(1),
  mode: z.enum(['narration','dialogue']).optional(),
  quality: z.string().optional(),
});

// List available provider voices via FastAPI passthrough
router.get('/voice/voices', async (_req: Request, res: Response) => {
  try {
    const url = `${VOICE_AGENT_URL}/api/voices`;
    const r = await axios.get(url, { timeout: 8000 });
    return res.json(Array.isArray(r.data) ? r.data : []);
  } catch (err) {
    log(`Voice list proxy error: ${(err as Error).message}`, 'routes');
    return res.status(200).json([]); // keep UI resilient
  }
});

router.post('/voice/preview', async (req: Request, res: Response) => {
  try {
    const input = voicePreviewBody.parse(req.body);
    // Resolve a voiceId if not provided
    let voiceId = input.voiceId;
    if (!voiceId) {
      voiceId = await resolveDefaultVoiceId() || undefined;
    }
    if (!voiceId) {
      return res.status(503).json({ message: 'No voices available' });
    }
    // Proxy to FastAPI TTS if configured
    const url = `${VOICE_AGENT_URL}/api/tts`;
    try {
      const r = await axios.post(url, {
        voice_id: voiceId,
        text: input.text,
        mode: input.mode || 'narration',
      }, { timeout: 15000 });
      return res.json(r.data);
    } catch (err) {
      log(`TTS proxy error: ${(err as Error).message}`, 'routes');
      return res.status(503).json({ message: 'TTS service unavailable' });
    }
  } catch (error) {
    return res.status(400).json({ message: 'Invalid request' });
  }
});

const voiceCompareBody = z.object({
  personId: z.number(),
  userAudio: z.string().min(1),
  scriptText: z.string().min(1),
  duration: z.number().optional(),
});

router.post('/voice/compare', async (req: Request, res: Response) => {
  try {
    const input = voiceCompareBody.parse(req.body);
    const words = (input.scriptText || '').toLowerCase().split(/\W+/).filter(Boolean);
    const uniq = new Set(words);
    const similarity = Math.min(100, Math.round((uniq.size / Math.max(1, words.length)) * 100));
    return res.json({
      userAudioUrl: input.userAudio,
      aiAudioUrl: '',
      transcript: input.scriptText,
      similarity,
      duration: input.duration ?? 0,
    });
  } catch (error) {
    return res.status(400).json({ message: 'Invalid request' });
  }
});

const voiceCloneBody = z.object({
  text: z.string().min(1),
  personId: z.number().optional(),
  voiceRecordingId: z.number().optional(),
});

router.post('/voice/clone-speech', async (req: Request, res: Response) => {
  try {
    const input = voiceCloneBody.parse(req.body);
    // Map clone-speech to TTS using provided or default voiceId
    let voiceId = (req.body || {}).voiceId as string | undefined;
    if (!voiceId) {
      voiceId = await resolveDefaultVoiceId() || undefined;
    }
    if (!voiceId) {
      return res.status(503).json({ error: 'No voices available for synthesis' });
    }
    const url = `${VOICE_AGENT_URL}/api/tts`;
    try {
      const r = await axios.post(url, {
        voice_id: voiceId,
        text: input.text,
        mode: 'narration',
      }, { timeout: 20000 });
      return res.json(r.data);
    } catch (err) {
      log(`Clone proxy error: ${(err as Error).message}`, 'routes');
      return res.status(503).json({ error: 'Voice cloning service unavailable' });
    }
  } catch (error) {
    return res.status(400).json({ message: 'Invalid request' });
  }
});

router.post('/voice/combine-recordings', async (req: Request, res: Response) => {
  const personId = Number((req.body || {}).personId);
  return res.json({
    success: true,
    personId: Number.isFinite(personId) ? personId : null,
    message: 'Voice clone preparation started',
  });
});

// Proxy: start clone job (CrewAI orchestrator)
router.post('/voice/clone/start', async (req: Request, res: Response) => {
  try {
    const url = `${VOICE_AGENT_URL}/api/clone/start`;
    const r = await axios.post(url, req.body, { timeout: 20000 });
    return res.json(r.data);
  } catch (err) {
    log(`Clone start proxy error: ${(err as Error).message}`, 'routes');
    return res.status(503).json({ message: 'Clone service unavailable' });
  }
});

// Proxy: get job status
router.get('/voice/jobs/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const url = `${VOICE_AGENT_URL}/api/jobs/${encodeURIComponent(id)}`;
    const r = await axios.get(url, { timeout: 10000 });
    return res.json(r.data);
  } catch (err) {
    log(`Job status proxy error: ${(err as Error).message}`, 'routes');
    return res.status(503).json({ message: 'Job service unavailable' });
  }
});

// Video Templates -------------------------------------------------------------
router.get('/videoTemplates/:id', async (req, res) => {
  try {
    const { id } = idParam.parse(req.params);
    const tpl = await storage.getVideoTemplate(id);
    if (!tpl) return res.status(404).json({ message: 'Not found' });
    return res.json(tpl);
  } catch (error) {
    setDbUnavailable(res);
    return res.status(503).json({ message: 'Database not available' });
  }
});

// Processed Videos ------------------------------------------------------------
router.get('/users/:userId/processedVideos', async (req, res) => {
  try {
    const { userId } = userIdParam.parse(req.params);
    const rows = await storage.getProcessedVideosByUserId(userId);
    return res.json(rows);
  } catch (error) {
    setDbUnavailable(res);
    return res.status(503).json([]);
  }
});

const processedVideoBody = z.object({
  userId: z.number(),
  templateId: z.number(),
  faceImageId: z.number().optional().nullable(),
  voiceRecordingId: z.number().optional().nullable(),
  voiceOnly: z.boolean().optional(),
  status: z.enum(['pending','processing','completed','failed']).optional(),
  videoUrl: z.string().optional()
});

router.post('/processedVideos', async (req, res) => {
  try {
    const input = processedVideoBody.parse(req.body);
    const payload = {
      userId: input.userId,
      templateId: input.templateId,
      faceImageId: input.faceImageId ?? null,
      voiceRecordingId: input.voiceRecordingId ?? null,
      voiceOnly: input.voiceOnly ?? false,
      status: input.status ?? 'completed',
      outputUrl: input.videoUrl
    } as any;
    try {
      const created = await storage.createProcessedVideo(payload);
      return res.status(201).json(created);
    } catch (dbErr) {
      // Fallback stub in dev without DB
      setDbUnavailable(res);
      const stub = {
        id: Math.floor(Math.random() * 1000000) + 1,
        userId: payload.userId,
        templateId: payload.templateId,
        faceImageId: payload.faceImageId,
        voiceRecordingId: payload.voiceRecordingId,
        voiceOnly: payload.voiceOnly,
        status: payload.status,
        error: null,
        outputUrl: payload.outputUrl,
        createdAt: new Date()
      };
      return res.status(201).json(stub);
    }
  } catch (error) {
    log(`Create processed video error: ${(error as Error).message}`, 'routes');
    setDbUnavailable(res);
    return res.status(503).json({ message: 'Database not available' });
  }
});

router.delete('/processedVideos/:id', async (req, res) => {
  try {
    const { id } = idParam.parse(req.params);
    const ok = await storage.deleteProcessedVideo(id);
    return res.json({ success: ok });
  } catch (error) {
    setDbUnavailable(res);
    return res.status(503).json({ message: 'Database not available' });
  }
});

export default router;


