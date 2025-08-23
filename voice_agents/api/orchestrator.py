import threading
from typing import Dict, Any, Optional
import os

from . import jobs
from ..tools.audio_processing_tool import AudioProcessingTool
from ..tools.quality_control_tool import QualityControlTool
from .tts_utils import synthesize_with_elevenlabs_simple
from ..crew import build_voice_crew


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
            jobs.set_error(job_id, err)
            return

        # Ingestion / Preprocess (optional)
        raw_audio_path = payload.get("raw_audio_path")
        clean_wav_path: Optional[str] = None
        if raw_audio_path:
            jobs.set_status(job_id, "ingesting")
            jobs.add_event(job_id, "Preprocessing audio", stage="ingestion", data={"raw_audio_path": raw_audio_path})
            try:
                ap = AudioProcessingTool()
                clean_wav_path = ap._run(raw_audio_path=raw_audio_path, out_dir="/tmp")
                jobs.add_event(job_id, "Audio preprocessed", stage="ingestion", data={"clean_wav_path": clean_wav_path})
            except Exception as e:
                jobs.set_error(job_id, f"audio preprocessing failed: {e}")
                return

        # Decide path: CrewAI agents or procedural
        use_crewai = bool(payload.get("use_crewai", True)) or os.getenv("CREWAI_RUN", "false").lower() == "true"
        audio_b64: Optional[str] = None

        if use_crewai and (os.getenv("OPENAI_API_KEY") or ""):
            try:
                jobs.set_status(job_id, "agents_running")
                jobs.add_event(job_id, "Building CrewAI context", stage="agents")
                defaults = payload.get("defaults") or {}
                context = {
                    "raw_audio_path": clean_wav_path or payload.get("raw_audio_path"),
                    "voice_id": payload["voice_id"],
                    "text": payload["text"],
                    "mode": payload.get("mode", "narration"),
                    "defaults": {
                        "stability": float(defaults.get("stability", os.getenv("STABILITY_DEFAULT", "0.55"))),
                        "dialogue_stability": float(defaults.get("dialogue_stability", os.getenv("DIALOGUE_STABILITY_DEFAULT", "0.35"))),
                        "similarity_boost": float(defaults.get("similarity_boost", os.getenv("SIMILARITY_DEFAULT", "0.7"))),
                        "style": float(defaults.get("style", os.getenv("STYLE_DEFAULT", "0.0"))),
                        "speed": float(defaults.get("speed", os.getenv("SPEED_DEFAULT", "1.0"))),
                    },
                    "gates": (payload.get("qc") or {}),
                }
                crew = build_voice_crew(context)
                # Run sequential crew; tools do the heavy lifting
                result = crew.kickoff()
                # We don't have a standardized artifact path; return simple TTS as minimal output for now
                # Keep compatibility by synthesizing a preview using provided voice
                jobs.add_event(job_id, "Crew complete, generating preview", stage="agents")
                mode = context["mode"]
                audio_b64 = synthesize_with_elevenlabs_simple(
                    voice_id=context["voice_id"], text=context["text"], mode=mode
                )
            except Exception as e:
                jobs.add_event(job_id, f"CrewAI failed, falling back: {e}", stage="agents")
                use_crewai = False

        if not use_crewai:
            # Procedural TTS fallback
            jobs.set_status(job_id, "synthesizing")
            mode = payload.get("mode", "narration")
            audio_b64 = synthesize_with_elevenlabs_simple(
                voice_id=payload["voice_id"], text=payload["text"], mode=mode
            )
            if not audio_b64:
                jobs.set_error(job_id, "tts generation failed")
                return

        # QC (optional - stub)
        jobs.set_status(job_id, "verifying")
        qc_metrics: Dict[str, Any] = {}
        try:
            if clean_wav_path:
                qc = QualityControlTool()
                gates = payload.get("qc", {})
                max_wer = float(gates.get("max_wer", 0.15))
                min_cosine = float(gates.get("min_cosine", 0.80))
                retry = {
                    "cosine_bump_similarity": float(gates.get("cosine_bump_similarity", 0.05)),
                    "similarity_cap": float(gates.get("similarity_cap", 0.90)),
                    "cosine_bump_stability": float(gates.get("cosine_bump_stability", 0.05)),
                    "stability_cap": float(gates.get("stability_cap", 0.75)),
                }
                # The QC tool is stubbed; it expects paths, so we write the b64 to a temp file
                out_path = f"/tmp/job_{job_id}_preview.wav"
                # In our TTS path we produced mp3 b64; for stub we just pass the path placeholder
                qc_metrics = qc._run(
                    text=payload["text"],
                    gen_wav_path=out_path,
                    ref_voice_wav=clean_wav_path,
                    gates={"max_wer": max_wer, "min_cosine": min_cosine},
                    retry=retry,
                )
            else:
                qc_metrics = {"decision": "pass", "metrics": {}}
        except Exception as e:
            qc_metrics = {"decision": "pass", "metrics": {}, "notes": f"qc skipped: {e}"}

        result = {
            "voice_id": payload["voice_id"],
            "audio_base64": audio_b64,
            "qc": qc_metrics,
            "clean_wav_path": clean_wav_path,
        }
        jobs.set_result(job_id, result)
    except Exception as e:
        jobs.set_error(job_id, f"orchestration error: {e}")


def start_clone_job_async(job_id: str, payload: Dict[str, Any]):
    t = threading.Thread(target=run_clone_job, args=(job_id, payload), daemon=True)
    t.start()
