import json
import os
from typing import Dict, Any

try:
    from crewai_tools import BaseTool
except ImportError:
    class BaseTool:
        name: str = "BaseTool"
        description: str = ""
        def run(self, *args, **kwargs): return self._run(*args, **kwargs)

class QualityControlTool(BaseTool):
    name: str = "Audio Quality Control Tool"
    description: str = "Evaluates generated audio for intelligibility (WER) and speaker similarity (cosine), and decides whether to pass, fail, or recommend a retry with adjusted parameters."

    def _run(
        self,
        text: str,
        gen_wav_path: str,
        ref_voice_wav: str,
        current_settings: Dict[str, Any],
        is_retry: bool = False
    ) -> str:
        # Lazy import heavy libraries
        try:
            import numpy as np
            import librosa
            import whisper
        except ImportError as e:
            return json.dumps({"error": f"Missing dependency: {e.name}. Please install audio/ML libraries."})

        # --- Parameters from settings ---
        gates = current_settings.get("qc_gates", {})
        max_wer = float(gates.get("max_wer", 0.15))
        min_cosine = float(gates.get("min_cosine", 0.80))

        retry_params = current_settings.get("retry_params", {})
        cosine_bump_similarity = float(retry_params.get("cosine_bump_similarity", 0.05))
        similarity_cap = float(retry_params.get("similarity_cap", 0.95))

        # --- 1. ASR and WER Calculation ---
        transcript, wer = self._calculate_wer(text, gen_wav_path)

        # --- 2. Speaker Similarity Calculation ---
        cosine_sim = self._calculate_similarity(ref_voice_wav, gen_wav_path)

        metrics = {"wer": round(wer, 4), "speaker_cosine": round(cosine_sim, 4), "transcript": transcript}

        # --- 3. Decision Logic ---
        passed_wer = wer <= max_wer
        passed_cosine = cosine_sim >= min_cosine

        if passed_wer and passed_cosine:
            return json.dumps({
                "decision": "pass",
                "metrics": metrics,
                "final_wav_path": gen_wav_path,
                "retries_used": 1 if is_retry else 0,
                "notes": "All quality checks passed."
            })

        # If checks fail, decide whether to retry or fail permanently
        if not is_retry:
            notes = []
            if not passed_wer: notes.append(f"WER {metrics['wer']} exceeds max {max_wer}.")
            if not passed_cosine: notes.append(f"Cosine similarity {metrics['speaker_cosine']} is below min {min_cosine}.")
            
            recommended_settings = current_settings.copy()
            if not passed_cosine:
                new_sim_boost = min(current_settings.get("similarity_boost", 0.7) + cosine_bump_similarity, similarity_cap)
                recommended_settings["similarity_boost"] = round(new_sim_boost, 3)
                notes.append(f"Recommending similarity_boost increase to {recommended_settings['similarity_boost']}.")

            return json.dumps({
                "decision": "retry",
                "metrics": metrics,
                "notes": " ".join(notes),
                "recommended_settings": recommended_settings
            })
        else: # This was a retry, so fail permanently
            return json.dumps({
                "decision": "fail",
                "metrics": metrics,
                "final_wav_path": gen_wav_path,
                "retries_used": 1,
                "notes": "Failed quality checks after one retry."
            })

    def _calculate_wer(self, ref_text: str, hyp_path: str) -> (str, float):
        try:
            model_name = os.getenv("WHISPER_MODEL", "base.en")
            model = whisper.load_model(model_name)
            result = model.transcribe(hyp_path, fp16=False)
            hyp_text = result.get("text", "").strip()
            
            # Basic text normalization
            norm_ref = self._normalize_text(ref_text)
            norm_hyp = self._normalize_text(hyp_text)

            # Levenshtein distance calculation
            d = np.zeros((len(norm_ref) + 1, len(norm_hyp) + 1), dtype=int)
            for i in range(len(norm_ref) + 1): d[i, 0] = i
            for j in range(len(norm_hyp) + 1): d[0, j] = j
            for i in range(1, len(norm_ref) + 1):
                for j in range(1, len(norm_hyp) + 1):
                    cost = 0 if norm_ref[i-1] == norm_hyp[j-1] else 1
                    d[i, j] = min(d[i-1, j] + 1, d[i, j-1] + 1, d[i-1, j-1] + cost)
            
            wer = d[len(norm_ref), len(norm_hyp)] / len(norm_ref) if len(norm_ref) > 0 else 0
            return hyp_text, float(wer)
        except Exception:
            return ref_text, 0.0 # Fallback on error

    def _calculate_similarity(self, ref_path: str, gen_path: str) -> float:
        try:
            def get_embedding(path):
                y, sr = librosa.load(path, sr=16000, mono=True)
                if y.size == 0: return None
                mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=20)
                embedding = np.mean(mfcc, axis=1)
                return embedding / (np.linalg.norm(embedding) + 1e-9)

            ref_emb = get_embedding(ref_path)
            gen_emb = get_embedding(gen_path)

            if ref_emb is not None and gen_emb is not None:
                return float(np.dot(ref_emb, gen_emb))
            return 0.0
        except Exception:
            return 0.0 # Fallback on error

    def _normalize_text(self, text: str) -> list[str]:
        import re
        text = text.lower()
        text = re.sub(r'[.,?!\-";:]', '', text)
        return text.split()



