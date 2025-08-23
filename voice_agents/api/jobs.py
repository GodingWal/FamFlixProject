import os
import json
import threading
from typing import Dict, Any, Optional
from uuid import uuid4
from datetime import datetime

_STATE_DIR = os.path.join(os.path.dirname(__file__), "..", ".state", "jobs")
_STATE_DIR = os.path.abspath(_STATE_DIR)
_lock = threading.Lock()
_jobs: Dict[str, Dict[str, Any]] = {}


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _job_path(job_id: str) -> str:
    return os.path.join(_STATE_DIR, f"{job_id}.json")


def _ensure_state_dir():
    os.makedirs(_STATE_DIR, exist_ok=True)


def create_job(payload: Dict[str, Any]) -> Dict[str, Any]:
    _ensure_state_dir()
    job_id = uuid4().hex
    job = {
        "id": job_id,
        "status": "queued",
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
        "payload": payload,
        "artifacts": {},
        "events": [],
        "error": None,
        "result": None,
    }
    with _lock:
        _jobs[job_id] = job
        _persist(job)
    return job


def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    with _lock:
        job = _jobs.get(job_id)
    if job:
        return job
    # Try disk
    path = _job_path(job_id)
    if os.path.exists(path):
        try:
            with open(path, "r") as f:
                job = json.load(f)
            with _lock:
                _jobs[job_id] = job
            return job
        except Exception:
            return None
    return None


def update_job(job_id: str, **updates) -> Optional[Dict[str, Any]]:
    with _lock:
        job = _jobs.get(job_id)
        if not job:
            return None
        job.update(updates)
        job["updated_at"] = _now_iso()
        _persist(job)
        return job


def add_event(job_id: str, message: str, stage: Optional[str] = None, data: Optional[Dict[str, Any]] = None):
    with _lock:
        job = _jobs.get(job_id)
        if not job:
            return
        event = {"time": _now_iso(), "message": message}
        if stage:
            event["stage"] = stage
        if data is not None:
            event["data"] = data
        job["events"].append(event)
        _persist(job)


def set_status(job_id: str, status: str):
    update_job(job_id, status=status)


def set_error(job_id: str, error: str):
    update_job(job_id, status="failed", error=error)


def set_result(job_id: str, result: Dict[str, Any]):
    update_job(job_id, status="completed", result=result)


def _persist(job: Dict[str, Any]):
    _ensure_state_dir()
    path = _job_path(job["id"])
    tmp_path = path + ".tmp"
    with open(tmp_path, "w") as f:
        json.dump(job, f, indent=2)
    os.replace(tmp_path, path)
