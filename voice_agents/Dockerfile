# syntax=docker/dockerfile:1
FROM python:3.11-slim

# Environment
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# System deps (ffmpeg for audio I/O; keep image small)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install minimal Python deps for API + ElevenLabs (no heavy ML libs)
COPY voice_agents/requirements.lite.txt /tmp/requirements.txt
RUN pip install --upgrade pip \
    && pip install -r /tmp/requirements.txt

# Copy source
COPY voice_agents /app/voice_agents

EXPOSE 8001

# Run FastAPI via Uvicorn
CMD ["uvicorn", "voice_agents.api.main:app", "--host", "0.0.0.0", "--port", "8001"]
