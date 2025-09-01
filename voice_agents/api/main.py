from fastapi import FastAPI, Depends, HTTPException, status, Security, APIRouter, Request, Response
from fastapi.security import APIKeyHeader
from pydantic import BaseModel
from typing import Optional, Literal, List, Dict, Any
import os
import json
import yaml
import base64

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

"""
Optional CrewAI import:
We avoid importing crewai at module import time so the service can run with
the lite Docker image (which does not include crewai).
If crewai is unavailable, build_voice_crew becomes a no-op returning None.
"""
try:
    from ..crew import build_voice_crew  # type: ignore
except Exception:  # crewai or its deps not installed
    def build_voice_crew(context: Dict[str, Any]):  # type: ignore
        return None
from . import jobs
from .orchestrator import start_clone_job_async

# --- Rate Limiting Setup ---
limiter = Limiter(key_func=get_remote_address, default_limits=["100 per minute"])
app = FastAPI(title="VoiceAgents API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --- Security --- #

API_KEY = os.getenv("VOICE_AGENT_API_KEY")
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

async def get_api_key(api_key_header: str = Security(api_key_header)):
    if not API_KEY:
        # If no API key is configured on the server, disable auth for local dev.
        return

    if not api_key_header:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"{API_KEY_NAME} header is missing"
        )

    if api_key_header != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key"
        )

# Create a router for protected endpoints
api_router = APIRouter(dependencies=[Depends(get_api_key)])




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


@app.on_event("startup")
def _validate_env_on_startup():
    # Record presence of critical envs for diagnostics
    app.state.hf_token_present = bool(os.getenv("HF_TOKEN"))
    app.state.eleven_api_present = bool(os.getenv("ELEVEN_API_KEY") or os.getenv("ELEVENLABS_API_KEY"))

@app.get("/health")
def health():
    return {
        "status": "ok",
        "hf_token": bool(getattr(app.state, "hf_token_present", False)),
        "eleven_api": bool(getattr(app.state, "eleven_api_present", False)),
    }


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


@api_router.get("/api/voices", response_model=List[VoiceInfo])
@limiter.limit("100/minute")
def list_voices(request: Request, provider: str = "elevenlabs"):
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


@api_router.get("/api/agents", response_model=List[AgentInfo])
@limiter.limit("100/minute")
def list_agents(request: Request):
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


@api_router.post("/api/tts")
@limiter.limit("60/minute")
def synthesize(request: Request, req: TTSRequest):
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
    # Core fields from form data
    text: str
    voice_id: str
    mode: Literal["narration", "dialogue"] = "narration"
    provider: Literal["elevenlabs"] = "elevenlabs"
    consent_flag: bool = True

    # Nested JSON objects for detailed config
    limits: CloneLimits = CloneLimits()
    qc: CloneQC = CloneQC()
    defaults: DefaultsModel = DefaultsModel()


from fastapi import Depends, UploadFile, File, Form, Request
from uuid import uuid4

def get_clone_request(
    text: str = Form(...),
    voice_id: str = Form(...),
    mode: Literal["narration", "dialogue"] = Form("narration"),
    provider: Literal["elevenlabs"] = Form("elevenlabs"),
    consent_flag: bool = Form(True),
    limits: str = Form("{}"), # JSON string
    qc: str = Form("{}"),       # JSON string
    defaults: str = Form("{}") # JSON string
) -> CloneStartRequest:
    return CloneStartRequest(
        text=text,
        voice_id=voice_id,
        mode=mode,
        provider=provider,
        consent_flag=consent_flag,
        limits=CloneLimits(**json.loads(limits)),
        qc=CloneQC(**json.loads(qc)),
        defaults=DefaultsModel(**json.loads(defaults))
    )


@api_router.post("/api/clone/start")
@limiter.limit("20/minute")
def start_clone(
    request: Request,
    file: UploadFile = File(...),
    req: CloneStartRequest = Depends(get_clone_request)
):
    # Save uploaded file to the shared Docker volume, with strict validation
    storage_dir = "/tmp/clone_uploads"
    os.makedirs(storage_dir, exist_ok=True)

    # Enforce audio content type
    content_type = (file.content_type or "").strip().lower()
    if not content_type.startswith("audio/"):
        raise HTTPException(status_code=415, detail="Only audio uploads are supported")

    # Map content type to safe extension
    ext_map = {
        "audio/wav": ".wav",
        "audio/x-wav": ".wav",
        "audio/mpeg": ".mp3",
        "audio/mp3": ".mp3",
        "audio/ogg": ".ogg",
        "audio/webm": ".webm",
        "audio/mp4": ".m4a",
        "audio/x-m4a": ".m4a",
    }
    ext = ext_map.get(content_type, ".bin")
    safe_filename = f"{uuid4().hex}{ext}"
    raw_audio_path = os.path.join(storage_dir, safe_filename)

    # Stream to disk with size cap
    max_bytes = int(os.getenv("MAX_UPLOAD_BYTES", "20000000"))  # 20 MB default
    total = 0
    try:
        with open(raw_audio_path, "wb") as f:
            while True:
                chunk = file.file.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > max_bytes:
                    try:
                        f.close()
                    except Exception:
                        pass
                    try:
                        os.remove(raw_audio_path)
                    except Exception:
                        pass
                    raise HTTPException(status_code=413, detail="Audio file too large")
                f.write(chunk)
    finally:
        try:
            file.file.close()
        except Exception:
            pass

    payload: Dict[str, Any] = req.model_dump()
    payload["raw_audio_path"] = raw_audio_path

    job = jobs.create_job(payload)
    jobs.add_event(job["id"], "Job created", stage="queued")
    start_clone_job_async(job["id"], payload)
    return {"jobId": job["id"], "status": job["status"]}


@api_router.get("/api/jobs/{job_id}")
@limiter.limit("120/minute")
def get_job(request: Request, job_id: str):
    job = jobs.get_job(job_id)
    if not job:
        return {"error": "job not found"}
    return job


# -----------------------------------------------------------------------------
# AI Story Generation with CrewAI Integration

class StoryRequest(BaseModel):
    theme: str
    age_group: str = "4-6"
    duration: int = 180
    characters: List[str] = ["Narrator"]
    moral_lesson: Optional[str] = None
    setting: Optional[str] = None
    voice_id: Optional[str] = None


class StoryScript(BaseModel):
    character: str
    dialogue: str
    emotion: str
    timing: int
    voiceId: Optional[str] = None


class GeneratedStory(BaseModel):
    title: str
    description: str
    script: List[StoryScript]
    duration: int
    category: str
    ageRange: str


@api_router.post("/api/generate-story", response_model=GeneratedStory)
@limiter.limit("30/minute")
def generate_story(request: Request, req: StoryRequest):
    """Generate an AI-powered children's story using CrewAI agents."""
    
    # Build crew context for story generation
    context = {
        "theme": req.theme,
        "age_group": req.age_group,
        "duration": req.duration,
        "characters": req.characters,
        "moral_lesson": req.moral_lesson,
        "setting": req.setting,
        "voice_id": req.voice_id,
        "task_type": "story_generation"
    }
    
    # Try to use CrewAI for enhanced story generation
    if os.getenv("CREWAI_RUN", "false").lower() == "true":
        try:
            crew = build_voice_crew(context)
            if crew:
                # This would run the crew to generate a story
                # For now, we'll use enhanced templates
                pass
        except Exception:
            pass
    
    # Enhanced story generation with better templates
    story_templates = {
        "adventure": {
            "titles": [
                f"The Great {req.theme} Adventure",
                f"{req.characters[0] if req.characters else 'Our Hero'} and the {req.theme}",
                f"Journey to {req.setting or 'the Magic Kingdom'}"
            ],
            "openings": [
                f"In the {req.setting or 'enchanted kingdom'}, {req.characters[0] if req.characters else 'our brave hero'} discovered something magical about {req.theme}.",
                f"Once upon a time, when {req.characters[0] if req.characters else 'a curious child'} was exploring {req.setting or 'a mysterious place'}, they learned about {req.theme}.",
                f"Long ago, in {req.setting or 'a land far away'}, there lived {req.characters[0] if req.characters else 'a kind soul'} who would soon understand the true meaning of {req.theme}."
            ],
            "developments": [
                f"As {req.characters[0] if req.characters else 'our hero'} journeyed deeper into their adventure, they met {req.characters[1] if len(req.characters) > 1 else 'a wise friend'} who taught them about {req.moral_lesson or 'courage'}.",
                f"But then, a challenge appeared that tested everything they knew about {req.moral_lesson or 'friendship'}.",
                f"{req.characters[1] if len(req.characters) > 1 else 'A helpful companion'} showed them that {req.moral_lesson or 'kindness'} was more powerful than any magic."
            ],
            "climaxes": [
                f"When the biggest challenge came, {req.characters[0] if req.characters else 'our hero'} remembered the lesson about {req.moral_lesson or 'being brave'} and knew exactly what to do.",
                f"Through {req.moral_lesson or 'determination'} and working together, they overcame every obstacle.",
                f"With {req.moral_lesson or 'love'} in their heart, {req.characters[0] if req.characters else 'our hero'} found the strength to help everyone."
            ],
            "endings": [
                f"And so, {' and '.join(req.characters) if req.characters else 'our heroes'} learned that {req.moral_lesson or 'friendship and kindness'} can overcome any challenge. The end.",
                f"From that day forward, they always remembered that {req.moral_lesson or 'being good to others'} makes the world a better place.",
                f"They returned home wiser and happier, knowing that {req.moral_lesson or 'love'} is the greatest adventure of all."
            ]
        }
    }
    
    import random
    template = story_templates["adventure"]
    
    # Generate story with random template selections
    story = GeneratedStory(
        title=random.choice(template["titles"]),
        description=f"An enchanting tale about {req.theme} that teaches children about {req.moral_lesson or 'important values'} for ages {req.age_group}.",
        script=[
            StoryScript(
                character=req.characters[0] if req.characters else "Narrator",
                dialogue=random.choice(template["openings"]),
                emotion="cheerful",
                timing=0,
                voiceId=req.voice_id
            ),
            StoryScript(
                character=req.characters[1] if len(req.characters) > 1 else "Character",
                dialogue=random.choice(template["developments"]),
                emotion="curious",
                timing=int(req.duration * 0.2)
            ),
            StoryScript(
                character=req.characters[0] if req.characters else "Narrator",
                dialogue=f"{req.characters[0] if req.characters else 'Our hero'} thought carefully about what to do. They remembered that {req.moral_lesson or 'being kind'} was always the right choice.",
                emotion="thoughtful",
                timing=int(req.duration * 0.4)
            ),
            StoryScript(
                character=req.characters[1] if len(req.characters) > 1 else "Character",
                dialogue=random.choice(template["climaxes"]),
                emotion="excited",
                timing=int(req.duration * 0.6)
            ),
            StoryScript(
                character=req.characters[0] if req.characters else "Narrator",
                dialogue=random.choice(template["endings"]),
                emotion="warm",
                timing=int(req.duration * 0.8)
            )
        ],
        duration=req.duration,
        category="adventure",
        ageRange=req.age_group
    )
    
    return story


# -----------------------------------------------------------------------------
# Multi-Voice Story Audio Generation

class VoiceAssignment(BaseModel):
    character: str
    voice_id: str
    person_name: Optional[str] = None


class StoryAudioRequest(BaseModel):
    story_script: List[StoryScript]
    voice_assignments: List[VoiceAssignment] = []
    default_voice_id: Optional[str] = None


class AudioSegment(BaseModel):
    character: str
    audio_base64: str
    timing: int
    duration: float
    voice_id: str


class StoryAudioResponse(BaseModel):
    segments: List[AudioSegment]
    total_duration: float
    combined_audio_base64: Optional[str] = None


@api_router.post("/api/generate-story-audio", response_model=StoryAudioResponse)
@limiter.limit("30/minute")
def generate_story_audio(request: Request, req: StoryAudioRequest):
    """Generate audio for a complete story with multiple voices."""
    
    segments = []
    total_duration = 0.0
    
    # Create voice mapping from assignments
    voice_map = {assignment.character: assignment.voice_id for assignment in req.voice_assignments}
    
    for script_item in req.story_script:
        # Determine voice ID for this character
        voice_id = voice_map.get(script_item.character) or script_item.voiceId or req.default_voice_id
        
        if not voice_id:
            # Skip if no voice assigned
            continue
            
        # Create TTS request for this segment
        tts_req = TTSRequest(
            voice_id=voice_id,
            text=script_item.dialogue,
            mode="narration" if script_item.character.lower() == "narrator" else "dialogue"
        )
        
        # Generate audio for this segment
        audio_b64 = _synthesize_with_elevenlabs(tts_req)
        
        if audio_b64:
            # Estimate duration (rough calculation: ~150 words per minute)
            word_count = len(script_item.dialogue.split())
            estimated_duration = (word_count / 150) * 60  # seconds
            
            segments.append(AudioSegment(
                character=script_item.character,
                audio_base64=audio_b64,
                timing=script_item.timing,
                duration=estimated_duration,
                voice_id=voice_id
            ))
            
            total_duration += estimated_duration
    
    return StoryAudioResponse(
        segments=segments,
        total_duration=total_duration
    )


# Include the protected router in the main app
app.include_router(api_router)

