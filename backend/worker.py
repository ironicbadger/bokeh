from celery import Celery
import os

# Create Celery instance
celery_app = Celery(
    'photo_management',
    broker=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
    backend=os.getenv('REDIS_URL', 'redis://localhost:6379/0')
)

# Configure Celery
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour
    task_soft_time_limit=3300,  # 55 minutes
)

# Import tasks after celery_app is created
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import tasks to register them with Celery
try:
    from tasks.thumbnails import process_thumbnail_batch, generate_photo_thumbnails, regenerate_all_thumbnails
    print("Tasks imported successfully")
except ImportError as e:
    print(f"Warning: Could not import tasks: {e}")