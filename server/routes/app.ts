import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { log } from '../vite';
import { storage } from '../storage';
import { insertPersonSchema, insertFaceImageSchema, insertVoiceProfileSchema } from '@shared/schema';

const router = Router();

// Voice agent base URL (FastAPI or CrewAI). Defaults to local dev port 8001
const VOICE_AGENT_URL = process.env.VOICE_AGENT_URL || 'http://127.0.0.1:8001';
const VOICE_AGENT_API_KEY = process.env.VOICE_AGENT_API_KEY || '';
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
  text: z.string().min(1),
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
    // Normalize job id field so clients can always read job_id
    const jobId = (data && (data.job_id || data.id || data.jobId || data.run_id || data.task_id)) || '';
    return res.json({ ...(typeof data === 'object' ? data : {}), job_id: jobId });
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
