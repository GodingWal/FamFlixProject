import os
import base64
from typing import Optional


def _load_elevenlabs_client():
    try:
        from elevenlabs.client import ElevenLabs  # type: ignore
    except Exception:
        return None
    api_key = os.getenv("ELEVEN_API_KEY") or os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        return None
    try:
        return ElevenLabs(api_key=api_key)
    except Exception:
        return None


def synthesize_with_elevenlabs_simple(voice_id: str, text: str, mode: str = "narration") -> Optional[str]:
    """Generate MP3 base64 using basic defaults from env. Returns None on failure."""
    client = _load_elevenlabs_client()
    if client is None:
        return None
    try:
        try:
            from elevenlabs import VoiceSettings  # type: ignore
        except Exception:
            VoiceSettings = None  # type: ignore

        stability = float(os.getenv("DIALOGUE_STABILITY_DEFAULT", "0.35") if mode == "dialogue" else os.getenv("STABILITY_DEFAULT", "0.55"))
        similarity = float(os.getenv("SIMILARITY_DEFAULT", "0.7"))
        style = float(os.getenv("STYLE_DEFAULT", "0.0"))

        voice_settings = None
        if VoiceSettings is not None:
            voice_settings = VoiceSettings(
                stability=stability,
                similarity_boost=similarity,
                style=style,
                use_speaker_boost=True,
            )

        chunks = client.text_to_speech.convert(
            voice_id=voice_id,
            model_id=os.getenv("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2"),
            text=text,
            voice_settings=voice_settings,
            output_format="mp3_44100_128",
        )
        audio_bytes = b"".join(chunk for chunk in chunks if chunk)
        if not audio_bytes:
            return None
        return base64.b64encode(audio_bytes).decode("ascii")
    except Exception:
        return None
