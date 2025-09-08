import { log } from '../vite';
import type { IncomingHttpHeaders } from 'http';

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';
const ELEVENLABS_API_KEY: string = (process as any)?.env?.ELEVENLABS_API_KEY || (process as any)?.env?.ELEVEN_API_KEY || '';

function ensureApiKey(): void {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is not configured');
  }
}

export async function listVoices(): Promise<any[]> {
  try {
    ensureApiKey();
    const res = await fetch(`${ELEVENLABS_API_BASE}/voices`, {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // API returns { voices: [...] }
    if (Array.isArray((data as any).voices)) return (data as any).voices;
    if (Array.isArray(data)) return data as any[];
    return [];
  } catch (err) {
    log(`ElevenLabs listVoices error: ${(err as Error).message}`, 'elevenlabs');
    return [];
  }
}

export async function synthesizeToBase64(args: { voiceId: string; text: string; modelId?: string; voiceSettings?: any }): Promise<{ audio_base64: string; mime: string }> {
  ensureApiKey();
  const { voiceId, text, modelId, voiceSettings } = args;
  const url = `${ELEVENLABS_API_BASE}/text-to-speech/${encodeURIComponent(voiceId)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'accept': 'audio/mpeg',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, model_id: modelId, voice_settings: voiceSettings }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`TTS failed: HTTP ${res.status} ${txt}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const b64 = Buffer.from(arrayBuffer as any).toString('base64');
  return { audio_base64: b64, mime: 'audio/mpeg' };
}

export async function createVoiceFromSample(params: {
  name: string;
  audioBuffer: Buffer;
  mimeType: string;
  filename?: string;
  description?: string;
  labels?: Record<string, string>;
}): Promise<{ voice_id: string; name?: string } | null> {
  try {
    ensureApiKey();
    const { default: FormData } = await import('form-data');
    const form = new FormData();
    form.append('name', params.name);
    if (params.description) form.append('description', params.description);
    if (params.labels) form.append('labels', JSON.stringify(params.labels));
    form.append('files', params.audioBuffer, {
      filename: params.filename || 'sample.' + (params.mimeType.includes('mpeg') ? 'mp3' : params.mimeType.includes('wav') ? 'wav' : 'audio'),
      contentType: params.mimeType,
      knownLength: params.audioBuffer.length,
    } as any);

    const res = await fetch(`${ELEVENLABS_API_BASE}/voices/add`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        ...(form as any).getHeaders?.(),
      } as any,
      body: form as any,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Create voice failed: HTTP ${res.status} ${txt}`);
    }
    const data = await res.json();
    const voiceId = (data && (data.voice_id || data.id)) || null;
    if (!voiceId) return null;
    return { voice_id: String(voiceId), name: (data && data.name) || params.name };
  } catch (err) {
    log(`ElevenLabs createVoiceFromSample error: ${(err as Error).message}`, 'elevenlabs');
    return null;
  }
}

