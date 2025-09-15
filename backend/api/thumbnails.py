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
    
    # Construct full path
    full_path = os.path.join("/photos", photo.filepath)
    
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Photo file not found")
    
    # Check if file needs conversion for browser display
    file_ext = os.path.splitext(photo.filepath)[1].lower()
    
    # For TIF/TIFF files and other formats that browsers can't display, convert to JPEG
    if file_ext in ['.tif', '.tiff', '.nef', '.cr2', '.cr3', '.arw', '.dng', '.raf', '.orf']:
        try:
            # Try to handle RAW files with rawpy if available
            if file_ext in ['.nef', '.cr2', '.cr3', '.arw', '.dng', '.raf', '.orf']:
                try:
                    import rawpy
                    with rawpy.imread(full_path) as raw:
                        rgb = raw.postprocess()
                        img = Image.fromarray(rgb)
                except (ImportError, Exception):
                    # Fall back to regular PIL if rawpy fails
                    img = Image.open(full_path)
            else:
                # Open regular image files
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
                
                return Response(
                    content=buffer.getvalue(),
                    media_type="image/jpeg",
                    headers={"Cache-Control": "public, max-age=3600"}
                )
        except Exception as e:
            # If conversion fails, try to return the original
            return FileResponse(
                full_path,
                media_type=photo.mime_type or "image/jpeg"
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
                    
                    return Response(
                        content=buffer.getvalue(),
                        media_type=photo.mime_type or "image/jpeg",
                        headers={"Cache-Control": "public, max-age=3600"}
                    )
            except Exception:
                # If processing fails, return original
                return FileResponse(
                    full_path,
                    media_type=photo.mime_type or "image/jpeg"
                )
        else:
            # No rotation needed, return original file
            return FileResponse(
                full_path,
                media_type=photo.mime_type or "image/jpeg"
            )

@router.get("/{photo_id}/{size}")
async def get_thumbnail(
    photo_id: int,
    size: str,
    format: str = "webp",
    v: str = None,  # Version parameter for cache busting
    db: Session = Depends(get_db)
):
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
        # Serve the versioned thumbnail
        media_type = "image/jpeg"
        headers = {
            "Cache-Control": "public, max-age=31536000, immutable"  # Cache forever with version
        }
        return FileResponse(versioned_filepath, media_type=media_type, headers=headers)
    
    # Fallback to old naming convention for backward compatibility
    old_filename = f"{photo_id}_{size}.jpg"
    old_filepath = os.path.join(thumbnails_path, old_filename)
    
    if os.path.exists(old_filepath):
        # Serve old thumbnail with shorter cache
        media_type = "image/jpeg"
        headers = {
            "Cache-Control": "public, max-age=3600"  # 1 hour cache for old thumbnails
        }
        return FileResponse(old_filepath, media_type=media_type, headers=headers)
    
    # TODO: Generate thumbnail on the fly if it doesn't exist
    raise HTTPException(status_code=404, detail="Thumbnail not found")

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