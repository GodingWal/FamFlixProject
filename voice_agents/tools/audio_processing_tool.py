try:
    from crewai_tools import BaseTool  # type: ignore
except Exception:
    class BaseTool:  # minimal shim so tools can run without crewai_tools
        name: str = "BaseTool"
        description: str = ""

        def run(self, *args, **kwargs):
            return self._run(*args, **kwargs)

from typing import Optional, Dict
import os
import json

class AudioProcessingTool(BaseTool):
    name: str = "Audio Preprocessing Pipeline"
    description: str = (
        "Processes a raw audio file through a complete pipeline for TTS/cloning preparation. "
        "This includes resampling, speaker diarization to isolate the dominant speaker, denoising, "
        "and loudness normalization. Returns a JSON object with the path to the cleaned audio file or an error."
    )

    def _run(self, raw_audio_path: str, out_dir: Optional[str] = None) -> str:
        # Lazy imports for heavy dependencies
        try:
            import numpy as np
            import librosa
            import soundfile as sf
            import noisereduce as nr
            import pyloudnorm as pyln
            from pyannote.audio import Pipeline
            import torch
        except ImportError as e:
            return json.dumps({"error": f"Missing dependency: {e.name}. Please install all audio processing libraries."}) 

        if not os.path.isabs(raw_audio_path):
            return json.dumps({"error": "raw_audio_path must be an absolute path"})
        if not os.path.exists(raw_audio_path):
            return json.dumps({"error": f"Input file not found: {raw_audio_path}"})

        out_dir = out_dir or "/tmp/audio_processing"
        os.makedirs(out_dir, exist_ok=True)

        base = os.path.basename(raw_audio_path)
        stem = base.rsplit('.', 1)[0]
        clean_path = os.path.join(out_dir, f"{stem}_clean.wav")

        try:
            # 1. Load audio at 16k mono
            y, sr = librosa.load(raw_audio_path, sr=16000, mono=True)
            if y.size == 0:
                return json.dumps({"error": "Input audio is empty"})

            # 2. Speaker diarization to find and isolate the dominant speaker
            hf_token = os.getenv("HF_TOKEN")
            if not hf_token:
                return json.dumps({"error": "Hugging Face token (HF_TOKEN) not found. Diarization requires it."})
            
            pipeline = Pipeline.from_pretrained("pyannote/speaker-diarization-3.1", use_auth_token=hf_token)
            diarization = pipeline(raw_audio_path)

            speaker_turns = {}
            for turn, _, speaker in diarization.itertracks(yield_label=True):
                duration = turn.end - turn.start
                if speaker not in speaker_turns:
                    speaker_turns[speaker] = 0
                speaker_turns[speaker] += duration

            if not speaker_turns:
                return json.dumps({"error": "No speech detected (VAD found no segments)"})

            dominant_speaker = max(speaker_turns, key=speaker_turns.get)
            total_speech_duration = sum(speaker_turns.values())

            if total_speech_duration < 10.0:
                return json.dumps({"error": f"Input is unusable. Total detected speech is only {total_speech_duration:.1f}s, which is less than the 10s minimum."})

            # Concatenate segments from the dominant speaker
            dominant_speaker_audio = []
            for turn, _, speaker in diarization.itertracks(yield_label=True):
                if speaker == dominant_speaker:
                    start_sample = int(turn.start * sr)
                    end_sample = int(turn.end * sr)
                    dominant_speaker_audio.append(y[start_sample:end_sample])
            
            if not dominant_speaker_audio:
                 return json.dumps({"error": "Could not isolate dominant speaker audio segments."})

            y = np.concatenate(dominant_speaker_audio)

            # 3. Light denoising
            y = nr.reduce_noise(y=y, sr=sr, prop_decrease=0.6, stationary=True)

            # 4. Loudness normalize to -20 LUFS, with true peak at -2 dBFS
            meter = pyln.Meter(sr)
            loudness = meter.integrated_loudness(y)
            y = pyln.normalize.loudness(y, loudness, -20.0)
            
            peak_level = np.max(np.abs(y))
            target_peak = 10**(-2 / 20) # -2 dBFS in linear scale
            if peak_level > target_peak:
                y = y * (target_peak / peak_level)

            # 5. Export final WAV file
            sf.write(clean_path, y, sr, subtype='PCM_16')

            return json.dumps({"clean_wav_path": clean_path})

        except Exception as e:
            return json.dumps({"error": f"An unexpected error occurred during audio processing: {str(e)}"})



