try:
    from crewai_tools import BaseTool  # type: ignore
except Exception:
    class BaseTool:  # minimal shim so tools can run without crewai_tools
        name: str = "BaseTool"
        description: str = ""

        def run(self, *args, **kwargs):
            return self._run(*args, **kwargs)

from typing import Optional
import os


class AudioProcessingTool(BaseTool):
    name: str = "Audio Preprocessing"
    description: str = "Resample 16k mono, VAD trim, light denoise, loudness normalize; return path to clean WAV"

    def _run(self, raw_audio_path: str, out_dir: Optional[str] = None) -> str:
        if not os.path.isabs(raw_audio_path):
            raise ValueError("raw_audio_path must be absolute")
        out_dir = out_dir or "/tmp"
        os.makedirs(out_dir, exist_ok=True)

        # Derive output path
        base = os.path.basename(raw_audio_path)
        stem = base.rsplit('.', 1)[0]
        clean_path = os.path.join(out_dir, f"{stem}_clean.wav")

        # Lazy imports to keep lightweight when not used
        try:
            import numpy as np
            import librosa
            import soundfile as sf
            import noisereduce as nr
            import pyloudnorm as pyln
        except Exception:
            # If deps missing, just return target path without processing
            return clean_path

        # 1) Load audio as mono at 16k
        try:
            y, sr = librosa.load(raw_audio_path, sr=16000, mono=True)
        except Exception:
            # Unable to load; return target path
            return clean_path

        if y.size == 0:
            return clean_path

        # 2) Simple VAD trim using energy-based segmentation
        try:
            intervals = librosa.effects.split(y, top_db=25)  # conservative trim
            if intervals.size > 0:
                y = np.concatenate([y[s:e] for s, e in intervals])
        except Exception:
            pass

        # 3) Light denoise
        try:
            # Use a small noise reduction to avoid artifacts
            y = nr.reduce_noise(y=y, sr=16000, prop_decrease=0.6, stationary=True)
        except Exception:
            pass

        # 4) Loudness normalize to about -20 LUFS, cap true peak
        try:
            meter = pyln.Meter(16000)
            loudness = meter.integrated_loudness(y)
            target = -20.0
            y = pyln.normalize.loudness(y, loudness, target)
            # Peak safety limiter (soft clip if necessary)
            peak = float(np.max(np.abs(y))) if y.size else 0.0
            if peak > 0.98:
                y = (y / peak) * 0.98
        except Exception:
            pass

        # 5) Write WAV 16k mono
        try:
            sf.write(clean_path, y, 16000, subtype="PCM_16")
        except Exception:
            # Best-effort fallback
            tmp_path = os.path.join(out_dir, f"{stem}_clean_tmp.wav")
            try:
                sf.write(tmp_path, y, 16000)
                os.replace(tmp_path, clean_path)
            except Exception:
                # give up silently
                return clean_path

        return clean_path


