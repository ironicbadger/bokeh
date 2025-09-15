import os
import hashlib
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from models import Photo, Job, JobType, JobStatus, Folder
from PIL import Image
from PIL.ExifTags import TAGS
import magic
from typing import Optional, List

logger = logging.getLogger(__name__)

class DirectoryScanner:
    def __init__(self, db: Session):
        self.db = db
        self.photos_path = os.getenv("PHOTOS_PATH", "/photos")
        self.supported_extensions = {
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', 
            '.tiff', '.tif', '.webp', '.heic', '.heif'
        }
        self.photos_to_process = []  # Collect photo IDs for thumbnail generation
        self.thumbnail_job_id = None  # Track thumbnail job
    
    def create_scan_job(self, scan_type: str) -> int:
        job = Job(
            type=JobType.DIRECTORY_SCAN,
            status=JobStatus.PENDING,
            payload={"scan_type": scan_type}
        )
        self.db.add(job)
        self.db.commit()
        return job.id
    
    def scan_directory(self, job_id: int, scan_type: str = "incremental"):
        job = self.db.query(Job).filter(Job.id == job_id).first()
        if not job:
            logger.error(f"Job {job_id} not found")
            return
        
        try:
            job.status = JobStatus.RUNNING
            job.started_at = datetime.utcnow()
            self.db.commit()
            
            # Reset photo collection
            self.photos_to_process = []
            
            if scan_type == "full":
                self._full_scan(job)
            else:
                self._incremental_scan(job)
            
            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.utcnow()
            job.progress = 100
            self.db.commit()
            
            # Queue thumbnail generation if we have photos
            if self.photos_to_process:
                self._queue_thumbnail_generation()
            
        except Exception as e:
            logger.error(f"Scan failed: {str(e)}")
            job.status = JobStatus.FAILED
            job.error_message = str(e)
            job.completed_at = datetime.utcnow()
            self.db.commit()
    
    def _full_scan(self, job: Job):
        logger.info(f"Starting full scan of {self.photos_path}")
        
        # Count total files first
        total_files = 0
        for root, dirs, files in os.walk(self.photos_path):
            total_files += len([f for f in files if self._is_supported_file(f)])
        
        job.total_items = total_files
        self.db.commit()
        
        processed = 0
        for root, dirs, files in os.walk(self.photos_path):
            # Update or create folder
            relative_path = os.path.relpath(root, self.photos_path)
            folder = self._update_folder(root, relative_path)
            
            for filename in files:
                if not self._is_supported_file(filename):
                    continue
                
                filepath = os.path.join(root, filename)
                
                # Update job payload with current file
                if not job.payload:
                    job.payload = {}
                job.payload['current_file'] = filename
                
                self._process_photo(filepath, filename, relative_path, folder)
                
                processed += 1
                job.processed_items = processed
                job.progress = (processed / total_files) * 100 if total_files > 0 else 0
                
                if processed % 10 == 0:  # Update progress every 10 files
                    self.db.commit()
                else:
                    # Still update current file in DB more frequently
                    self.db.flush()
    
    def _incremental_scan(self, job: Job):
        logger.info(f"Starting incremental scan of {self.photos_path}")
        # TODO: Implement incremental scan that only processes new/changed files
        self._full_scan(job)  # For now, just do a full scan
    
    def _is_supported_file(self, filename: str) -> bool:
        return any(filename.lower().endswith(ext) for ext in self.supported_extensions)
    
    def _update_folder(self, path: str, relative_path: str) -> Optional[Folder]:
        folder = self.db.query(Folder).filter(Folder.path == relative_path).first()
        if not folder:
            folder = Folder(
                path=relative_path,
                name=os.path.basename(path) or "root"
            )
            self.db.add(folder)
            self.db.commit()
        return folder
    
    def _process_photo(self, filepath: str, filename: str, relative_path: str, folder: Optional[Folder]):
        try:
            # Generate file hash
            file_hash = self._generate_file_hash(filepath)
            
            # Check if photo already exists
            existing = self.db.query(Photo).filter(Photo.file_hash == file_hash).first()
            if existing:
                logger.debug(f"Photo already exists: {filename}")
                return
            
            # Get file info
            file_size = os.path.getsize(filepath)
            mime_type = magic.from_file(filepath, mime=True)
            
            # Extract metadata
            metadata, date_taken = self._extract_metadata(filepath)
            
            # Create photo record
            photo = Photo(
                filename=filename,
                filepath=filepath,
                relative_path=os.path.join(relative_path, filename),
                file_hash=file_hash,
                file_size=file_size,
                mime_type=mime_type,
                width=metadata.get("width"),
                height=metadata.get("height"),
                metadata_json=metadata,
                date_taken=date_taken,  # Use the datetime object
                camera_make=metadata.get("make"),
                camera_model=metadata.get("model"),
                original_orientation=metadata.get("original_orientation", 1),
                rotation_applied=metadata.get("rotation_applied", 0),
                orientation_corrected=metadata.get("orientation_corrected", False)
            )
            
            self.db.add(photo)
            self.db.commit()  # Commit to get photo ID
            
            # Add to thumbnail processing queue
            self.photos_to_process.append(photo.id)
            
            # Update folder stats
            if folder:
                folder.photo_count += 1
                folder.total_size += file_size
            
            logger.info(f"Added photo: {filename}")
            
        except Exception as e:
            logger.error(f"Error processing {filepath}: {str(e)}")
            self.db.rollback()  # Rollback on error to continue processing
    
    def _generate_file_hash(self, filepath: str) -> str:
        hash_sha256 = hashlib.sha256()
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()
    
    def _extract_metadata(self, filepath: str) -> dict:
        metadata = {}
        date_taken = None
        
        try:
            from PIL import ImageOps
            with Image.open(filepath) as img:
                # Get original dimensions before any rotation
                metadata["width"] = img.width
                metadata["height"] = img.height
                metadata["format"] = img.format
                
                # Extract EXIF data
                exifdata = img.getexif()
                if exifdata:
                    # Check for orientation tag (0x0112)
                    orientation = exifdata.get(0x0112, 1)
                    metadata["original_orientation"] = orientation
                    
                    # Apply EXIF transpose if needed
                    if orientation != 1:
                        try:
                            img_corrected = ImageOps.exif_transpose(img)
                            if img_corrected:
                                # Update dimensions after rotation
                                metadata["width"] = img_corrected.width
                                metadata["height"] = img_corrected.height
                                metadata["orientation_corrected"] = True
                                
                                # Calculate rotation applied
                                rotation_map = {
                                    3: 180,  # Rotate 180
                                    6: 270,  # Rotate 270 CW (or 90 CCW)
                                    8: 90    # Rotate 90 CW (or 270 CCW)
                                }
                                metadata["rotation_applied"] = rotation_map.get(orientation, 0)
                        except Exception as e:
                            logger.warning(f"Could not apply EXIF rotation: {e}")
                    
                    for tag_id, value in exifdata.items():
                        tag = TAGS.get(tag_id, tag_id)
                        # Convert all values to strings for JSON serialization
                        # Limit string length to prevent huge metadata
                        if value:
                            str_value = str(value)
                            # Remove NUL characters that PostgreSQL can't handle
                            str_value = str_value.replace('\x00', '')
                            if len(str_value) > 1000:
                                str_value = str_value[:1000] + "..."
                            metadata[tag] = str_value
                        else:
                            metadata[tag] = None
                    
                    # Parse date taken separately (not stored in metadata_json)
                    date_str = metadata.get("DateTimeOriginal") or metadata.get("DateTime")
                    if date_str:
                        try:
                            date_taken = datetime.strptime(date_str, "%Y:%m:%d %H:%M:%S")
                            metadata["date_taken"] = date_str  # Keep string version in metadata
                        except:
                            pass
                    
                    # Extract camera info (ensure no NUL characters)
                    make = metadata.get("Make")
                    model = metadata.get("Model")
                    metadata["make"] = make.replace('\x00', '') if make else None
                    metadata["model"] = model.replace('\x00', '') if model else None
        
        except Exception as e:
            logger.error(f"Error extracting metadata from {filepath}: {str(e)}")
        
        # Return metadata dict and separate date_taken
        return metadata, date_taken
    
    def _queue_thumbnail_generation(self):
        """Queue thumbnail generation as a separate job"""
        try:
            # Import here to avoid circular dependency
            from tasks.thumbnails import process_thumbnail_batch
            
            # Create thumbnail generation job
            total_photos = len(self.photos_to_process)
            thumb_job = Job(
                type=JobType.THUMBNAIL_GENERATION,
                status=JobStatus.PENDING,
                total_items=total_photos,  # Set total items for progress tracking
                processed_items=0,
                payload={
                    'photo_count': total_photos,
                    'workers': 8
                }
            )
            self.db.add(thumb_job)
            self.db.commit()
            
            # Process in batches
            batch_size = 80  # Process 80 photos at a time (10 per worker)
            for i in range(0, len(self.photos_to_process), batch_size):
                batch = self.photos_to_process[i:i + batch_size]
                # Queue the task asynchronously with batch index for tracking
                batch_index = i // batch_size
                process_thumbnail_batch.delay(batch, thumb_job.id, batch_index, total_photos)
            
            logger.info(f"Queued thumbnail generation for {len(self.photos_to_process)} photos")
            
        except Exception as e:
            logger.error(f"Failed to queue thumbnail generation: {str(e)}")