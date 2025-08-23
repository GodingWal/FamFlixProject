from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional, Literal, List, Dict, Any
import os
import json
import yaml
import base64

from ..crew import build_voice_crew
from . import jobs
from .orchestrator import start_clone_job_async

app = FastAPI(title="VoiceAgents API")


class DefaultsModel(BaseModel):
    stability: float = float(os.getenv("STABILITY_DEFAULT", "0.55"))
    dialogue_stability: float = float(os.getenv("DIALOGUE_STABILITY_DEFAULT", "0.35"))
    similarity_boost: float = float(os.getenv("SIMILARITY_DEFAULT", "0.7"))
    style: float = float(os.getenv("STYLE_DEFAULT", "0.0"))
    speed: float = float(os.getenv("SPEED_DEFAULT", "1.0"))


class GatesModel(BaseModel):
    max_wer: float = float(os.getenv("WER_THRESHOLD", "0.10"))
    min_cosine: float = float(os.getenv("COSINE_THRESHOLD", "0.85"))


class RetryCapsModel(BaseModel):
    cosine_bump_stability: float = float(os.getenv("COSINE_BUMP_STABILITY", "0.10"))
    cosine_bump_similarity: float = float(os.getenv("COSINE_BUMP_SIMILARITY", "0.10"))
    stability_cap: float = float(os.getenv("STABILITY_CAP", "0.75"))
    similarity_cap: float = float(os.getenv("SIMILARITY_CAP", "1.0"))


class TTSRequest(BaseModel):
    voice_id: str
    text: str
    mode: Literal["narration", "dialogue"] = "narration"
    raw_audio_path: Optional[str] = None
    defaults: DefaultsModel = DefaultsModel()
    gates: GatesModel = GatesModel()
    retry: RetryCapsModel = RetryCapsModel()
    consent: Optional[bool] = True


@app.get("/health")
def health():
    return {"status": "ok"}


# -----------------------------------------------------------------------------
# Voices listing (provider: ElevenLabs)

class VoiceInfo(BaseModel):
    id: str
    name: str
    category: Optional[str] = None
    preview_url: Optional[str] = None


def _load_elevenlabs_client():
    try:
        from elevenlabs.client import ElevenLabs  # type: ignore
    except Exception:
        return None
    api_key = os.getenv("ELEVEN_API_KEY") or os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        return None
    try:
        return ElevenLabs(api_key=api_key)
    except Exception:
        return None


def _synthesize_with_elevenlabs(req: "TTSRequest") -> Optional[str]:
    """Return MP3 audio as base64 string if ElevenLabs is configured, else None."""
    client = _load_elevenlabs_client()
    if client is None:
        return None
    try:
        # Import here to avoid hard dependency at module import time
        try:
            from elevenlabs import VoiceSettings  # type: ignore
        except Exception:
            VoiceSettings = None  # type: ignore

        voice_settings = None
        if VoiceSettings is not None:
            # Map our request defaults to ElevenLabs voice settings
            voice_settings = VoiceSettings(
                stability=float(req.defaults.dialogue_stability if req.mode == "dialogue" else req.defaults.stability),
                similarity_boost=float(req.defaults.similarity_boost),
                style=float(req.defaults.style),
                use_speaker_boost=True,
            )

        # Use ElevenLabs v1 client convert API; returns an iterator of bytes chunks
        chunks = client.text_to_speech.convert(
            voice_id=req.voice_id,
            model_id=os.getenv("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2"),
            text=req.text,
            voice_settings=voice_settings,
            output_format="mp3_44100_128",
        )

        # Concatenate chunks to a single bytes object
        audio_bytes = b"".join(chunk for chunk in chunks if chunk)
        if not audio_bytes:
            return None
        return base64.b64encode(audio_bytes).decode("ascii")
    except Exception:
        # On any failure, fall back to stub path
        return None


@app.get("/api/voices", response_model=List[VoiceInfo])
def list_voices(provider: str = "elevenlabs"):
    provider = provider.lower().strip()
    if provider != "elevenlabs":
        return []

    client = _load_elevenlabs_client()
    if client is None:
        # Development fallback list when SDK or API key is unavailable
        return [
            VoiceInfo(id="pNInz6obpgDQGcFmaJgB", name="Rachel", preview_url="/media/voices/rachel.wav"),
            VoiceInfo(id="21m00Tcm4TlvDq8ikWAM", name="Domi", preview_url="/media/voices/domi.wav"),
            VoiceInfo(id="EXAVITQu4vr4xnSDxMaL", name="Bella", preview_url="/media/voices/bella.wav"),
        ]

    try:
        result = client.voices.get_all()
        items: List[VoiceInfo] = []
        # result.voices can be a list of objects with attributes or dicts
        voices = getattr(result, "voices", []) or []
        for v in voices:
            if isinstance(v, dict):
                vid = v.get("voice_id") or v.get("voiceId") or v.get("id") or ""
                vname = v.get("name") or ""
                prev = v.get("preview_url") or v.get("previewUrl")
            else:
                vid = getattr(v, "voice_id", None) or getattr(v, "voiceId", None) or getattr(v, "id", "")
                vname = getattr(v, "name", "")
                prev = getattr(v, "preview_url", None) or getattr(v, "previewUrl", None)
            if vid and vname:
                items.append(VoiceInfo(id=str(vid), name=str(vname), preview_url=str(prev) if prev else None))
        return items
    except Exception:
        # On any error, return an empty list rather than 5xx to keep UI resilient
        return []


# -----------------------------------------------------------------------------
# Agents listing (reads YAML config if present)

class AgentInfo(BaseModel):
    key: str
    role: str
    goal: Optional[str] = None
    backstory: Optional[str] = None


@app.get("/api/agents", response_model=List[AgentInfo])
def list_agents():
    config_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config')
    agents_yml = os.path.join(config_dir, 'agents.yaml')
    agents: List[AgentInfo] = []
    if os.path.exists(agents_yml):
        try:
            with open(agents_yml, 'r') as f:
                data = yaml.safe_load(f) or {}
            if isinstance(data, dict):
                for key, spec in data.items():
                    role = (spec or {}).get('role') if isinstance(spec, dict) else None
                    goal = (spec or {}).get('goal') if isinstance(spec, dict) else None
                    backstory = (spec or {}).get('backstory') if isinstance(spec, dict) else None
                    if role:
                        agents.append(AgentInfo(key=str(key), role=str(role), goal=goal, backstory=backstory))
        except Exception:
            pass

    if not agents:
        # Fallback defaults matching crew composition
        agents = [
            AgentInfo(key="audio_engineer", role="Audio Engineer"),
            AgentInfo(key="synthesis_specialist", role="Synthesis Specialist"),
            AgentInfo(key="qc_listener", role="QC Listener"),
            AgentInfo(key="supervisor", role="Supervisor"),
        ]
    return agents


@app.post("/api/tts")
def synthesize(req: TTSRequest):
    # Build crew context (not executed by default to avoid heavy deps)
    context = {
        "raw_audio_path": req.raw_audio_path,
        "voice_id": req.voice_id,
        "text": req.text,
        "mode": req.mode,
        "defaults": req.defaults.model_dump(),
        "gates": req.gates.model_dump(),
        "retry": req.retry.model_dump(),
    }

    if os.getenv("CREWAI_RUN", "false").lower() == "true":
        crew = build_voice_crew(context)
        # Running the crew would require LLM configuration; defer for now
        # result = crew.kickoff()

    # Try real synthesis with ElevenLabs first
    audio_b64 = _synthesize_with_elevenlabs(req)
    used = req.defaults.dialogue_stability if req.mode == "dialogue" else req.defaults.stability
    if audio_b64:
        return {
            "gen_wav_path": None,
            "audio_base64": audio_b64,
            "settings_used": {
                "stability": used,
                "similarity_boost": req.defaults.similarity_boost,
                "style": req.defaults.style,
                "speed": req.defaults.speed,
            },
            "was_cached": False,
        }

    # Fallback stub response if ElevenLabs is not configured or fails
    return {
        "gen_wav_path": f"/media/tts/{req.voice_id}/stub.wav",
        "settings_used": {
            "stability": used,
            "similarity_boost": req.defaults.similarity_boost,
            "style": req.defaults.style,
            "speed": req.defaults.speed,
        },
        "was_cached": False,
    }



# -----------------------------------------------------------------------------
# Clone Pipeline (CrewAI Orchestrator)

class CloneLimits(BaseModel):
    max_text_length: int = 800
    daily_char_limit: Optional[int] = 20000


class CloneQC(BaseModel):
    max_wer: float = 0.15
    min_cosine: float = 0.80
    cosine_bump_similarity: float = 0.05
    similarity_cap: float = 0.90
    cosine_bump_stability: float = 0.05
    stability_cap: float = 0.75


class CloneStartRequest(BaseModel):
    # Minimal required fields
    text: str
    voice_id: str
    mode: Literal["narration", "dialogue"] = "narration"
    provider: Literal["elevenlabs"] = "elevenlabs"
    consent_flag: bool = True

    # Optional inputs for cloning/QC
    raw_audio_path: Optional[str] = None
    limits: CloneLimits = CloneLimits()
    qc: CloneQC = CloneQC()


@app.post("/api/clone/start")
def start_clone(req: CloneStartRequest):
    payload: Dict[str, Any] = req.model_dump()
    job = jobs.create_job(payload)
    jobs.add_event(job["id"], "Job created", stage="queued")
    start_clone_job_async(job["id"], payload)
    return {"jobId": job["id"], "status": job["status"]}


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    job = jobs.get_job(job_id)
    if not job:
        return {"error": "job not found"}
    return job

