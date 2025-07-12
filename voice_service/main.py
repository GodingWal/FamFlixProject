from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import librosa
import numpy as np
import torch
import asyncio
import aiofiles
import os
from pathlib import Path
import hashlib
import json
from typing import List, Optional
from datetime import datetime
import redis
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="FamFlix Voice Synthesis Service", version="1.0.0")

# Configure CORS for FamFlix integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis connection for task management
try:
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    redis_client.ping()
    logger.info("Redis connected successfully")
except:
    logger.warning("Redis not available - using in-memory task storage")
    redis_client = None

# Ensure required directories exist
Path("samples").mkdir(exist_ok=True)
Path("output").mkdir(exist_ok=True)
Path("models").mkdir(exist_ok=True)

class VoiceRequest(BaseModel):
    text: str
    voice_sample: str  # Path to sample or base64 data
    quality: Optional[str] = "standard"  # low, standard, high
    preserve_accent: Optional[bool] = True
    preserve_emotion: Optional[bool] = True

class VoiceSynthesisStatus(BaseModel):
    task_id: str
    status: str  # pending, processing, completed, failed
    progress: Optional[int] = 0
    output_path: Optional[str] = None
    error: Optional[str] = None
    created_at: datetime

class BatchVoiceRequest(BaseModel):
    requests: List[VoiceRequest]
    batch_name: Optional[str] = None

# In-memory task storage when Redis is not available
task_storage = {}

def generate_task_id(text: str, voice_sample: str) -> str:
    """Generate unique task ID based on content"""
    content = f"{text}:{voice_sample}:{datetime.now().isoformat()}"
    return hashlib.sha256(content.encode()).hexdigest()[:16]

def store_task_status(task_id: str, status: VoiceSynthesisStatus):
    """Store task status in Redis or memory"""
    if redis_client:
        try:
            redis_client.setex(f"task:{task_id}", 3600, status.model_dump_json())
        except:
            task_storage[task_id] = status
    else:
        task_storage[task_id] = status

def get_task_status(task_id: str) -> Optional[VoiceSynthesisStatus]:
    """Get task status from Redis or memory"""
    if redis_client:
        try:
            data = redis_client.get(f"task:{task_id}")
            if data:
                return VoiceSynthesisStatus.model_validate_json(data)
        except:
            pass
    
    if task_id in task_storage:
        return task_storage[task_id]
    return None

async def synthesize_voice_async(task_id: str, text: str, voice_sample: str, quality: str = "standard"):
    """Async voice synthesis function"""
    try:
        # Update status to processing
        status = VoiceSynthesisStatus(
            task_id=task_id,
            status="processing",
            progress=10,
            created_at=datetime.now()
        )
        store_task_status(task_id, status)
        
        # Simulate voice synthesis processing (replace with actual VITS implementation)
        logger.info(f"Starting voice synthesis for task {task_id}")
        
        # Progress updates
        for progress in [25, 50, 75, 90]:
            await asyncio.sleep(0.5)  # Simulate processing time
            status.progress = progress
            store_task_status(task_id, status)
        
        # Generate output path
        output_filename = f"{task_id}.wav"
        output_path = f"output/{output_filename}"
        
        # Simulate audio generation (replace with actual VITS synthesis)
        # For demo purposes, create a placeholder audio file
        sample_rate = 22050
        duration = len(text.split()) * 0.5  # Estimate duration
        dummy_audio = np.random.randn(int(sample_rate * duration)) * 0.1
        
        # Save audio file (in real implementation, this would be the synthesized audio)
        async with aiofiles.open(output_path, 'wb') as f:
            # Convert numpy array to bytes (simplified for demo)
            audio_bytes = (dummy_audio * 32767).astype(np.int16).tobytes()
            await f.write(audio_bytes)
        
        # Update status to completed
        status.status = "completed"
        status.progress = 100
        status.output_path = output_path
        store_task_status(task_id, status)
        
        logger.info(f"Voice synthesis completed for task {task_id}")
        
    except Exception as e:
        logger.error(f"Voice synthesis failed for task {task_id}: {str(e)}")
        status = VoiceSynthesisStatus(
            task_id=task_id,
            status="failed",
            error=str(e),
            created_at=datetime.now()
        )
        store_task_status(task_id, status)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "FamFlix Voice Synthesis",
        "version": "1.0.0",
        "redis_connected": redis_client is not None,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/synthesize")
async def synthesize(request: VoiceRequest, background_tasks: BackgroundTasks):
    """Start voice synthesis task"""
    try:
        task_id = generate_task_id(request.text, request.voice_sample)
        
        # Initialize task status
        status = VoiceSynthesisStatus(
            task_id=task_id,
            status="pending",
            progress=0,
            created_at=datetime.now()
        )
        store_task_status(task_id, status)
        
        # Start background synthesis
        background_tasks.add_task(
            synthesize_voice_async,
            task_id,
            request.text,
            request.voice_sample,
            request.quality
        )
        
        return {
            "task_id": task_id,
            "status": "pending",
            "message": "Voice synthesis started"
        }
        
    except Exception as e:
        logger.error(f"Failed to start synthesis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/status/{task_id}")
async def get_status(task_id: str):
    """Get synthesis task status"""
    status = get_task_status(task_id)
    if not status:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return status.model_dump()

@app.post("/upload_sample")
async def upload_sample(file: UploadFile = File(...)):
    """Upload voice sample file"""
    try:
        # Validate file type
        if not file.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="File must be an audio file")
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{file.filename}"
        file_path = f"samples/{filename}"
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        logger.info(f"Voice sample uploaded: {file_path}")
        
        return {
            "filename": filename,
            "path": file_path,
            "size": len(content),
            "content_type": file.content_type
        }
        
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/batch_synthesize")
async def batch_synthesize(batch_request: BatchVoiceRequest, background_tasks: BackgroundTasks):
    """Start batch voice synthesis"""
    try:
        task_ids = []
        
        for i, request in enumerate(batch_request.requests):
            task_id = generate_task_id(f"{request.text}_{i}", request.voice_sample)
            task_ids.append(task_id)
            
            # Initialize task status
            status = VoiceSynthesisStatus(
                task_id=task_id,
                status="pending",
                progress=0,
                created_at=datetime.now()
            )
            store_task_status(task_id, status)
            
            # Start background synthesis
            background_tasks.add_task(
                synthesize_voice_async,
                task_id,
                request.text,
                request.voice_sample,
                request.quality or "standard"
            )
        
        return {
            "batch_name": batch_request.batch_name or f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "task_ids": task_ids,
            "total_tasks": len(task_ids),
            "status": "started"
        }
        
    except Exception as e:
        logger.error(f"Batch synthesis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tasks")
async def list_tasks():
    """List all active tasks"""
    tasks = []
    
    if redis_client:
        try:
            keys = redis_client.keys("task:*")
            for key in keys:
                data = redis_client.get(key)
                if data:
                    task = VoiceSynthesisStatus.model_validate_json(data)
                    tasks.append(task.model_dump())
        except:
            pass
    
    # Include in-memory tasks
    for task_id, status in task_storage.items():
        tasks.append(status.model_dump())
    
    return {"tasks": tasks, "total": len(tasks)}

@app.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    """Delete a task and its output"""
    status = get_task_status(task_id)
    if not status:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Delete output file if exists
    if status.output_path and os.path.exists(status.output_path):
        os.remove(status.output_path)
    
    # Delete from storage
    if redis_client:
        try:
            redis_client.delete(f"task:{task_id}")
        except:
            pass
    
    if task_id in task_storage:
        del task_storage[task_id]
    
    return {"message": "Task deleted successfully"}

if __name__ == "__main__":
    logger.info("Starting FamFlix Voice Synthesis Service...")
    try:
        uvicorn.run(
            app, 
            host="0.0.0.0", 
            port=8001,  # Different port from main FamFlix server
            log_level="info"
        )
    except Exception as e:
        logger.error(f"Failed to start voice service: {e}")
        raise