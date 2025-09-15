#!/usr/bin/env python3
import os
import sys
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Photo, Thumbnail, Job, JobType, JobStatus
from services.thumbnail_service import ThumbnailService
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def regenerate_missing_thumbnails():
    # Create database connection
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://photouser:photopass@localhost:5432/photos")
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Create a job record for tracking
        job = Job(
            type=JobType.THUMBNAIL_GENERATION,
            status=JobStatus.RUNNING,
            started_at=datetime.utcnow(),
            payload={"action": "regenerate_missing"}
        )
        db.add(job)
        db.commit()
        
        # Get all photos
        photos = db.query(Photo).all()
        logger.info(f"Found {len(photos)} photos")
        
        job.total_items = len(photos)
        db.commit()
        
        # Initialize thumbnail service
        thumbnail_service = ThumbnailService(db)
        
        missing_count = 0
        regenerated = 0
        processed = 0
        
        for photo in photos:
            processed += 1
            
            # Update job with current file
            if not job.payload:
                job.payload = {}
            job.payload['current_file'] = photo.filename
            
            # Check if thumbnails exist for all sizes
            for size in ['150', '400', '1200']:
                thumb = db.query(Thumbnail).filter(
                    Thumbnail.photo_id == photo.id,
                    Thumbnail.size == size
                ).first()
                
                if not thumb:
                    missing_count += 1
                    logger.info(f"Missing {size} thumbnail for photo {photo.id}: {photo.filename}")
                    
            # Regenerate thumbnails if any are missing
            existing_thumbs = db.query(Thumbnail).filter(Thumbnail.photo_id == photo.id).count()
            if existing_thumbs < 3:  # Should have 3 sizes
                logger.info(f"Regenerating thumbnails for photo {photo.id}: {photo.filename}")
                thumbnail_service.generate_thumbnails(photo.id)
                regenerated += 1
            
            # Update job progress periodically
            if processed % 10 == 0:
                job.processed_items = processed
                job.progress = (processed / len(photos)) * 100
                db.commit()
                logger.info(f"Progress: {processed}/{len(photos)} photos processed")
            else:
                # Update current file more frequently
                db.flush()
        
        # Mark job as completed
        job.status = JobStatus.COMPLETED
        job.completed_at = datetime.utcnow()
        job.processed_items = processed
        job.progress = 100
        job.result = {"missing_count": missing_count, "regenerated": regenerated}
        db.commit()
        
        logger.info(f"Missing thumbnails: {missing_count}")
        logger.info(f"Regenerated thumbnails for {regenerated} photos")
        
    except Exception as e:
        logger.error(f"Error during regeneration: {str(e)}")
        if 'job' in locals():
            job.status = JobStatus.FAILED
            job.error_message = str(e)
            job.completed_at = datetime.utcnow()
            db.commit()
        raise
        
    finally:
        db.close()

if __name__ == "__main__":
    regenerate_missing_thumbnails()