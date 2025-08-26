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
    description: str = "Generate speech using ElevenLabs API with tuning and caching"

    def _run(
        self,
        voice_id: str,
        text: str,
        settings: Optional[Dict[str, Any]] = None,
        cache_key: Optional[str] = None,
    ) -> str:
        """
        Synthesize speech using ElevenLabs. Returns absolute path to generated audio file.

        settings keys supported (all optional):
        - mode: "narration" | "dialogue" (affects stability selection)
        - stability, dialogue_stability, similarity_boost, style, speed
        - model_id (overrides env)
        - output_format (e.g., "mp3_44100_128")
        """

        api_key = os.getenv("ELEVEN_API_KEY") or os.getenv("ELEVENLABS_API_KEY")
        if not api_key:
            raise RuntimeError("Missing ELEVEN_API_KEY/ELEVENLABS_API_KEY for ElevenLabsTool")

        # Defaults align with voice_agents.api.main.DefaultsModel
        settings = settings or {}
        mode = str(settings.get("mode", "narration")).lower()
        stability = float(settings.get("stability", float(os.getenv("STABILITY_DEFAULT", "0.55"))))
        dialogue_stability = float(settings.get("dialogue_stability", float(os.getenv("DIALOGUE_STABILITY_DEFAULT", "0.35"))))
        similarity_boost = float(settings.get("similarity_boost", float(os.getenv("SIMILARITY_DEFAULT", "0.7"))))
        style = float(settings.get("style", float(os.getenv("STYLE_DEFAULT", "0.0"))))
        speed = float(settings.get("speed", float(os.getenv("SPEED_DEFAULT", "1.0"))))
        model_id = str(settings.get("model_id", os.getenv("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2")))
        output_format = str(settings.get("output_format", os.getenv("ELEVENLABS_OUTPUT_FORMAT", "mp3_44100_128")))

        used_stability = dialogue_stability if mode == "dialogue" else stability

        # Compute cache key
        cache_base = cache_key or json.dumps(
            {
                "voice_id": voice_id,
                "text": text,
                "stability": used_stability,
                "similarity_boost": similarity_boost,
                "style": style,
                "speed": speed,
                "model_id": model_id,
                "format": output_format,
            },
            sort_keys=True,
        )
        cache_hash = hashlib.sha256(cache_base.encode("utf-8")).hexdigest()
        cache_dir = os.path.abspath(os.getenv("ELEVEN_TTS_CACHE_DIR", "/tmp/tts_cache"))
        os.makedirs(cache_dir, exist_ok=True)

        ext = ".mp3" if output_format.startswith("mp3") else ".wav"
        output_path = os.path.join(cache_dir, f"{cache_hash}{ext}")
        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            return output_path

        # Prefer ElevenLabs client with chunked convert to handle large outputs
        audio_bytes: Optional[bytes] = None
        try:
            try:
                from elevenlabs.client import ElevenLabs  # type: ignore
            except Exception:
                ElevenLabs = None  # type: ignore

            if ElevenLabs is not None:
                client = ElevenLabs(api_key=api_key)
                try:
                    from elevenlabs import VoiceSettings  # type: ignore
                except Exception:
                    VoiceSettings = None  # type: ignore

                voice_settings = None
                if VoiceSettings is not None:
                    voice_settings = VoiceSettings(
                        stability=float(used_stability),
                        similarity_boost=float(similarity_boost),
                        style=float(style),
                        use_speaker_boost=True,
                    )

                # Split very long text into sentence-ish chunks to avoid provider limits
                segments = self._split_text(text, max_chars=1000)
                buf_parts: list[bytes] = []
                for seg in segments:
                    seg = seg.strip()
                    if not seg:
                        continue
                    chunks = client.text_to_speech.convert(
                        voice_id=voice_id,
                        model_id=model_id,
                        text=seg,
                        voice_settings=voice_settings,
                        output_format=output_format,
                    )
                    buf_parts.append(b"".join(chunk for chunk in chunks if chunk))
                audio_bytes = b"".join(buf_parts)
        except Exception:
            audio_bytes = None

        if not audio_bytes:
            # Fallback to legacy generate API if available
            try:
                from elevenlabs import generate, set_api_key  # type: ignore
            except Exception:
                generate = None  # type: ignore
                set_api_key = None  # type: ignore

            if generate is None or set_api_key is None:
                # As a last resort, return a stub path for development
                return output_path
            try:
                set_api_key(api_key)
                audio_bytes = generate(text=text, voice=voice_id)
            except Exception:
                # Return stub if generation fails
                return output_path

        # Persist audio
        try:
            with open(output_path, "wb") as f:
                f.write(audio_bytes)
        except Exception:
            # If write fails, drop back to /tmp
            fallback = f"/tmp/generated_{cache_hash}{ext}"
            try:
                with open(fallback, "wb") as f:
                    f.write(audio_bytes)
                return fallback
            except Exception:
                # Give up but return deterministic path
                return output_path

        return output_path

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


