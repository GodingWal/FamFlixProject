import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { log } from '../vite';
import { storage } from '../storage';
import { insertPersonSchema, insertFaceImageSchema, insertVoiceProfileSchema } from '@shared/schema';

const router = Router();

// Voice agent base URL (FastAPI or CrewAI). Defaults to local dev port 8001
const VOICE_AGENT_URL = process.env.VOICE_AGENT_URL || 'http://127.0.0.1:8001';
// Control whether to use local stub jobs regardless of agent availability
const USE_LOCAL_STUB_JOBS = String(process.env.VOICE_AGENT_STUB || '').toLowerCase() === 'true';
// Analyze recording (Agent 1)
const analyzeBody = z.object({ recordingId: z.number() });
router.post('/voice/analyze', async (req: Request, res: Response) => {
  try {
    const { recordingId } = analyzeBody.parse(req.body);
    const recording = await storage.getVoiceRecording(recordingId);
    if (!recording) return res.status(404).json({ message: 'Recording not found' });
    // Prefer audioUrl (may be encrypted data URI) else audioData
    let base64: string | null = null;
    try {
      const resp = await fetch(`${req.protocol}://${req.get('host')}/api/voiceRecordings/${recordingId}/audio`);
      if (resp.ok) {
        const data = await resp.json();
        const v = (data.audioData || data.audioUrl) as string | undefined;
        if (v && typeof v === 'string') {
          base64 = v.startsWith('data:') ? v.split(',').pop() || null : v;
        }
      }
    } catch {}
    // Call agent if available; otherwise return minimal faux analysis
    let analysis: any = null;
    if (base64 && !VOICE_AGENT_URL.startsWith('http://127.0.0.1')) {
      try {
        const a = await fetch(`${VOICE_AGENT_URL}/api/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': VOICE_AGENT_API_KEY,
            ...(CREWAI_API_KEY ? { Authorization: `Bearer ${CREWAI_API_KEY}` } : {}),
          },
          body: JSON.stringify({ audio_base64: base64 }),
        });
        if (a.ok) analysis = await a.json();
      } catch (e) {
        log(`Analyze proxy error: ${(e as Error).message}`, 'routes');
      }
    }
    if (!analysis) {
      analysis = { decision: 'ok', duration_s: recording.duration ?? null };
    }
    await storage.updateVoiceRecording(recordingId, { analysis } as any);
    return res.json({ analysis });
  } catch (err) {
    return res.status(400).json({ message: 'Invalid request' });
  }
});

// In-memory fake jobs for local fallback
const localJobs = new Map<string, any>();

function generateSineWaveWavBase64(
  durationSec: number = 1,
  freq: number = 440,
  sampleRate: number = 22050,
  amplitudeScale: number = 0.03
): string {
  const numSamples = Math.floor(durationSec * sampleRate);
  const headerSize = 44;
  const dataSize = numSamples * 2; // 16-bit mono
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);
  const writeString = (offset: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i)); };
  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true);  // audio format PCM
  view.setUint16(22, 1, true);  // mono
  view.setUint32(24, sampleRate, true); // sample rate
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const amplitude = Math.sin(2 * Math.PI * freq * t);
    const sample = Math.max(-1, Math.min(1, amplitude)) * amplitudeScale; // lower volume to avoid loud beep
    view.setInt16(offset, sample * 0x7FFF, true);
    offset += 2;
  }
  // to base64
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return Buffer.from(binary, 'binary').toString('base64');
}

const VOICE_AGENT_API_KEY = process.env.VOICE_AGENT_API_KEY || ((VOICE_AGENT_URL.includes('127.0.0.1') || VOICE_AGENT_URL.includes('localhost')) ? 'dev-local' : '');
const CREWAI_API_KEY = process.env.CREWAI_API_KEY || '';
const DEFAULT_VOICE_ID = process.env.DEFAULT_VOICE_ID;

async function resolveDefaultVoiceId(): Promise<string | null> {
  try {
    if (DEFAULT_VOICE_ID && DEFAULT_VOICE_ID.trim().length > 0) {
      return DEFAULT_VOICE_ID.trim();
    }
    const url = `${VOICE_AGENT_URL}/api/voices`;
    const response = await fetch(url, { headers: { 'X-API-Key': VOICE_AGENT_API_KEY } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const voices = Array.isArray(data) ? data : [];
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
router.get('/people', async (req, res) => {
  try {
    // Get all people (for voice selection dropdown)
    const rows = await storage.getAllPeople();
    return res.json(rows);
  } catch (error) {
    setDbUnavailable(res);
    return res.status(503).json({ message: 'Database not available' });
  }
});

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
    // Fire-and-forget: kick off clone preview generation via agent and persist result when done
    (async () => {
      try {
        const personId = Number(input.personId);
        if (!Number.isFinite(personId)) return;
        // Resolve voiceId preference
        let voiceId: string | null = null;
        try {
          const person = await storage.getPerson(personId);
          voiceId = (person && typeof person.elevenlabsVoiceId === 'string' && person.elevenlabsVoiceId.trim()) ? person.elevenlabsVoiceId.trim() : null;
        } catch {}
        if (!voiceId) {
          voiceId = await resolveDefaultVoiceId();
        }
        if (!voiceId) return;

        // Convert the saved audio (data URI or raw base64) into a Buffer for multipart upload
        const getAudioFromRecording = async (): Promise<{ buffer: Buffer; mime: string; filename: string } | null> => {
          try {
            const rec = await storage.getVoiceRecording(created.id);
            const v: string | undefined = (rec?.audioData || rec?.audioUrl) as any;
            if (!v) return null;
            let mime = 'audio/wav';
            let base64 = v;
            if (typeof v === 'string' && v.startsWith('data:')) {
              const m = v.match(/^data:([^;]+);base64,(.*)$/);
              if (m) {
                mime = m[1];
                base64 = m[2];
              }
            }
            const buffer = Buffer.from(base64, 'base64');
            const ext = mime.includes('mpeg') ? 'mp3' : mime.includes('wav') ? 'wav' : mime.includes('ogg') ? 'ogg' : 'audio';
            const filename = `recording_${created.id}.${ext}`;
            return { buffer, mime, filename };
          } catch {
            return null;
          }
        };

        const audio = await getAudioFromRecording();
        if (!audio) return;

        // Build multipart form-data request expected by the agent
        const { default: FormData } = await import('form-data');
        const form = new FormData();
        form.append('file', audio.buffer, { filename: audio.filename, contentType: audio.mime, knownLength: audio.buffer.length } as any);
        form.append('text', `This is a short preview generated for ${new Date().toISOString().slice(0,10)}.`);
        form.append('voice_id', voiceId);
        form.append('mode', 'narration');
        form.append('provider', 'elevenlabs');
        form.append('consent_flag', 'true');

        const startUrl = `${VOICE_AGENT_URL}/api/clone/start`;
        const startResp = await fetch(startUrl, {
          method: 'POST',
          headers: {
            'X-API-Key': VOICE_AGENT_API_KEY,
            ...(CREWAI_API_KEY ? { Authorization: `Bearer ${CREWAI_API_KEY}` } : {}),
            // Let FormData set the Content-Type with boundary
            ...form.getHeaders?.(),
          } as any,
          body: form as any,
        }).catch(() => null);
        if (!startResp || !startResp.ok) return;
        const startData: any = await startResp.json().catch(() => ({}));
        const jobId = (startData && (startData.jobId || startData.job_id || startData.id || startData.run_id || startData.task_id)) || null;
        if (!jobId) return;
        // Poll agent for completion, then persist to DB
        const jobUrl = `${VOICE_AGENT_URL}/api/jobs/${encodeURIComponent(String(jobId))}`;
        const deadline = Date.now() + 60_000;
        let delay = 800;
        while (Date.now() < deadline) {
          try {
            const r = await fetch(jobUrl, {
              headers: {
                'X-API-Key': VOICE_AGENT_API_KEY,
                ...(CREWAI_API_KEY ? { Authorization: `Bearer ${CREWAI_API_KEY}` } : {}),
              },
            });
            if (r.ok) {
              const data: any = await r.json().catch(() => ({}));
              const status = (data && (data.status || data.state)) as string | undefined;
              const result = (data && (data.result || data)) || {};
              if (status && /^(completed|done)$/i.test(status)) {
                const audioB64 = (result.audio_base64 || result.audioBase64) as string | undefined;
                const contentType = (result.mime || result.content_type || 'audio/mpeg') as string;
                if (audioB64) {
                  try {
                    const person = await storage.getPerson(personId);
                    if (person && typeof person.userId === 'number') {
                      const audioUrl = `data:${contentType};base64,${audioB64}`;
                      const now = new Date();
                      const name = `Cloned Story ${now.toISOString().slice(0, 10)} [job ${jobId}]`;
                      await storage.createVoiceRecording({
                        userId: person.userId,
                        personId,
                        name,
                        duration: 0,
                        isDefault: false,
                        audioUrl,
                      } as any);
                    }
                  } catch {}
                }
                break;
              }
              if (status && /^(failed|error)$/i.test(status)) {
                break;
              }
            }
          } catch {}
          await new Promise(r => setTimeout(r, delay));
          delay = Math.min(5000, Math.floor(delay * 1.5));
        }
      } catch {}
    })();
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

router.get('/voiceRecordings/:id/audio', async (req, res) => {
  try {
    const { id } = idParam.parse(req.params);
    const recording = await storage.getVoiceRecording(id);
    
    if (!recording) {
      return res.status(404).json({ message: 'Recording not found' });
    }
    
    // Return the decrypted audio data for playback
    return res.json({
      audioData: recording.audioData,
      audioUrl: recording.audioUrl,
      name: recording.name,
      duration: recording.duration
    });
  } catch (error) {
    log(`Get voice recording audio error: ${(error as Error).message}`, 'routes');
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

// Voice Profiles ---------------------------------------------------------------
const voiceProfileBody = insertVoiceProfileSchema.pick({
  userId: true,
  personId: true,
  name: true,
  elevenlabsVoiceId: true,
  status: true,
  sourceRecordingId: true,
});

// Get all voice profiles for a user
router.get('/users/:userId/voice-profiles', async (req, res) => {
  try {
    const { userId } = userIdParam.parse(req.params);
    const profiles = await storage.getVoiceProfilesByUserId(userId);
    return res.json(profiles);
  } catch (error) {
    setDbUnavailable(res);
    return res.status(503).json({ message: 'Database not available' });
  }
});

// Get all voice profiles for a person
router.get('/people/:personId/voice-profiles', async (req, res) => {
  try {
    const { personId } = personIdParam.parse(req.params);
    const profiles = await storage.getVoiceProfilesByPersonId(personId);
    return res.json(profiles);
  } catch (error) {
    setDbUnavailable(res);
    return res.status(503).json({ message: 'Database not available' });
  }
});


// Get a single voice profile
router.get('/voice-profiles/:id', async (req, res) => {
  try {
    const { id } = idParam.parse(req.params);
    const profile = await storage.getVoiceProfile(id);
    if (!profile) return res.status(404).json({ message: 'Not found' });
    return res.json(profile);
  } catch (error) {
    setDbUnavailable(res);
    return res.status(503).json({ message: 'Database not available' });
  }
});

// Create a new voice profile
router.post('/voice-profiles', async (req, res) => {
  try {
    const data = voiceProfileBody.parse(req.body);
    const created = await storage.createVoiceProfile(data);
    return res.status(201).json(created);
  } catch (error) {
    log(`Create voice profile error: ${(error as Error).message}`, 'routes');
    setDbUnavailable(res);
    return res.status(503).json({ message: 'Database not available' });
  }
});

// Update a voice profile
router.patch('/voice-profiles/:id', async (req, res) => {
  try {
    const { id } = idParam.parse(req.params);
    const data = voiceProfileBody.partial().parse(req.body);
    const updated = await storage.updateVoiceProfile(id, data);
    if (!updated) return res.status(404).json({ message: 'Not found' });
    return res.json(updated);
  } catch (error) {
    setDbUnavailable(res);
    return res.status(503).json({ message: 'Database not available' });
  }
});

// Delete a voice profile
router.delete('/voice-profiles/:id', async (req, res) => {
  try {
    const { id } = idParam.parse(req.params);
    const ok = await storage.deleteVoiceProfile(id);
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
  text: z.string().optional(),
  mode: z.enum(['narration','dialogue']).optional(),
  quality: z.string().optional(),
});

// List available provider voices via FastAPI passthrough
router.get('/voice/voices', async (_req: Request, res: Response) => {
  try {
    const url = `${VOICE_AGENT_URL}/api/voices`;
    const response = await fetch(url, { headers: { 'X-API-Key': VOICE_AGENT_API_KEY } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return res.json(Array.isArray(data) ? data : []);
  } catch (err) {
    log(`Voice list proxy error: ${(err as Error).message}`, 'routes');
    return res.status(200).json([]); // keep UI resilient
  }
});

router.post('/voice/preview', async (req: Request, res: Response) => {
  try {
    const parsed = voicePreviewBody.safeParse(req.body);
    if (!parsed.success) {
      // In dev or on validation issues, return a local tone so UI is resilient
      const b64 = generateSineWaveWavBase64(1.2, 440);
      return res.status(200).json({ audio_base64: b64, mime: 'audio/wav' });
    }
    const input = parsed.data;
    // Resolve a voiceId if not provided
    let voiceId = input.voiceId;
    if (!voiceId) {
      voiceId = await resolveDefaultVoiceId() || undefined;
    }
    // If no voiceId resolved, synthesize a short placeholder tone so UI is resilient
    if (!voiceId) {
      const b64 = generateSineWaveWavBase64(1.2, 440, 22050, 0.0);
      return res.json({ audio_base64: b64, mime: 'audio/wav' });
    }
    // Proxy to FastAPI TTS if configured
    const url = `${VOICE_AGENT_URL}/api/tts`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': VOICE_AGENT_API_KEY,
          ...(CREWAI_API_KEY ? { Authorization: `Bearer ${CREWAI_API_KEY}` } : {}),
        },
        body: JSON.stringify({
          voice_id: voiceId,
          text: input.text,
          mode: input.mode || 'narration',
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return res.json(data);
    } catch (err) {
      log(`TTS proxy error: ${(err as Error).message}`, 'routes');
      // Fallback to silence instead of tone
      const b64 = generateSineWaveWavBase64(1.2, 523.25, 22050, 0.0);
      return res.status(200).json({ audio_base64: b64, mime: 'audio/wav' });
    }
  } catch (error) {
    // Final safety fallback
    const b64 = generateSineWaveWavBase64(1.2, 440, 22050, 0.0);
    return res.status(200).json({ audio_base64: b64, mime: 'audio/wav' });
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
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': VOICE_AGENT_API_KEY
        },
        body: JSON.stringify({
          voice_id: voiceId,
          text: input.text,
          mode: 'narration',
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return res.json(data);
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
    // Optional local stub: synthesize a job id and create a result shortly
    if (USE_LOCAL_STUB_JOBS) {
      const jobId = `local-${Date.now()}`;
      const { text, personId } = (req.body || {}) as any;
      // prepare a result to be returned by /voice/jobs/:id
      const audio_base64 = generateSineWaveWavBase64(1.5, 392, 22050, 0.0);
      localJobs.set(jobId, {
        status: 'processing',
        created_at: new Date().toISOString(),
        personId: personId || null,
        pending: true,
        result: null,
      });
      setTimeout(() => {
        localJobs.set(jobId, {
          status: 'completed',
          result: { audio_base64, mime: 'audio/wav', qc: { decision: 'pass' } },
        });
      }, 1200);
      return res.json({ job_id: jobId, status: 'queued' });
    }
    const url = `${VOICE_AGENT_URL}/api/clone/start`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': VOICE_AGENT_API_KEY,
        ...(CREWAI_API_KEY ? { Authorization: `Bearer ${CREWAI_API_KEY}` } : {}),
      },
      body: JSON.stringify(req.body),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    const jobId = (data && (data.job_id || data.id || data.jobId || data.run_id || data.task_id)) || '';
    return res.json({ ...(typeof data === 'object' ? data : {}), job_id: jobId });
  } catch (err) {
    log(`Clone start proxy error: ${(err as Error).message}`, 'routes');
    return res.status(503).json({ message: 'Clone service unavailable' });
  }
});

// Proxy: get job status
// Track jobs we've already persisted during this process lifetime to avoid duplicates on polling
const persistedJobIds = new Set<string>();

router.get('/voice/jobs/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const personIdRaw = (req.query?.personId as string | undefined) || undefined;
    // Optional local stub: return local job state
    if (USE_LOCAL_STUB_JOBS && localJobs.has(id)) {
      const state = localJobs.get(id);
      if (state?.status === 'completed' && state?.result) {
        const data = {
          status: 'completed',
          result: state.result,
        };
        // persist as in normal path
        try {
          const audioB64 = state.result.audio_base64 as string | undefined;
          const contentType = (state.result.mime || 'audio/wav') as string;
          const personId = personIdRaw ? Number(personIdRaw) : (state.personId || undefined);
          if (audioB64 && personId) {
            const { storage } = await import('../storage');
            const person = await storage.getPerson(personId);
            if (person && typeof person.userId === 'number') {
              const audioUrl = `data:${contentType};base64,${audioB64}`;
              const created = await storage.createVoiceRecording({
                userId: person.userId,
                personId,
                name: `Cloned Story ${new Date().toISOString().slice(0,10)} [job ${id}]`,
                duration: 0,
                isDefault: false,
                audioUrl,
              } as any);
              (data as any).result.recording_id = created?.id ?? undefined;
            }
          }
        } catch {}
        return res.json(data);
      }
      return res.json({ status: 'processing' });
    }
    const url = `${VOICE_AGENT_URL}/api/jobs/${encodeURIComponent(id)}`;
    const response = await fetch(url, {
      headers: {
        'X-API-Key': VOICE_AGENT_API_KEY,
        ...(CREWAI_API_KEY ? { Authorization: `Bearer ${CREWAI_API_KEY}` } : {}),
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();

    // Persist completed audio result to the database if possible
    try {
      const status = (data && (data.status || data.state)) as string | undefined;
      const result = (data && (data.result || data)) || {};
      const audioB64 = (result.audio_base64 || result.audioBase64) as string | undefined;
      const contentType = (result.mime || result.content_type || 'audio/mpeg') as string;
      const personId = personIdRaw ? Number(personIdRaw) : undefined;
      if (status && /^(completed|done)$/i.test(status) && audioB64 && personId && !Number.isNaN(personId)) {
        if (!persistedJobIds.has(id)) {
          // Lazy import to avoid circular deps
          const { storage } = await import('../storage');
          // Load person to get userId
          const person = await storage.getPerson(personId);
          if (person && typeof person.userId === 'number') {
            const audioUrl = `data:${contentType};base64,${audioB64}`;
            const now = new Date();
            const name = `Cloned Story ${now.toISOString().slice(0, 10)} [job ${id}]`;
            try {
              const created = await storage.createVoiceRecording({
                userId: person.userId,
                personId,
                name,
                duration: 0,
                isDefault: false,
                audioUrl,
              } as any);
              (result as any).recording_id = created?.id ?? undefined;
              // Optionally run QC via agent here and persist
              try {
                const qcRes = await fetch(`${VOICE_AGENT_URL}/api/qc`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': VOICE_AGENT_API_KEY,
                    ...(CREWAI_API_KEY ? { Authorization: `Bearer ${CREWAI_API_KEY}` } : {}),
                  },
                  body: JSON.stringify({ audio_base64: audioB64 }),
                }).catch(() => null);
                if (qcRes && qcRes.ok) {
                  const qc = await qcRes.json();
                  const { storage } = await import('../storage');
                  await storage.updateVoiceRecording(created.id, { qc });
                  (result as any).qc = qc;
                }
              } catch {}
              persistedJobIds.add(id);
            } catch (persistErr) {
              // Log but do not fail the request
              log(`Persist clone audio failed for job ${id}: ${(persistErr as Error).message}`, 'routes');
            }
          }
        }
      }
    } catch (innerErr) {
      log(`Job persist handler error: ${(innerErr as Error).message}`, 'routes');
    }

    return res.json(data);
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

// Story generation endpoint - simplified approach
router.post('/ai/generate-story', async (req: Request, res: Response) => {
  try {
    const { theme, ageGroup, duration, characters, moralLesson, setting } = req.body;
    
    if (!theme || !ageGroup || !duration || !characters) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const story = {
      title: `The Adventure of ${characters[0] || 'Our Hero'}`,
      description: `A wonderful story about ${theme} for children aged ${ageGroup}.`,
      script: [
        {
          character: characters[0] || 'Narrator',
          dialogue: `Once upon a time, there was a story about ${theme}.`,
          emotion: 'cheerful',
          timing: 0
        },
        {
          character: characters[1] || 'Character',
          dialogue: `This is an exciting adventure that teaches us about ${moralLesson || 'friendship'}.`,
          emotion: 'excited',
          timing: 30
        },
        {
          character: characters[0] || 'Narrator',
          dialogue: 'And they all lived happily ever after, having learned something wonderful.',
          emotion: 'warm',
          timing: 60
        }
      ],
      duration: duration,
      category: 'adventure',
      ageRange: ageGroup
    };
    
    return res.json(story);
  } catch (error) {
    log(`Story generation error: ${(error as Error).message}`, 'routes');
    return res.status(500).json({ 
      message: 'Failed to generate story',
      error: (error as Error).message 
    });
  }
});

// AI Story Generation with Voice Agents Integration
router.post('/voice/generate-story', async (req, res) => {
  try {
    const { theme, ageGroup, duration, characters, moralLesson, setting, voiceId } = req.body;
    
    // Validate required fields
    if (!theme || !theme.trim()) {
      return res.status(400).json({ message: 'Story theme is required' });
    }

    // Try to use the voice agents crew system for enhanced story generation
    try {
      const crewResponse = await fetch(`${VOICE_AGENT_URL}/api/generate-story`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': VOICE_AGENT_API_KEY,
          ...(CREWAI_API_KEY && { 'Authorization': `Bearer ${CREWAI_API_KEY}` })
        },
        body: JSON.stringify({
          theme,
          age_group: ageGroup,
          duration,
          characters,
          moral_lesson: moralLesson,
          setting,
          voice_id: voiceId
        })
      });

      if (crewResponse.ok) {
        const aiStory = await crewResponse.json();
        log(`AI story generated successfully: ${aiStory.title}`, 'routes');
        return res.json(aiStory);
      }
      
      log(`Voice agent unavailable, using fallback generation`, 'routes');
    } catch (voiceAgentError) {
      log(`Voice agent error: ${(voiceAgentError as Error).message}`, 'routes');
    }

    // Enhanced fallback story generation
    const storyTemplates = {
      adventure: {
        titles: [
          `The ${theme.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Quest`,
          `Adventures in ${setting || 'the Magic Kingdom'}`,
          `${characters[0] || 'Our Hero'} and the ${theme}`
        ],
        openings: [
          `In the ${setting || 'enchanted kingdom'}, ${characters[0] || 'our brave hero'} discovered something magical about ${theme}.`,
          `Once upon a time, when ${characters[0] || 'a curious child'} was exploring ${setting || 'a mysterious place'}, they learned about ${theme}.`,
          `Long ago, in ${setting || 'a land far away'}, there lived ${characters[0] || 'a kind soul'} who would soon understand the true meaning of ${theme}.`
        ],
        developments: [
          `As ${characters[0] || 'our hero'} journeyed deeper into their adventure, they met ${characters[1] || 'a wise friend'} who taught them about ${moralLesson || 'courage'}.`,
          `But then, a challenge appeared that tested everything they knew about ${moralLesson || 'friendship'}.`,
          `${characters[1] || 'A helpful companion'} showed them that ${moralLesson || 'kindness'} was more powerful than any magic.`
        ],
        climaxes: [
          `When the biggest challenge came, ${characters[0] || 'our hero'} remembered the lesson about ${moralLesson || 'being brave'} and knew exactly what to do.`,
          `Through ${moralLesson || 'determination'} and working together, they overcame every obstacle.`,
          `With ${moralLesson || 'love'} in their heart, ${characters[0] || 'our hero'} found the strength to help everyone.`
        ],
        endings: [
          `And so, ${characters.join(' and ')} learned that ${moralLesson || 'friendship and kindness'} can overcome any challenge. The end.`,
          `From that day forward, they always remembered that ${moralLesson || 'being good to others'} makes the world a better place.`,
          `They returned home wiser and happier, knowing that ${moralLesson || 'love'} is the greatest adventure of all.`
        ]
      }
    };

    const template = storyTemplates.adventure;
    const randomChoice = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    
    const story = {
      title: randomChoice(template.titles),
      description: `An enchanting tale about ${theme} that teaches children about ${moralLesson || 'important values'} for ages ${ageGroup}.`,
      script: [
        {
          character: characters[0] || 'Narrator',
          dialogue: randomChoice(template.openings),
          emotion: 'cheerful',
          timing: 0,
          voiceId: voiceId || undefined
        },
        {
          character: characters[1] || 'Character',
          dialogue: randomChoice(template.developments),
          emotion: 'curious',
          timing: Math.floor(duration * 0.2)
        },
        {
          character: characters[0] || 'Narrator',
          dialogue: `${characters[0] || 'Our hero'} thought carefully about what to do. They remembered that ${moralLesson || 'being kind'} was always the right choice.`,
          emotion: 'thoughtful',
          timing: Math.floor(duration * 0.4)
        },
        {
          character: characters[1] || 'Character',
          dialogue: randomChoice(template.climaxes),
          emotion: 'excited',
          timing: Math.floor(duration * 0.6)
        },
        {
          character: characters[0] || 'Narrator',
          dialogue: randomChoice(template.endings),
          emotion: 'warm',
          timing: Math.floor(duration * 0.8)
        }
      ],
      duration: duration,
      category: 'adventure',
      ageRange: ageGroup
    };
    
    log(`Generated enhanced story: ${story.title}`, 'routes');
    return res.json(story);
    
  } catch (error) {
    log(`Story generation error: ${(error as Error).message}`, 'routes');
    return res.status(500).json({ 
      message: 'Failed to generate story',
      error: (error as Error).message 
    });
  }
});

export default router;
