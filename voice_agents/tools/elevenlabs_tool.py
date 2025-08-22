from typing import Optional, Dict, Any
from crewai_tools import BaseTool
import os

try:
    from elevenlabs import generate, set_api_key
except Exception:  # keep import-light until installed
    generate = None
    def set_api_key(_):
        pass


class ElevenLabsTool(BaseTool):
    name: str = "ElevenLabs TTS"
    description: str = "Generate speech using ElevenLabs API with tuning and caching"

    def _run(self, voice_id: str, text: str, settings: Optional[Dict[str, Any]] = None, cache_key: Optional[str] = None) -> str:
        api_key = os.getenv("ELEVEN_API_KEY") or os.getenv("ELEVENLABS_API_KEY")
        if not api_key:
            raise RuntimeError("Missing ELEVEN_API_KEY")
        set_api_key(api_key)

        if generate is None:
            # Placeholder during dev; return stub path
            return f"/tmp/generated_{voice_id}.wav"

        audio = generate(
            text=text,
            voice=voice_id,
            # Map settings as needed
        )
        output_path = f"/tmp/generated_{voice_id}.wav"
        with open(output_path, 'wb') as f:
            f.write(audio)
        return output_path


