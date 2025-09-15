from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from models import get_db, Job, JobStatus
from typing import Optional
from datetime import datetime, timedelta
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("")
async def list_jobs(
    status: Optional[str] = Query(None),
    include_completed: bool = Query(True),
    db: Session = Depends(get_db)
):
    query = db.query(Job)
    
    if status:
        query = query.filter(Job.status == JobStatus[status.upper()])
    elif not include_completed:
        # Only show active jobs
        query = query.filter(Job.status.in_([JobStatus.PENDING, JobStatus.RUNNING]))
    else:
        # Show active jobs and recently completed ones (last 24 hours)
        cutoff_time = datetime.utcnow() - timedelta(hours=24)
        query = query.filter(
            (Job.status.in_([JobStatus.PENDING, JobStatus.RUNNING])) |
            (Job.created_at >= cutoff_time)
        )
    
    jobs = query.order_by(desc(Job.created_at)).limit(50).all()
    
    return [{
        "id": job.id,
        "type": job.type.value if hasattr(job.type, 'value') else job.type,
        "status": job.status.value if hasattr(job.status, 'value') else job.status,
        "progress": job.progress,
        "total_items": job.total_items,
        "processed_items": job.processed_items,
        "error_message": job.error_message,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "payload": job.payload
    } for job in jobs]

@router.get("/{job_id}")
async def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {
        "id": job.id,
        "type": job.type.value if hasattr(job.type, 'value') else job.type,
        "status": job.status.value if hasattr(job.status, 'value') else job.status,
        "progress": job.progress,
        "total_items": job.total_items,
        "processed_items": job.processed_items,
        "error_message": job.error_message,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None
    }

@router.post("/{job_id}/cancel")
async def cancel_job(job_id: int, db: Session = Depends(get_db)):
    """Cancel a running or pending job"""
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status not in [JobStatus.PENDING, JobStatus.RUNNING]:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot cancel job with status {job.status.value}"
        )
    
    # Mark job as failed with cancellation message
    job.status = JobStatus.FAILED
    job.error_message = "Job cancelled by user"
    job.completed_at = datetime.utcnow()
    
    db.commit()
    
    logger.info(f"Job {job_id} cancelled by user")
    
    return {"message": "Job cancelled successfully", "job_id": job_id}