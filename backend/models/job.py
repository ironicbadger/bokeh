from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum

class JobType(enum.Enum):
    DIRECTORY_SCAN = "directory_scan"
    THUMBNAIL_GENERATION = "thumbnail_generation"
    METADATA_EXTRACTION = "metadata_extraction"
    IMPORT_PHOTOS = "import_photos"

class JobStatus(enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    type = Column(Enum(JobType), nullable=False)
    status = Column(Enum(JobStatus), default=JobStatus.PENDING, index=True)
    priority = Column(Integer, default=5)
    payload = Column(JSON, nullable=True)
    progress = Column(Float, default=0)
    total_items = Column(Integer, nullable=True)
    processed_items = Column(Integer, default=0)
    error_message = Column(String, nullable=True)
    result = Column(JSON, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="jobs")