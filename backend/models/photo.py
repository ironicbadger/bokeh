from sqlalchemy import Column, Integer, String, BigInteger, Boolean, DateTime, Float, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    filename = Column(String(255), nullable=False)
    filepath = Column(String(500), nullable=False)
    relative_path = Column(String(500), nullable=False)
    file_hash = Column(String(64), unique=True, nullable=False, index=True)
    file_size = Column(BigInteger, nullable=False)
    mime_type = Column(String(50), nullable=False)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    date_taken = Column(DateTime, nullable=True, index=True)
    camera_make = Column(String(100), nullable=True)
    camera_model = Column(String(100), nullable=True)
    lens_info = Column(String(200), nullable=True)
    gps_latitude = Column(Float, nullable=True)
    gps_longitude = Column(Float, nullable=True)
    rating = Column(Integer, nullable=True)
    is_favorite = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    # Orientation fields
    original_orientation = Column(Integer, nullable=True)  # EXIF orientation (1-8)
    rotation_applied = Column(Integer, default=0)  # Degrees rotated from EXIF (0, 90, 180, 270)
    user_rotation = Column(Integer, default=0)  # User manual rotation (0, 90, 180, 270)
    orientation_corrected = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    thumbnails = relationship("Thumbnail", back_populates="photo", cascade="all, delete-orphan")
    user = relationship("User", back_populates="photos")