import express, { Request, Response } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { people } from "@shared/schema";
import { eq } from "drizzle-orm";
import { log } from "../vite";
import { transcribeAndAnalyzeVoice } from "../services/openai";
import OpenAI from "openai";
import { createClonedVoiceInElevenLabs, dataUrlToBuffer } from "../services/elevenlabs";

const router = express.Router();

// List voice recordings for a person
router.get("/people/:personId/voiceRecordings", async (req: Request, res: Response) => {
  try {
    const personId = Number(req.params.personId);
    if (!Number.isFinite(personId)) {
      return res.status(400).json({ message: "Invalid personId" });
    }

    const recordings = await storage.getVoiceRecordingsByPersonId(personId);
    return res.json(recordings);
  } catch (error) {
    log(`GET /people/:personId/voiceRecordings error: ${(error as Error).message}`, "error");
    return res.status(500).json({ message: "Failed to fetch voice recordings" });
  }
});

// Create a new voice recording
router.post("/voiceRecordings", async (req: Request, res: Response) => {
  try {
    const { userId, personId, name, audioData, audioUrl, duration, isDefault } = req.body || {};

    if (!userId || !personId || !name || !audioUrl) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // First, create the recording (encrypted if data URL)
    const created = await storage.createVoiceRecording({
      userId: Number(userId),
      personId: Number(personId),
      name: String(name),
      audioUrl: String(audioUrl),
      audioData: audioData ? String(audioData) : null,
      duration: duration ? Number(duration) : null,
      isDefault: Boolean(isDefault),
      createdAt: new Date(),
    } as any);

    // Next, create a cloned voice in ElevenLabs from the provided sample
    try {
      const buffer = dataUrlToBuffer(String(audioUrl));
      const voiceName = `${name}`.slice(0, 50);
      const elevenlabsVoiceId = await createClonedVoiceInElevenLabs(voiceName, buffer, "sample.mp3");

      // Update the person profile with the ElevenLabs voice id
      try {
        const updated = await db!
          .update(people)
          .set({ elevenlabsVoiceId })
          .where(eq(people.id, Number(personId)));
        log(`Updated person ${personId} with ElevenLabs voice id`, "routes");
      } catch (e) {
        log(`Failed to update person with ElevenLabs voice id: ${(e as Error).message}`, "error");
      }

      return res.status(201).json({ ...created, elevenlabsVoiceId });
    } catch (err) {
      // If cloning fails, still return the created recording, but flag the error
      log(`Voice cloning failed: ${(err as Error).message}`, "error");
      return res.status(201).json({ ...created, elevenlabsError: true });
    }
  } catch (error) {
    log(`POST /voiceRecordings error: ${(error as Error).message}`, "error");
    return res.status(500).json({ message: "Failed to create voice recording" });
  }
});

// Set a voice recording as default for its person
router.patch("/voiceRecordings/:id/setDefault", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid recording id" });
    }
    const updated = await storage.setDefaultVoiceRecording(id);
    if (!updated) {
      return res.status(404).json({ message: "Recording not found" });
    }
    return res.json(updated);
  } catch (error) {
    log(`PATCH /voiceRecordings/:id/setDefault error: ${(error as Error).message}`, "error");
    return res.status(500).json({ message: "Failed to set default voice recording" });
  }
});

// Delete a voice recording
router.delete("/voiceRecordings/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid recording id" });
    }
    await storage.deleteVoiceRecording(id);
    return res.json({ success: true });
  } catch (error) {
    log(`DELETE /voiceRecordings/:id error: ${(error as Error).message}`, "error");
    return res.status(500).json({ message: "Failed to delete voice recording" });
  }
});

// Compare a freshly recorded user audio against target script
router.post("/voice/compare", async (req: Request, res: Response) => {
  try {
    const { personId, userAudio, scriptText, duration } = req.body || {};
    if (!personId || !userAudio || !scriptText) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Decode base64 data URL
    const match = /^data:audio\/[^;]+;base64,(.+)$/.exec(String(userAudio));
    if (!match) {
      return res.status(400).json({ message: "userAudio must be a base64 audio data URL" });
    }
    const audioBuffer = Buffer.from(match[1], "base64");

    // Transcribe and analyze using OpenAI Whisper + GPT
    const analysis = await transcribeAndAnalyzeVoice(audioBuffer);

    // Very simple similarity proxy: overlap ratio between words in transcript and script
    const a = new Set((analysis.transcript || "").toLowerCase().split(/\W+/).filter(Boolean));
    const b = new Set(String(scriptText).toLowerCase().split(/\W+/).filter(Boolean));
    let overlap = 0;
    a.forEach((w) => {
      if (b.has(w)) overlap += 1;
    });
    const denom = Math.max(1, Math.min(a.size, b.size));
    const similarity = Math.round((overlap / denom) * 100);

    // Optionally fetch person's ElevenLabs voice id (if needed by future enhancements)
    try {
      const person = await db!.select().from(people).where(eq(people.id, Number(personId)));
      if (person?.[0]?.elevenlabsVoiceId) {
        // Placeholder: we could synthesize AI audio here via ElevenLabs using person[0].elevenlabsVoiceId
      }
    } catch (_) {}

    // Echo back the user audio as a data URL; AI audio generation can be added later
    return res.json({
      userAudioUrl: String(userAudio),
      aiAudioUrl: "",
      transcript: analysis.transcript,
      similarity,
      duration: duration ? Number(duration) : undefined,
    });
  } catch (error) {
    log(`POST /voice/compare error: ${(error as Error).message}`, "error");
    return res.status(500).json({ message: "Failed to compare voices" });
  }
});

export default router;

// Generate cloned speech audio (prototype using OpenAI TTS)
router.post("/voice/clone-speech", async (req: Request, res: Response) => {
  try {
    const { text, personId, voiceRecordingId } = req.body || {};
    if (!text) {
      return res.status(400).json({ error: "text is required" });
    }

    // If needed, fetch person's ElevenLabs voice id (not yet used here)
    if (personId) {
      try {
        await db!.select().from(people).where(eq(people.id, Number(personId)));
      } catch (_) {}
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // Use OpenAI TTS to synthesize a quick MP3 data URL
    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: String(text),
      format: "mp3",
    } as any);

    // Convert to base64 data URL
    const arrayBuffer = await speech.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const audioUrl = `data:audio/mpeg;base64,${buffer.toString("base64")}`;

    return res.json({ audioUrl });
  } catch (error) {
    log(`POST /voice/clone-speech error: ${(error as Error).message}`, "error");
    return res.status(500).json({ error: "Failed to generate cloned speech" });
  }
});

