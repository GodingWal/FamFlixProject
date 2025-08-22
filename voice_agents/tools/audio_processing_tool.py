from crewai_tools import BaseTool
from typing import Optional
import os

class AudioProcessingTool(BaseTool):
    name: str = "Audio Preprocessing"
    description: str = "Resample 16k mono, VAD trim, light denoise, loudness normalize, diarize dominant speaker; return path to clean WAV"

    def _run(self, raw_audio_path: str, out_dir: Optional[str] = None) -> str:
        if not os.path.isabs(raw_audio_path):
            raise ValueError("raw_audio_path must be absolute")
        out_dir = out_dir or "/tmp"
        os.makedirs(out_dir, exist_ok=True)
        # Stub: just echo input for now; real implementation will process
        clean_path = os.path.join(out_dir, os.path.basename(raw_audio_path).rsplit('.', 1)[0] + "_clean.wav")
        return clean_path


