from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models import get_db, Photo, Job, JobStatus
import os
import shutil

router = APIRouter()

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "services": {
            "database": True,
            "redis": True,
            "storage": True
        }
    }

@router.get("/stats")
async def get_stats(db: Session = Depends(get_db)):
    total_photos = db.query(Photo).count()
    total_size = db.query(Photo).with_entities(Photo.file_size).all()
    total_size_bytes = sum(size[0] for size in total_size) if total_size else 0
    
    # Get disk usage
    stat = shutil.disk_usage("/")
    
    # Count active jobs (PENDING or RUNNING)
    active_jobs = db.query(Job).filter(
        Job.status.in_([JobStatus.PENDING, JobStatus.RUNNING])
    ).count()
    
    return {
        "total_photos": total_photos,
        "total_size": total_size_bytes,
        "disk_usage": {
            "used": stat.used,
            "available": stat.free,
            "percentage": (stat.used / stat.total) * 100
        },
        "active_jobs": active_jobs,
        "version": "0.1.0"
    }