import os
import sys
import base64


def main():
    try:
        from elevenlabs.client import ElevenLabs  # type: ignore
    except Exception:
        print("Missing dependency: elevenlabs. Run: pip install -r voice_agents/requirements.lite.txt", file=sys.stderr)
        sys.exit(1)

    if len(sys.argv) < 3:
        print("Usage: python voice_agents/smoke_tts.py <voice_id> <text>")
        print("Example: python voice_agents/smoke_tts.py pNInz6obpgDQGcFmaJgB 'Hello from FamFlix'\n")
        sys.exit(2)

    voice_id = sys.argv[1]
    text = " ".join(sys.argv[2:])

    api_key = os.getenv("ELEVEN_API_KEY") or os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        print("Set ELEVEN_API_KEY or ELEVENLABS_API_KEY in your environment.", file=sys.stderr)
        sys.exit(3)

    try:
        client = ElevenLabs(api_key=api_key)
        # Optional VoiceSettings; keep defaults minimal
        try:
            from elevenlabs import VoiceSettings  # type: ignore
            voice_settings = VoiceSettings(stability=0.55, similarity_boost=0.7, style=0.0, use_speaker_boost=True)
        except Exception:
            voice_settings = None

        chunks = client.text_to_speech.convert(
            voice_id=voice_id,
            model_id=os.getenv("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2"),
            text=text,
            voice_settings=voice_settings,
            output_format="mp3_44100_128",
        )
        audio_bytes = b"".join(chunk for chunk in chunks if chunk)
        if not audio_bytes:
            print("TTS returned no audio.", file=sys.stderr)
            sys.exit(4)

        out_path = os.path.abspath("smoke_tts_output.mp3")
        with open(out_path, "wb") as f:
            f.write(audio_bytes)
        print(f"Wrote {len(audio_bytes)} bytes to {out_path}")
    except Exception as e:
        print(f"TTS failed: {e}", file=sys.stderr)
        sys.exit(5)


if __name__ == "__main__":
    main()



