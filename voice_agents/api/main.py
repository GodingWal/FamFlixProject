from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional, Literal, List, Dict, Any
import os
import json
import yaml

from ..crew import build_voice_crew

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

    # Stub response that matches Synthesis Specialist output schema
    used = req.defaults.dialogue_stability if req.mode == "dialogue" else req.defaults.stability
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


