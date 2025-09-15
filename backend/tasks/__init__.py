# Import the celery app from worker module
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from worker import celery_app

# Import all tasks to register them
from .thumbnails import (
    process_thumbnail_batch,
    regenerate_all_thumbnails,
    generate_photo_thumbnails
)

__all__ = [
    'celery_app',
    'process_thumbnail_batch',
    'regenerate_all_thumbnails',
    'generate_photo_thumbnails'
]