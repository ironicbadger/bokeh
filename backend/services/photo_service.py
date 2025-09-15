from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from models import Photo
from typing import Tuple, List

class PhotoService:
    def __init__(self, db: Session):
        self.db = db
    
    def list_photos(self, page: int, per_page: int, sort: str, order: str) -> Tuple[List[Photo], int]:
        query = self.db.query(Photo).filter(Photo.is_deleted == False)
        
        # Apply sorting
        sort_column = getattr(Photo, sort, Photo.date_taken)
        if order == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * per_page
        photos = query.offset(offset).limit(per_page).all()
        
        # Add thumbnail URLs to photos
        for photo in photos:
            thumbnail_urls = {}
            for thumb in photo.thumbnails:
                thumbnail_urls[thumb.size] = f"/api/v1/thumbnails/{photo.id}/{thumb.size}"
            # Set a transient attribute for the response
            photo.thumbnails_urls = thumbnail_urls
        
        return photos, total