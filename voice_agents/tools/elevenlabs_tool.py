from typing import Optional, Dict, Any
import hashlib
import json
import os

try:
    from crewai_tools import BaseTool  # type: ignore
except Exception:
    class BaseTool:  # minimal shim to avoid hard dependency
        name: str = "BaseTool"
        description: str = ""

        def run(self, *args, **kwargs):
            return self._run(*args, **kwargs)


class ElevenLabsTool(BaseTool):
    name: str = "ElevenLabs TTS"
    description: str = "Generate speech from text using the ElevenLabs API, with support for caching and parameter tuning."

    def _run(
        self,
        voice_id: str,
        text: str,
        mode: str = "narration",
        defaults: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> str:
        api_key = os.getenv("ELEVEN_API_KEY") or os.getenv("ELEVENLABS_API_KEY")
        if not api_key:
            return json.dumps({"error": "Missing ELEVEN_API_KEY/ELEVENLABS_API_KEY"})

        # Combine defaults with any explicit kwargs
        settings = defaults or {}
        settings.update(kwargs)

        # Determine final synthesis parameters
        stability = settings.get("dialogue_stability", 0.35) if mode == "dialogue" else settings.get("stability", 0.55)
        params = {
            "stability": float(stability),
            "similarity_boost": float(settings.get("similarity_boost", 0.7)),
            "style": float(settings.get("style", 0.0)),
            "speed": float(settings.get("speed", 1.0)),
            "model_id": str(settings.get("model_id", "eleven_multilingual_v2")),
            "output_format": str(settings.get("output_format", "mp3_44100_128")),
        }

        # --- Caching Logic ---
        cache_payload = {"voice_id": voice_id, "text": text, **params}
        cache_hash = hashlib.sha256(json.dumps(cache_payload, sort_keys=True).encode("utf-8")).hexdigest()
        cache_dir = os.path.abspath(os.getenv("ELEVEN_TTS_CACHE_DIR", "/tmp/tts_cache"))
        os.makedirs(cache_dir, exist_ok=True)
        ext = ".mp3" if params["output_format"].startswith("mp3") else ".wav"
        output_path = os.path.join(cache_dir, f"{cache_hash}{ext}")

        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            return json.dumps({
                "gen_wav_path": output_path,
                "settings_used": params,
                "was_cached": True
            })

        # --- Synthesis Logic ---
        try:
            from elevenlabs.client import ElevenLabs
            from elevenlabs import VoiceSettings
        except ImportError:
            return json.dumps({"error": "ElevenLabs client not installed. Please run 'pip install elevenlabs'."})

        client = ElevenLabs(api_key=api_key)
        voice_settings = VoiceSettings(
            stability=params["stability"],
            similarity_boost=params["similarity_boost"],
            style=params["style"],
            use_speaker_boost=True
        )

        try:
            # Split text into manageable chunks for the API
            segments = self._split_text(text)
            audio_parts = []
            for segment in segments:
                if not segment.strip():
                    continue
                # Note: speed is not a direct parameter in the v2 client, it's a post-processing step if needed.
                audio_stream = client.text_to_speech.convert(
                    voice_id=voice_id,
                    text=segment,
                    model_id=params["model_id"],
                    voice_settings=voice_settings,
                    output_format=params["output_format"],
                )
                audio_parts.append(b"".join(chunk for chunk in audio_stream if chunk))
            
            audio_bytes = b"".join(audio_parts)

            with open(output_path, "wb") as f:
                f.write(audio_bytes)

            return json.dumps({
                "gen_wav_path": output_path,
                "settings_used": params,
                "was_cached": False
            })

        except Exception as e:
            return json.dumps({"error": f"ElevenLabs API call failed: {str(e)}"})

    # --- helpers ---
    @staticmethod
    def _split_text(text: str, max_chars: int = 1000) -> list[str]:
        """
        Lightweight sentence-ish splitter that respects max_chars per segment.
        Splits on punctuation .?! and newlines, then packs segments not exceeding max_chars.
        """
        if len(text) <= max_chars:
            return [text]
        import re
        # First split by sentence terminators while keeping them
        parts = re.split(r"(?<=[\.\!\?])\s+|\n+", text)
        segments: list[str] = []
        cur = ""
        for p in parts:
            if not p:
                continue
            if not cur:
                cur = p.strip()
                continue
            if len(cur) + 1 + len(p) <= max_chars:
                cur = f"{cur} {p.strip()}"
            else:
                segments.append(cur)
                cur = p.strip()
        if cur:
            segments.append(cur)
        # Fallback: hard chunk if any segment still too long
        out: list[str] = []
        for s in segments:
            while len(s) > max_chars:
                out.append(s[:max_chars])
                s = s[max_chars:]
            if s:
                out.append(s)
        return out


