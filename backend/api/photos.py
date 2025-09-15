from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List
from models import get_db, Photo
from schemas.photo import PhotoResponse, PhotoList
from services.photo_service import PhotoService
from services.scanner import DirectoryScanner
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("")  # No trailing slash to avoid redirects
async def list_photos(
    page: int = Query(1, ge=1),
    per_page: int = Query(100, ge=1, le=500),  # Increased default and max
    sort: str = Query("date_taken", regex="^(date_taken|filename|size|rating)$"),
    order: str = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    from sqlalchemy import desc as sql_desc, asc as sql_asc
    from models import Thumbnail
    
    # Only get photos that have at least one thumbnail
    # Use a subquery to avoid DISTINCT on JSON columns
    subquery = db.query(Thumbnail.photo_id).filter(
        Thumbnail.size == "400"
    ).subquery()
    
    query = db.query(Photo).filter(
        Photo.is_deleted == False,
        Photo.id.in_(subquery)
    )
    
    # Apply sorting
    from sqlalchemy import nullslast, nullsfirst
    sort_column = getattr(Photo, sort, Photo.date_taken)
    if order == "desc":
        # For descending, put nulls at the end, then sort by ID for consistency
        query = query.order_by(nullslast(sql_desc(sort_column)), sql_desc(Photo.id))
    else:
        # For ascending, put nulls at the end, then sort by ID for consistency
        query = query.order_by(nullslast(sql_asc(sort_column)), sql_asc(Photo.id))
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * per_page
    photos = query.offset(offset).limit(per_page).all()
    
    # Convert to simple dict format to avoid ORM issues
    photo_list = []
    for photo in photos:
        photo_dict = {
            "id": photo.id,
            "filename": photo.filename,
            "file_size": photo.file_size,
            "mime_type": photo.mime_type,
            "width": photo.width,
            "height": photo.height,
            "date_taken": photo.date_taken.isoformat() if photo.date_taken else None,
            "camera_make": photo.camera_make,
            "camera_model": photo.camera_model,
            "rating": photo.rating,
            "is_favorite": photo.is_favorite,
            "thumbnails": {
                "150": f"/api/v1/thumbnails/{photo.id}/150",
                "400": f"/api/v1/thumbnails/{photo.id}/400",
                "1200": f"/api/v1/thumbnails/{photo.id}/1200"
            }
        }
        photo_list.append(photo_dict)
    
    return {
        "data": photo_list,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": (total + per_page - 1) // per_page
        }
    }

@router.get("/{photo_id}", response_model=PhotoResponse)
async def get_photo(photo_id: int, db: Session = Depends(get_db)):
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    return photo

@router.post("/import")
async def import_photos(
    background_tasks: BackgroundTasks,
    scan_type: str = "incremental",
    db: Session = Depends(get_db)
):
    scanner = DirectoryScanner(db)
    job_id = scanner.create_scan_job(scan_type)
    background_tasks.add_task(scanner.scan_directory, job_id, scan_type)
    
    return {
        "message": "Import started",
        "job_id": job_id,
        "scan_type": scan_type
    }

@router.get("/duplicates")
async def find_duplicates(db: Session = Depends(get_db)):
    # Find photos with duplicate hashes
    duplicates = db.execute("""
        SELECT file_hash, COUNT(*) as count, array_agg(id) as photo_ids
        FROM photos
        WHERE is_deleted = false
        GROUP BY file_hash
        HAVING COUNT(*) > 1
    """).fetchall()
    
    result = []
    for dup in duplicates:
        photos = db.query(Photo).filter(Photo.id.in_(dup.photo_ids)).all()
        result.append({
            "hash": dup.file_hash,
            "count": dup.count,
            "photos": photos
        })
    
    return result

from pydantic import BaseModel

class RotationUpdate(BaseModel):
    rotation: int

@router.patch("/{photo_id}/rotation")
async def update_photo_rotation(
    photo_id: int,
    rotation_data: RotationUpdate,
    db: Session = Depends(get_db)
):
    """Update user rotation for a photo and regenerate thumbnails"""
    rotation = rotation_data.rotation
    
    # Validate rotation value
    if rotation not in [0, 90, 180, 270]:
        raise HTTPException(status_code=400, detail="Rotation must be 0, 90, 180, or 270")
    
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Update user rotation
    photo.user_rotation = rotation
    db.commit()
    
    # Queue thumbnail regeneration with new rotation
    from tasks.thumbnails import regenerate_photo_thumbnails
    regenerate_photo_thumbnails.delay(photo_id)
    
    return {
        "message": "Rotation updated", 
        "photo_id": photo_id,
        "user_rotation": rotation,
        "total_rotation": (photo.rotation_applied + rotation) % 360
    }