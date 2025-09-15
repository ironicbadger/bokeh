import os
import logging
from PIL import Image
from sqlalchemy.orm import Session
from models import Photo, Thumbnail
from typing import Dict, List
import pillow_heif
import numpy as np

# Register HEIF opener with PIL
pillow_heif.register_heif_opener()

# Try to import rawpy for RAW file support
try:
    import rawpy
    RAWPY_AVAILABLE = True
except ImportError:
    RAWPY_AVAILABLE = False

logger = logging.getLogger(__name__)

class ThumbnailService:
    def __init__(self, db: Session):
        self.db = db
        self.thumbnails_path = os.getenv("THUMBNAILS_PATH", "/app/thumbnails")
        self.sizes = {
            '150': (150, 150),
            '400': (400, 400),
            '1200': (1200, 1200)
        }
        
        # Ensure thumbnails directory exists
        os.makedirs(self.thumbnails_path, exist_ok=True)
    
    def generate_thumbnails(self, photo_id: int, apply_rotation: bool = True) -> Dict[str, str]:
        photo = self.db.query(Photo).filter(Photo.id == photo_id).first()
        if not photo:
            logger.error(f"Photo {photo_id} not found")
            return {}
        
        generated = {}
        
        try:
            # Check if it's a RAW file that needs special handling
            file_ext = os.path.splitext(photo.filepath)[1].lower()
            
            if file_ext in ['.cr3', '.cr2', '.nef', '.arw', '.dng', '.raf', '.orf'] and RAWPY_AVAILABLE:
                # Handle RAW files with rawpy
                try:
                    with rawpy.imread(photo.filepath) as raw:
                        rgb = raw.postprocess()
                        img = Image.fromarray(rgb)
                except Exception as e:
                    logger.warning(f"Failed to process RAW file with rawpy: {e}, falling back to PIL")
                    img = Image.open(photo.filepath)
            else:
                # Open regular image files or fall back to PIL
                img = Image.open(photo.filepath)
            
            with img:
                # Apply rotation if needed
                if apply_rotation:
                    total_rotation = (photo.rotation_applied + photo.user_rotation) % 360
                    if total_rotation != 0:
                        # Rotate the image (negative because PIL rotates counter-clockwise)
                        img = img.rotate(-total_rotation, expand=True)
                # Convert RGBA to RGB if necessary
                if img.mode in ('RGBA', 'LA'):
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                    img = background
                elif img.mode not in ('RGB', 'L'):
                    img = img.convert('RGB')
                
                for size_name, dimensions in self.sizes.items():
                    # Create thumbnail
                    thumbnail = img.copy()
                    thumbnail.thumbnail(dimensions, Image.Resampling.LANCZOS)
                    
                    # Save with versioned filename for cache busting
                    rotation_version = photo.rotation_version or 0
                    filename = f"{photo_id}_{size_name}_v{rotation_version}.jpg"
                    filepath = os.path.join(self.thumbnails_path, filename)
                    thumbnail.save(filepath, 'JPEG', quality=85, optimize=True)
                    
                    # Get file size
                    file_size = os.path.getsize(filepath)
                    
                    # Check if thumbnail record exists
                    existing = self.db.query(Thumbnail).filter(
                        Thumbnail.photo_id == photo_id,
                        Thumbnail.size == size_name,
                        Thumbnail.format == 'jpeg'
                    ).first()
                    
                    if existing:
                        # Update existing record
                        existing.filepath = filepath
                        existing.file_size = file_size
                        existing.width = thumbnail.width
                        existing.height = thumbnail.height
                    else:
                        # Create new thumbnail record
                        thumb_record = Thumbnail(
                            photo_id=photo_id,
                            size=size_name,
                            format='jpeg',
                            filepath=filepath,
                            file_size=file_size,
                            width=thumbnail.width,
                            height=thumbnail.height
                        )
                        self.db.add(thumb_record)
                    
                    generated[size_name] = filepath
                    logger.info(f"Generated {size_name} thumbnail for photo {photo_id}")
                
                self.db.commit()
                
        except Exception as e:
            logger.error(f"Error generating thumbnails for photo {photo_id}: {str(e)}")
            self.db.rollback()
        
        return generated
    
    def generate_batch_thumbnails(self, photo_ids: List[int]):
        for photo_id in photo_ids:
            self.generate_thumbnails(photo_id)