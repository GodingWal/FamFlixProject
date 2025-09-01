import threading
from typing import Dict, Any, Optional
import os

from . import jobs
from ..tools.audio_processing_tool import AudioProcessingTool
from ..tools.quality_control_tool import QualityControlTool
from .tts_utils import synthesize_with_elevenlabs_simple
import json
try:
    from ..crew import build_voice_crew  # type: ignore
except Exception:
    def build_voice_crew(context: Dict[str, Any]):  # type: ignore
        return None


def _policy_guard(payload: Dict[str, Any]) -> Optional[str]:
    provider = (payload.get("provider") or "").lower().strip()
    consent = bool(payload.get("consent_flag", False))
    text = payload.get("text") or ""
    limits = payload.get("limits") or {}
    max_text_length = int(limits.get("max_text_length", 800))

    if not consent:
        return "missing consent"
    if provider != "elevenlabs":
        return "provider not ElevenLabs"
    if len(text) > max_text_length:
        return "text too long"
    # daily_char_limit can be enforced here if user context is available
    return None


def run_clone_job(job_id: str, payload: Dict[str, Any]):
    try:
        jobs.set_status(job_id, "validating")
        jobs.add_event(job_id, "Running policy and cost guard", stage="policy")
        err = _policy_guard(payload)
        if err:
            jobs.set_error(job_id, f"Input unusable: {err}")
            return

        # Ingestion / Preprocess
        raw_audio_path = payload.get("raw_audio_path")
        if not raw_audio_path or not os.path.exists(raw_audio_path):
            jobs.set_error(job_id, "raw_audio_path is required and must exist")
            return

        # Optional: Run CrewAI orchestration if enabled, but do not depend on its output
        try:
            if os.getenv("CREWAI_RUN", "false").lower() == "true":
                context = {
                    "raw_audio_path": raw_audio_path,
                    "voice_id": payload.get("voice_id", ""),
                    "text": payload.get("text", ""),
                    "mode": payload.get("mode", "narration"),
                    "defaults": payload.get("defaults", {}),
                    "gates": {
                        "max_wer": float((payload.get("qc", {}) or {}).get("max_wer", 0.15)),
                        "min_cosine": float((payload.get("qc", {}) or {}).get("min_cosine", 0.80)),
                    },
                    "retry": {
                        "cosine_bump_similarity": float((payload.get("qc", {}) or {}).get("cosine_bump_similarity", 0.05)),
                        "similarity_cap": float((payload.get("qc", {}) or {}).get("similarity_cap", 0.90)),
                        "cosine_bump_stability": float((payload.get("qc", {}) or {}).get("cosine_bump_stability", 0.05)),
                        "stability_cap": float((payload.get("qc", {}) or {}).get("stability_cap", 0.75)),
                    },
                    "task_type": "voice_clone",
                }
                crew = build_voice_crew(context)
                if crew:
                    jobs.add_event(job_id, "CrewAI kickoff", stage="crew")
                    try:
                        _ = crew.kickoff()
                        jobs.add_event(job_id, "CrewAI finished", stage="crew")
                    except Exception as e:
                        jobs.add_event(job_id, f"CrewAI error: {e}", stage="crew")
        except Exception as e:
            jobs.add_event(job_id, f"CrewAI init skipped: {e}", stage="crew")

        jobs.set_status(job_id, "ingesting")
        jobs.add_event(job_id, "Preprocessing audio", stage="ingestion", data={"raw_audio_path": raw_audio_path})
        clean_wav_path: Optional[str] = None
        try:
            ap = AudioProcessingTool()
            ap_result = ap._run(raw_audio_path=raw_audio_path, out_dir="/tmp")
            # Tool returns JSON string
            try:
                parsed = json.loads(ap_result) if isinstance(ap_result, str) else ap_result
            except Exception:
                parsed = {"error": str(ap_result)}
            if isinstance(parsed, dict) and parsed.get("error"):
                jobs.set_error(job_id, f"Audio preprocessing error: {parsed.get('error')}")
                return
            clean_wav_path = parsed.get("clean_wav_path") if isinstance(parsed, dict) else None
            if not clean_wav_path or not os.path.exists(clean_wav_path):
                jobs.set_error(job_id, "Audio processing failed to produce an output file")
                return
            jobs.add_event(job_id, "Audio preprocessed", stage="ingestion", data={"clean_wav_path": clean_wav_path})
        except Exception as e:
            jobs.set_error(job_id, f"Audio preprocessing failed: {e}")
            return

        # Synthesize audio for comparison
        jobs.set_status(job_id, "synthesizing")
        mode = payload.get("mode", "narration")
        text = payload.get("text", "")
        voice_id = payload.get("voice_id", "")
        audio_b64 = synthesize_with_elevenlabs_simple(voice_id=voice_id, text=text, mode=mode)

        if not audio_b64:
            jobs.set_error(job_id, "TTS generation failed")
            return

        # Persist synthesized audio to disk for QC
        gen_wav_path = f"/tmp/job_{job_id}_preview.wav"
        try:
            import base64
            import librosa
            import soundfile as sf
            mp3_path = gen_wav_path.replace(".wav", ".mp3")
            with open(mp3_path, "wb") as f:
                f.write(base64.b64decode(audio_b64))
            y, sr = librosa.load(mp3_path, sr=16000, mono=True)
            sf.write(gen_wav_path, y, 16000, subtype="PCM_16")
        except Exception as e:
            jobs.set_error(job_id, f"Failed to prepare generated audio for QC: {e}")
            return

        # Quality Control
        jobs.set_status(job_id, "verifying")
        qc_config = payload.get("qc", {})
        gates = {
            "max_wer": float(qc_config.get("max_wer", 0.15)),
            "min_cosine": float(qc_config.get("min_cosine", 0.80)),
        }
        retry_config = {
            "cosine_bump_similarity": float(qc_config.get("cosine_bump_similarity", 0.05)),
            "similarity_cap": float(qc_config.get("similarity_cap", 0.90)),
            "cosine_bump_stability": float(qc_config.get("cosine_bump_stability", 0.05)),
            "stability_cap": float(qc_config.get("stability_cap", 0.75)),
        }

        try:
            qc_tool = QualityControlTool()
            qc_result = qc_tool._run(
                text=text,
                gen_wav_path=gen_wav_path,
                ref_voice_wav=clean_wav_path,
                gates=gates,
                retry=retry_config,
            )
        except Exception as e:
            jobs.set_error(job_id, f"QC check failed: {e}")
            return

        # Final Result Assembly
        final_decision = qc_result.get("decision", "fail")
        if final_decision == "pass":
            ok_status = {"ok": True, "reason": "checks passed"}
            jobs.set_status(job_id, "completed")
        else:
            ok_status = {"ok": False, "reason": f"QC failed: {qc_result.get('notes', 'unspecified')}"}
            jobs.set_status(job_id, "failed")

        defaults = payload.get("defaults", {})
        settings_used = {
             "stability": float(defaults.get("stability", os.getenv("STABILITY_DEFAULT", "0.55"))),
             "similarity_boost": float(defaults.get("similarity_boost", os.getenv("SIMILARITY_DEFAULT", "0.7"))),
             "style": float(defaults.get("style", os.getenv("STYLE_DEFAULT", "0.0"))),
             "speed": float(defaults.get("speed", os.getenv("SPEED_DEFAULT", "1.0"))),
        }

        result_payload = {
            **ok_status,
            "decision": final_decision,
            "metrics": qc_result.get("metrics"),
            "clean_wav_path": clean_wav_path,
            "gen_wav_path": gen_wav_path,
            "settings_used": settings_used,
        }

        jobs.set_result(job_id, result_payload)

    except Exception as e:
        jobs.set_error(job_id, f"Orchestration error: {e}")


def start_clone_job_async(job_id: str, payload: Dict[str, Any]):
    t = threading.Thread(target=run_clone_job, args=(job_id, payload), daemon=True)
    t.start()
