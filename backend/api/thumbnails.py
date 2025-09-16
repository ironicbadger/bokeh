from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from models import get_db, Thumbnail, Photo
import os
import io
from PIL import Image, ImageOps
import pillow_heif

# Register HEIF opener
pillow_heif.register_heif_opener()

router = APIRouter()

@router.get("/{photo_id}/full")
async def get_full_image(
    photo_id: int,
    db: Session = Depends(get_db)
):
    """Get the full-size image, converting if necessary for browser display"""
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Construct full path - filepath already contains /photos prefix
    full_path = photo.filepath if photo.filepath.startswith('/') else os.path.join("/photos", photo.filepath)
    
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Photo file not found")
    
    # Check if file needs conversion for browser display
    file_ext = os.path.splitext(photo.filepath)[1].lower()
    
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Full image request for photo {photo_id}, ext: {file_ext}, path: {full_path}")
    
    # For HEIC/HEIF, TIF/TIFF files and other formats that browsers can't display, convert to JPEG
    if file_ext in ['.heic', '.heif', '.tif', '.tiff', '.nef', '.cr2', '.cr3', '.arw', '.dng', '.raf', '.orf']:
        logger.info(f"Converting {file_ext} to JPEG for browser display")
        try:
            # Handle HEIC/HEIF files (pillow-heif should already be registered)
            if file_ext in ['.heic', '.heif']:
                # pillow-heif registers automatically, so PIL can open these
                logger.info(f"Opening HEIC/HEIF file with PIL")
                img = Image.open(full_path)
            # Try to handle RAW files with rawpy if available
            elif file_ext in ['.nef', '.cr2', '.cr3', '.arw', '.dng', '.raf', '.orf']:
                try:
                    import rawpy
                    # io is already imported at top of file
                    with rawpy.imread(full_path) as raw:
                        # Try to extract the embedded JPEG thumbnail first (much faster and consistent)
                        try:
                            thumb = raw.extract_thumb()
                            if thumb.format == rawpy.ThumbFormat.JPEG:
                                # Use the embedded JPEG thumbnail
                                img = Image.open(io.BytesIO(thumb.data))
                            else:
                                # No JPEG thumbnail, process the RAW data
                                rgb = raw.postprocess(use_camera_wb=True, half_size=False)
                                img = Image.fromarray(rgb)
                        except Exception:
                            # Fallback to full RAW processing
                            rgb = raw.postprocess(use_camera_wb=True, half_size=False)
                            img = Image.fromarray(rgb)
                except (ImportError, Exception):
                    # Fall back to regular PIL if rawpy fails
                    img = Image.open(full_path)
            else:
                # Open TIF/TIFF and other image files
                img = Image.open(full_path)
            
            with img:
                # Apply EXIF orientation if present
                try:
                    img = ImageOps.exif_transpose(img) or img
                except Exception:
                    pass
                
                # Apply user rotation if present
                if photo.user_rotation and photo.user_rotation != 0:
                    img = img.rotate(-photo.user_rotation, expand=True)
                
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'LA'):
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                    img = background
                elif img.mode not in ('RGB', 'L'):
                    img = img.convert('RGB')
                
                # Save to bytes buffer
                buffer = io.BytesIO()
                img.save(buffer, 'JPEG', quality=95, optimize=True, progressive=True)
                buffer.seek(0)
                
                # Add proper cache headers
                import hashlib
                content = buffer.getvalue()
                etag = hashlib.md5(content).hexdigest()
                
                return Response(
                    content=content,
                    media_type="image/jpeg",
                    headers={
                        "Cache-Control": "no-cache, no-store, must-revalidate" if (os.getenv("NODE_ENV") == "development" or os.getenv("ENVIRONMENT") == "development") else "public, max-age=86400, must-revalidate",
                        "Pragma": "no-cache" if (os.getenv("NODE_ENV") == "development" or os.getenv("ENVIRONMENT") == "development") else None,
                        "Expires": "0" if (os.getenv("NODE_ENV") == "development" or os.getenv("ENVIRONMENT") == "development") else None,
                        "ETag": f'"{etag}"'
                    } | {k: v for k, v in {"Pragma": "no-cache" if (os.getenv("NODE_ENV") == "development" or os.getenv("ENVIRONMENT") == "development") else None}.items() if v is not None}
                )
        except Exception as e:
            # If conversion fails, try to return the original
            logger.error(f"Failed to convert {file_ext} file: {str(e)}")
            # Add proper cache headers
            import hashlib
            stat = os.stat(full_path)
            etag_source = f"{full_path}-{stat.st_size}-{stat.st_mtime}"
            etag = hashlib.md5(etag_source.encode()).hexdigest()
            
            return FileResponse(
                full_path,
                media_type=photo.mime_type or "image/jpeg",
                headers={
                    "Cache-Control": "no-cache, no-store, must-revalidate" if (os.getenv("NODE_ENV") == "development" or os.getenv("ENVIRONMENT") == "development") else "public, max-age=86400, must-revalidate",
                    "ETag": f'"{etag}"'
                }
            )
    else:
        # For supported formats, check if user rotation is applied
        if photo.user_rotation and photo.user_rotation != 0:
            # Need to apply rotation even for supported formats
            try:
                with Image.open(full_path) as img:
                    # Apply EXIF orientation if present
                    try:
                        img = ImageOps.exif_transpose(img) or img
                    except Exception:
                        pass
                    
                    # Apply user rotation
                    img = img.rotate(-photo.user_rotation, expand=True)
                    
                    # Convert to RGB if necessary
                    if img.mode in ('RGBA', 'LA'):
                        background = Image.new('RGB', img.size, (255, 255, 255))
                        background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                        img = background
                    elif img.mode not in ('RGB', 'L'):
                        img = img.convert('RGB')
                    
                    # Save to bytes buffer
                    buffer = io.BytesIO()
                    # Keep original format if possible
                    format = 'JPEG' if file_ext in ['.jpg', '.jpeg'] else 'PNG'
                    img.save(buffer, format, quality=95, optimize=True)
                    buffer.seek(0)
                    
                    # Add proper cache headers
                    import hashlib
                    content = buffer.getvalue()
                    etag = hashlib.md5(content).hexdigest()
                    
                    return Response(
                        content=content,
                        media_type=photo.mime_type or "image/jpeg",
                        headers={
                            "Cache-Control": "public, max-age=86400, must-revalidate",  # 1 day cache
                            "ETag": f'"{etag}"'
                        }
                    )
            except Exception:
                # If processing fails, return original
                return FileResponse(
                    full_path,
                    media_type=photo.mime_type or "image/jpeg"
                )
        else:
            # No rotation needed, return original file
            # Add proper cache headers
            import hashlib
            stat = os.stat(full_path)
            etag_source = f"{full_path}-{stat.st_size}-{stat.st_mtime}"
            etag = hashlib.md5(etag_source.encode()).hexdigest()
            
            return FileResponse(
                full_path,
                media_type=photo.mime_type or "image/jpeg",
                headers={
                    "Cache-Control": "no-cache, no-store, must-revalidate" if (os.getenv("NODE_ENV") == "development" or os.getenv("ENVIRONMENT") == "development") else "public, max-age=86400, must-revalidate",
                    "ETag": f'"{etag}"'
                }
            )

@router.get("/{photo_id}/{size}")
async def get_thumbnail(
    photo_id: int,
    size: str,
    format: str = "webp",
    v: str = None,  # Version parameter for cache busting
    db: Session = Depends(get_db)
):
    import os
    import hashlib
    
    # Validate size
    if size not in ["150", "400", "1200"]:
        raise HTTPException(status_code=400, detail="Invalid thumbnail size")
    
    # Get photo to check rotation version
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Build versioned filename
    rotation_version = photo.rotation_version or 0
    thumbnails_path = os.getenv("THUMBNAILS_PATH", "/app/thumbnails")
    versioned_filename = f"{photo_id}_{size}_v{rotation_version}.jpg"
    versioned_filepath = os.path.join(thumbnails_path, versioned_filename)
    
    # Check if versioned thumbnail exists
    if os.path.exists(versioned_filepath):
        # Serve the versioned thumbnail with proper cache headers
        # Use strong caching but allow revalidation on hard refresh
        media_type = "image/jpeg"
        
        # Get file stats for ETag
        stat = os.stat(versioned_filepath)
        # Create ETag from file path, size, and mtime
        etag_source = f"{versioned_filepath}-{stat.st_size}-{stat.st_mtime}"
        etag = hashlib.md5(etag_source.encode()).hexdigest()
        
        # Check if we're in development mode
        is_development = os.getenv("NODE_ENV") == "development" or os.getenv("ENVIRONMENT") == "development"
        
        if is_development:
            # Aggressive no-cache for development
            headers = {
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
                "ETag": f'"{etag}"'
            }
        else:
            # Production caching
            headers = {
                "Cache-Control": "public, max-age=2592000, must-revalidate",  # 30 days cache
                "ETag": f'"{etag}"'
            }
        return FileResponse(versioned_filepath, media_type=media_type, headers=headers)
    
    # Fallback to old naming convention for backward compatibility
    old_filename = f"{photo_id}_{size}.jpg"
    old_filepath = os.path.join(thumbnails_path, old_filename)
    
    if os.path.exists(old_filepath):
        # Serve old thumbnail with proper cache headers
        media_type = "image/jpeg"
        
        # Get file stats for ETag
        stat = os.stat(old_filepath)
        etag_source = f"{old_filepath}-{stat.st_size}-{stat.st_mtime}"
        etag = hashlib.md5(etag_source.encode()).hexdigest()
        
        # Check if we're in development mode
        is_development = os.getenv("NODE_ENV") == "development" or os.getenv("ENVIRONMENT") == "development"
        
        if is_development:
            headers = {
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
                "ETag": f'"{etag}"'
            }
        else:
            headers = {
                "Cache-Control": "public, max-age=3600, must-revalidate",  # 1 hour cache
                "ETag": f'"{etag}"'
            }
        return FileResponse(old_filepath, media_type=media_type, headers=headers)
    
    # Generate thumbnail on the fly if it doesn't exist
    # This ensures photos appear immediately even before background processing
    from services.thumbnail_service import ThumbnailService
    
    try:
        service = ThumbnailService(db)
        # Generate just the requested size, not all sizes
        generated = service.generate_single_thumbnail(photo_id, size)
        if generated and size in generated:
            thumbnail_path = generated[size]['filepath']
            if os.path.exists(thumbnail_path):
                media_type = "image/jpeg"
                stat = os.stat(thumbnail_path)
                etag_source = f"{thumbnail_path}-{stat.st_size}-{stat.st_mtime}"
                etag = hashlib.md5(etag_source.encode()).hexdigest()
                
                headers = {
                    "Cache-Control": "no-cache, must-revalidate",  # Short cache for on-the-fly generated
                    "ETag": f'"{etag}"'
                }
                return FileResponse(thumbnail_path, media_type=media_type, headers=headers)
    except Exception as e:
        # Log but don't fail - return placeholder instead
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Failed to generate thumbnail for photo {photo_id}: {e}")
    
    # Return a placeholder image if all else fails
    # Create a simple gray placeholder
    from PIL import Image
    import io
    
    size_map = {"150": 150, "400": 400, "1200": 1200}
    dimension = size_map.get(size, 400)
    
    # Create a gray placeholder with text
    placeholder = Image.new('RGB', (dimension, dimension), color=(60, 60, 60))
    buffer = io.BytesIO()
    placeholder.save(buffer, 'JPEG', quality=85)
    buffer.seek(0)
    
    return Response(
        content=buffer.getvalue(),
        media_type="image/jpeg",
        headers={
            "Cache-Control": "no-cache, no-store",  # Don't cache placeholders
            "X-Placeholder": "true"
        }
    )

from pydantic import BaseModel

class RegenerateRequest(BaseModel):
    force: bool = False

@router.post("/regenerate/{photo_id}")
async def regenerate_photo_thumbnails(
    photo_id: int,
    db: Session = Depends(get_db)
):
    """Regenerate thumbnails for a specific photo"""
    try:
        # Import here to avoid circular dependency
        from tasks.thumbnails import regenerate_photo_thumbnails as regenerate_task
        
        # Check if photo exists
        photo = db.query(Photo).filter(Photo.id == photo_id).first()
        if not photo:
            raise HTTPException(status_code=404, detail="Photo not found")
        
        # Queue the task with high priority for single photo
        result = regenerate_task.apply_async(args=[photo_id], priority=9)
        
        return {
            "message": "Thumbnail regeneration queued",
            "photo_id": photo_id,
            "job_id": result.id if hasattr(result, 'id') else None,
            "rotation_version": photo.rotation_version
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/regenerate")
async def regenerate_thumbnails(
    request: RegenerateRequest,
    db: Session = Depends(get_db)
):
    """Regenerate thumbnails for all photos"""
    try:
        # Check if there's already a thumbnail job running
        from models import Job, JobStatus, JobType
        running_thumbnail_job = db.query(Job).filter(
            Job.type == JobType.THUMBNAIL_GENERATION,
            Job.status == JobStatus.RUNNING
        ).first()
        
        if running_thumbnail_job:
            raise HTTPException(
                status_code=409,
                detail=f"Thumbnail generation job {running_thumbnail_job.id} is already running. Please wait for it to complete."
            )
        
        # Import here to avoid circular dependency
        from tasks.thumbnails import regenerate_all_thumbnails
        
        # Call the task asynchronously using delay
        result = regenerate_all_thumbnails.delay(force=request.force)
        
        # Get photo count for response
        from models import Photo
        if request.force:
            total_photos = db.query(Photo).count()
        else:
            # Count photos without thumbnails
            from models import Thumbnail
            total_photos = db.query(Photo).outerjoin(Thumbnail).filter(
                Thumbnail.id == None
            ).count()
        
        return {
            "message": "Thumbnail regeneration started",
            "job_id": result.id if hasattr(result, 'id') else None,
            "total_photos": total_photos,
            "batches": (total_photos + 39) // 40  # Batch size is now 40
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))