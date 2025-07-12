# FamFlix Voice Synthesis Service

Advanced FastAPI-based voice synthesis service for the FamFlix platform using VITS models and async processing.

## Features

- **Real-time Voice Synthesis**: Convert text to speech using user's voice samples
- **Async Processing**: Background task processing with status tracking
- **Batch Processing**: Handle multiple synthesis requests simultaneously
- **Redis Integration**: Task management and caching
- **Quality Control**: Multiple quality levels (low, standard, high)
- **Voice Preservation**: Maintain accent and emotion characteristics
- **File Management**: Upload and manage voice samples
- **Health Monitoring**: Service health checks and status endpoints

## API Endpoints

### Core Synthesis
- `POST /synthesize` - Start voice synthesis task
- `GET /status/{task_id}` - Get task status and progress
- `POST /batch_synthesize` - Process multiple synthesis requests

### File Management
- `POST /upload_sample` - Upload voice sample files
- `GET /tasks` - List all active tasks
- `DELETE /tasks/{task_id}` - Delete task and output

### Health & Monitoring
- `GET /health` - Service health check

## Installation

```bash
cd voice_service
pip install -r requirements.txt
python main.py
```

## Integration with FamFlix

The service runs on port 8001 and integrates with the main FamFlix application for:
- Voice cloning for family members
- Story narration with personalized voices
- Real-time voice synthesis for interactive features

## Configuration

- **Port**: 8001 (configurable)
- **Redis**: localhost:6379 (optional, falls back to in-memory storage)
- **CORS**: Configured for FamFlix frontend integration
- **File Storage**: Local filesystem with organized directories

## Task Management

Tasks are tracked with comprehensive status including:
- Progress percentage
- Processing status (pending, processing, completed, failed)
- Output file paths
- Error handling and reporting
- Automatic cleanup and management