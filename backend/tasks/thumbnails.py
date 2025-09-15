import os
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Tuple
from datetime import datetime
from celery import Task
from worker import celery_app
from sqlalchemy.orm import Session
from models import get_db, Photo, Job, JobType, JobStatus, Thumbnail
from PIL import Image
import pillow_heif

# Register HEIF opener
pillow_heif.register_heif_opener()

logger = logging.getLogger(__name__)

# Configuration - Reduced concurrency to prioritize user requests
MAX_THUMBNAIL_WORKERS = int(os.getenv('MAX_THUMBNAIL_WORKERS', '4'))  # Reduced from 8
THUMBNAIL_BATCH_SIZE = int(os.getenv('THUMBNAIL_BATCH_SIZE', '40'))  # Reduced from 80
DB_COMMIT_BATCH_SIZE = int(os.getenv('DB_COMMIT_BATCH_SIZE', '10'))
PROGRESS_UPDATE_INTERVAL = int(os.getenv('PROGRESS_UPDATE_INTERVAL', '5'))

class ThumbnailWorker:
    """Worker class for generating thumbnails in parallel"""
    
    def __init__(self, thumbnails_path: str = None):
        self.thumbnails_path = thumbnails_path or os.getenv("THUMBNAILS_PATH", "/app/thumbnails")
        self.sizes = {
            '150': (150, 150),
            '400': (400, 400),
            '1200': (1200, 1200)
        }
        os.makedirs(self.thumbnails_path, exist_ok=True)
    
    def process_photo(self, photo_data: Tuple[int, str], user_rotation: int = 0) -> Dict:
        """Process a single photo and generate all thumbnail sizes"""
        if len(photo_data) == 3:
            photo_id, filepath, user_rotation = photo_data
        else:
            photo_id, filepath = photo_data
            user_rotation = 0
            
        result = {
            'photo_id': photo_id,
            'success': False,
            'thumbnails': {},
            'error': None
        }
        
        try:
            # Open and process the image
            from PIL import ImageOps
            with Image.open(filepath) as img:
                # Apply EXIF orientation if present
                try:
                    img = ImageOps.exif_transpose(img) or img
                except Exception:
                    # If EXIF transpose fails, continue with original
                    pass
                
                # Apply user rotation if present
                if user_rotation and user_rotation != 0:
                    # Rotate the image (negative because PIL rotates counter-clockwise)
                    img = img.rotate(-user_rotation, expand=True)
                # Convert RGBA to RGB if necessary
                if img.mode in ('RGBA', 'LA'):
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                    img = background
                elif img.mode not in ('RGB', 'L'):
                    img = img.convert('RGB')
                
                # Generate each thumbnail size
                for size_name, dimensions in self.sizes.items():
                    thumbnail = img.copy()
                    # Use high-quality resampling
                    thumbnail.thumbnail(dimensions, Image.Resampling.LANCZOS)
                    
                    # Get rotation version from database
                    from models import get_db, Photo
                    db = next(get_db())
                    photo = db.query(Photo).filter(Photo.id == photo_id).first()
                    rotation_version = photo.rotation_version if photo else 0
                    db.close()
                    
                    # Save thumbnail with versioned naming
                    filename = f"{photo_id}_{size_name}_v{rotation_version}.jpg"
                    filepath = os.path.join(self.thumbnails_path, filename)
                    # Increase quality to 95 for better appearance
                    thumbnail.save(filepath, 'JPEG', quality=95, optimize=True, progressive=True)
                    
                    result['thumbnails'][size_name] = {
                        'filepath': filepath,
                        'file_size': os.path.getsize(filepath),
                        'width': thumbnail.width,
                        'height': thumbnail.height
                    }
                
                result['success'] = True
                
        except Exception as e:
            result['error'] = str(e)
            logger.error(f"Error processing photo {photo_id}: {e}")
        
        return result

@celery_app.task(bind=True, name='tasks.process_thumbnail_batch', priority=1)  # Low priority
def process_thumbnail_batch(self: Task, photo_ids: List[int], job_id: int = None, 
                           batch_index: int = 0, total_photos: int = None):
    """
    Process a batch of photos to generate thumbnails in parallel
    
    Args:
        photo_ids: List of photo IDs to process
        job_id: Optional job ID for progress tracking
        batch_index: Index of this batch for progress calculation
        total_photos: Total number of photos across all batches
    """
    db = next(get_db())
    
    try:
        # Update job status if provided
        job = None
        if job_id:
            job = db.query(Job).filter(Job.id == job_id).first()
            if job:
                # Only update to RUNNING if still PENDING (first batch)
                if job.status == JobStatus.PENDING:
                    job.status = JobStatus.RUNNING
                    job.started_at = datetime.utcnow()
                # Don't override total_items, it was set by scanner
                if not job.total_items and total_photos:
                    job.total_items = total_photos
                db.commit()
        
        # Fetch photo data including user_rotation
        photos = db.query(Photo.id, Photo.filepath, Photo.user_rotation).filter(
            Photo.id.in_(photo_ids)
        ).all()
        
        if not photos:
            logger.warning(f"No photos found for IDs: {photo_ids}")
            return {'processed': 0, 'failed': 0}
        
        # Initialize worker and results
        worker = ThumbnailWorker()
        processed = 0
        failed = 0
        results_buffer = []
        
        # Add delay to reduce CPU load and prioritize user requests
        import time
        time.sleep(0.5)  # 500ms delay between batches to prioritize UI
        
        # Process photos in parallel
        with ThreadPoolExecutor(max_workers=MAX_THUMBNAIL_WORKERS) as executor:
            # Submit all tasks - pass all three values (id, filepath, user_rotation)
            future_to_photo = {
                executor.submit(worker.process_photo, photo): photo[0]
                for photo in photos
            }
            
            # Process completed tasks
            for future in as_completed(future_to_photo):
                photo_id = future_to_photo[future]
                
                try:
                    result = future.result()
                    
                    if result['success']:
                        # Save thumbnail records
                        for size_name, thumb_data in result['thumbnails'].items():
                            # Check if thumbnail exists
                            existing = db.query(Thumbnail).filter(
                                Thumbnail.photo_id == photo_id,
                                Thumbnail.size == size_name,
                                Thumbnail.format == 'jpeg'
                            ).first()
                            
                            if existing:
                                # Update existing
                                existing.filepath = thumb_data['filepath']
                                existing.file_size = thumb_data['file_size']
                                existing.width = thumb_data['width']
                                existing.height = thumb_data['height']
                            else:
                                # Create new
                                thumb_record = Thumbnail(
                                    photo_id=photo_id,
                                    size=size_name,
                                    format='jpeg',
                                    filepath=thumb_data['filepath'],
                                    file_size=thumb_data['file_size'],
                                    width=thumb_data['width'],
                                    height=thumb_data['height']
                                )
                                db.add(thumb_record)
                        
                        processed += 1
                        results_buffer.append(photo_id)
                        
                    else:
                        failed += 1
                        logger.error(f"Failed to process photo {photo_id}: {result['error']}")
                    
                    # Batch commit to database
                    if len(results_buffer) >= DB_COMMIT_BATCH_SIZE:
                        db.commit()
                        results_buffer.clear()
                    
                    # Update job progress (accumulate across all batches)
                    if job and (processed + failed) % PROGRESS_UPDATE_INTERVAL == 0:
                        # Refresh job to get current state
                        job = db.query(Job).filter(Job.id == job_id).first()
                        # Increment processed items
                        job.processed_items = (job.processed_items or 0) + PROGRESS_UPDATE_INTERVAL
                        # Calculate progress based on total photos
                        if job.total_items:
                            job.progress = (job.processed_items / job.total_items) * 100
                        if job.payload is None:
                            job.payload = {}
                        job.payload['workers'] = MAX_THUMBNAIL_WORKERS
                        job.payload['processed'] = processed
                        job.payload['failed'] = failed
                        job.payload['photo_count'] = len(photos)
                        db.commit()
                    
                except Exception as e:
                    failed += 1
                    logger.error(f"Error processing result for photo {photo_id}: {e}")
        
        # Final commit
        if results_buffer:
            db.commit()
        
        # Update job completion
        if job:
            # Refresh job to get current state
            job = db.query(Job).filter(Job.id == job_id).first()
            # Add any remaining items not yet counted
            remaining = (processed + failed) % PROGRESS_UPDATE_INTERVAL
            if remaining > 0:
                job.processed_items = (job.processed_items or 0) + remaining
            
            # Check if all photos are processed
            if job.total_items and job.processed_items and job.processed_items >= job.total_items:
                job.status = JobStatus.COMPLETED
                job.completed_at = datetime.utcnow()
                job.progress = 100
            elif job.total_items and job.processed_items:
                # Still more batches to process
                job.progress = (job.processed_items / job.total_items) * 100
            else:
                # No total items set, can't calculate progress accurately
                job.progress = 0
            
            if job.payload is None:
                job.payload = {}
            job.payload['workers'] = MAX_THUMBNAIL_WORKERS
            db.commit()
        
        logger.info(f"Thumbnail batch completed: {processed} processed, {failed} failed")
        
        return {
            'processed': processed,
            'failed': failed,
            'total': len(photos)
        }
        
    except Exception as e:
        logger.error(f"Error in thumbnail batch processing: {e}")
        if job:
            job.status = JobStatus.FAILED
            job.error_message = str(e)
            job.completed_at = datetime.utcnow()
            db.commit()
        raise
    finally:
        db.close()

@celery_app.task(name='tasks.generate_photo_thumbnails')
def generate_photo_thumbnails(photo_id: int):
    """Generate thumbnails for a single photo"""
    return process_thumbnail_batch([photo_id])

@celery_app.task(name='tasks.regenerate_photo_thumbnails', priority=5)  # Higher priority for single photo
def regenerate_photo_thumbnails(photo_id: int):
    """Regenerate thumbnails for a single photo with rotation applied"""
    from services.thumbnail_service import ThumbnailService
    db = next(get_db())
    
    try:
        photo = db.query(Photo).filter(Photo.id == photo_id).first()
        if not photo:
            return {'error': f'Photo {photo_id} not found'}
        
        # Generate new thumbnails with rotation (will overwrite existing)
        service = ThumbnailService(db)
        generated = service.generate_thumbnails(photo_id, apply_rotation=True)
        
        total_rotation = (photo.rotation_applied + photo.user_rotation) % 360
        
        return {
            'success': True, 
            'photo_id': photo_id, 
            'rotation': total_rotation,
            'thumbnails': list(generated.keys())
        }
        
    except Exception as e:
        logger.error(f"Error regenerating thumbnails for photo {photo_id}: {e}")
        return {'error': str(e)}
    finally:
        db.close()

@celery_app.task(name='tasks.regenerate_all_thumbnails', priority=0)  # Lowest priority
def regenerate_all_thumbnails(force: bool = False):
    """Regenerate thumbnails for all photos - overwrites existing without deleting first"""
    db = next(get_db())
    
    try:
        # Create a job for tracking
        job = Job(
            type=JobType.THUMBNAIL_GENERATION,
            status=JobStatus.PENDING,
            payload={'force': force, 'workers': MAX_THUMBNAIL_WORKERS, 'regenerate': True}
        )
        db.add(job)
        db.commit()
        
        # Get all photo IDs
        if force:
            photo_ids = [p[0] for p in db.query(Photo.id).all()]
        else:
            # Only photos without thumbnails
            photo_ids = [p[0] for p in db.query(Photo.id).outerjoin(Thumbnail).filter(
                Thumbnail.id == None
            ).all()]
        
        if not photo_ids:
            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.utcnow()
            job.payload['message'] = "No photos to process"
            db.commit()
            return {'message': 'No photos to process'}
        
        # Set total items for proper progress tracking
        job.total_items = len(photo_ids)
        job.processed_items = 0
        db.commit()
        
        # Process in smaller batches with lower priority
        batch_index = 0
        for i in range(0, len(photo_ids), THUMBNAIL_BATCH_SIZE):
            batch = photo_ids[i:i + THUMBNAIL_BATCH_SIZE]
            # Use apply_async with priority
            process_thumbnail_batch.apply_async(
                args=[batch, job.id, batch_index, len(photo_ids)],
                priority=0  # Lowest priority
            )
            batch_index += 1
        
        return {
            'job_id': job.id,
            'total_photos': len(photo_ids),
            'batches': (len(photo_ids) + THUMBNAIL_BATCH_SIZE - 1) // THUMBNAIL_BATCH_SIZE
        }
        
    finally:
        db.close()