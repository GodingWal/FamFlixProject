import axios from "axios";
import FormData from "form-data";
import { log } from "../logger";

export function dataUrlToBuffer(dataUrl: string): Buffer {
  const match = /^data:[^;]+;base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new Error("Invalid data URL format");
  }
  return Buffer.from(match[1], "base64");
}

export async function createClonedVoiceInElevenLabs(
  voiceName: string,
  audioBuffer: Buffer,
  fileName: string = "sample.mp3"
): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }

  const form = new FormData();
  form.append("name", voiceName);
  form.append("files", audioBuffer, {
    filename: fileName,
    contentType: "audio/mpeg",
  });

  try {
    const response = await axios.post(
      "https://api.elevenlabs.io/v1/voices/add",
      form,
      {
        headers: {
          ...form.getHeaders(),
          "xi-api-key": apiKey,
        },
        maxBodyLength: Infinity,
      }
    );

    const voiceId = response?.data?.voice_id || response?.data?.voice?.voice_id;
    if (!voiceId) {
      log(`ElevenLabs response missing voice_id: ${JSON.stringify(response.data).slice(0, 500)}`, "error");
      throw new Error("ElevenLabs did not return a voice_id");
    }
    return String(voiceId);
  } catch (error: any) {
    const message = error?.response?.data ? JSON.stringify(error.response.data) : (error.message || "Unknown error");
    log(`ElevenLabs create voice failed: ${message}`, "error");
    throw new Error("Failed to create voice in ElevenLabs");
  }
}

// Text-to-speech synthesis using an existing ElevenLabs cloned voice
export async function synthesizeClonedSpeech(
  voiceId: string,
  text: string,
  format: "mp3" | "wav" = "mp3",
): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }

  try {
    const accept = format === "wav" ? "audio/wav" : "audio/mpeg";
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
      {
        text,
        // Choose a broadly compatible model; adjust if you have specific preferences
        model_id: "eleven_multilingual_v2",
        // Optional voice settings tweak; safe defaults
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      },
      {
        headers: {
          "accept": accept,
          "xi-api-key": apiKey,
          "content-type": "application/json",
        },
        responseType: "arraybuffer",
      },
    );

    return Buffer.from(response.data);
  } catch (error: any) {
    const message = error?.response?.data
      ? JSON.stringify(error.response.data)
      : (error.message || "Unknown error");
    log(`ElevenLabs TTS failed: ${message}`, "error");
    throw new Error("Failed to synthesize speech with ElevenLabs");
  }
}
