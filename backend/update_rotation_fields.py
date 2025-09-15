#!/usr/bin/env python3
"""Update rotation fields for all photos."""
from models import get_db, Photo

def update_rotation_fields():
    db = next(get_db())
    try:
        photos = db.query(Photo).all()
        count = 0
        for photo in photos:
            # Calculate final rotation from EXIF + user rotation
            photo.final_rotation = ((photo.rotation_applied or 0) + (photo.user_rotation or 0)) % 360
            # Initialize rotation_version if not set
            if photo.rotation_version is None:
                photo.rotation_version = 0
            count += 1
        
        db.commit()
        print(f"Updated rotation fields for {count} photos")
    finally:
        db.close()

if __name__ == "__main__":
    update_rotation_fields()