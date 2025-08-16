import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { log } from '../vite';
import { storage } from '../storage';
import { insertPersonSchema, insertFaceImageSchema } from '@shared/schema';

const router = Router();

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
    const body = z.object({ name: z.string().min(1).optional(), relationship: z.string().min(1).optional() }).parse(req.body);
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


