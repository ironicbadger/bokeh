from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from models import get_db, Thumbnail, Photo
import os

router = APIRouter()

@router.get("/{photo_id}/full")
async def get_full_image(
    photo_id: int,
    db: Session = Depends(get_db)
):
    """Get the full-size original image"""
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Construct full path
    full_path = os.path.join("/photos", photo.filepath)
    
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Photo file not found")
    
    # Return the original file with EXIF orientation applied
    return FileResponse(
        full_path,
        media_type=photo.mime_type or "image/jpeg"
    )

@router.get("/{photo_id}/{size}")
async def get_thumbnail(
    photo_id: int,
    size: str,
    format: str = "webp",
    db: Session = Depends(get_db)
):
    # Validate size
    if size not in ["150", "400", "1200"]:
        raise HTTPException(status_code=400, detail="Invalid thumbnail size")
    
    # Find thumbnail - for now, always use jpeg since that's what we're generating
    thumbnail = db.query(Thumbnail).filter(
        Thumbnail.photo_id == photo_id,
        Thumbnail.size == size,
        Thumbnail.format == "jpeg"  # We're only generating JPEG for now
    ).first()
    
    if not thumbnail:
        # TODO: Generate thumbnail on the fly if it doesn't exist
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    
    if not os.path.exists(thumbnail.filepath):
        raise HTTPException(status_code=404, detail="Thumbnail file not found")
    
    media_type = "image/webp" if format == "webp" else "image/jpeg"
    return FileResponse(thumbnail.filepath, media_type=media_type)

from pydantic import BaseModel

class RegenerateRequest(BaseModel):
    force: bool = False

@router.post("/regenerate")
async def regenerate_thumbnails(
    request: RegenerateRequest,
    db: Session = Depends(get_db)
):
    """Regenerate thumbnails for all photos"""
    try:
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