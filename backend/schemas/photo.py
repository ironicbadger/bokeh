from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class PhotoBase(BaseModel):
    filename: str
    file_size: int
    mime_type: str
    width: Optional[int] = None
    height: Optional[int] = None
    date_taken: Optional[datetime] = None
    camera_make: Optional[str] = None
    camera_model: Optional[str] = None
    rating: Optional[int] = None
    is_favorite: bool = False

class PhotoResponse(PhotoBase):
    id: int
    file_hash: str
    filepath: str
    relative_path: str
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime
    thumbnails: Optional[Dict[str, str]] = None
    
    class Config:
        from_attributes = True

class PhotoList(BaseModel):
    data: List[PhotoResponse]
    pagination: Dict[str, Any]