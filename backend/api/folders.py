from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from models import get_db, Photo, Folder
import os
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

def build_folder_tree(photos: List[Photo]) -> List[Dict[str, Any]]:
    """Build a hierarchical folder tree from photo paths"""
    folder_data = {}
    folder_recursive_counts = {}  # Track recursive counts
    
    for photo in photos:
        # Get the directory path from the full file path
        dir_path = os.path.dirname(photo.filepath)
        parts = dir_path.split('/')
        
        # Build the tree structure
        current_path = ""
        for i, part in enumerate(parts):
            if not part:  # Skip empty parts
                continue
                
            parent_path = current_path
            current_path = "/".join(parts[:i+1]) if i > 0 else part
            
            if current_path not in folder_data:
                folder_data[current_path] = {
                    'id': current_path,
                    'path': current_path,
                    'name': part,
                    'type': 'directory',
                    'parent': parent_path if parent_path else None,
                    'children': [],
                    'photoCount': 0,
                    'recursivePhotoCount': 0
                }
            
            # Count photos in this exact folder
            if dir_path == current_path:
                folder_data[current_path]['photoCount'] += 1
            
            # Count for recursive totals (this photo is in current_path and all its parents)
            if current_path not in folder_recursive_counts:
                folder_recursive_counts[current_path] = 0
            folder_recursive_counts[current_path] += 1
            
            # Link to parent
            if parent_path and parent_path in folder_data:
                if current_path not in [c['id'] for c in folder_data[parent_path]['children']]:
                    folder_data[parent_path]['children'].append(folder_data[current_path])
    
    # Update recursive counts
    for path, count in folder_recursive_counts.items():
        if path in folder_data:
            folder_data[path]['recursivePhotoCount'] = count
    
    # Get root nodes (those without parents)
    roots = [node for node in folder_data.values() if node['parent'] is None]
    
    # Sort children recursively
    def sort_tree(node):
        node['children'].sort(key=lambda x: x['name'].lower())
        for child in node['children']:
            sort_tree(child)
    
    for root in roots:
        sort_tree(root)
    
    return roots

@router.get("/tree")
async def get_folder_tree(db: Session = Depends(get_db)):
    """Get the complete folder tree structure"""
    try:
        # Get all photos with their file paths
        photos = db.query(Photo).filter(
            Photo.is_deleted == False
        ).all()
        
        if not photos:
            return {"nodes": []}
        
        tree = build_folder_tree(photos)
        
        return {"nodes": tree}
    except Exception as e:
        logger.error(f"Error building folder tree: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{folder_path:path}/photos")
async def get_folder_photos(
    folder_path: str,
    recursive: bool = True,
    db: Session = Depends(get_db)
):
    """Get all photos in a specific folder (recursively by default)"""
    try:
        # Normalize the folder path
        if not folder_path.startswith('/'):
            folder_path = '/' + folder_path
        
        if recursive:
            # Query photos in this folder and all subfolders
            photos = db.query(Photo).filter(
                Photo.is_deleted == False,
                Photo.filepath.like(f"{folder_path}/%")
            ).order_by(Photo.filepath).all()
        else:
            # Query photos in this specific folder only
            photos = db.query(Photo).filter(
                Photo.is_deleted == False,
                func.substr(Photo.filepath, 1, func.length(Photo.filepath) - func.length(Photo.filename) - 1) == folder_path
            ).all()
        
        return {
            "folder": folder_path,
            "recursive": recursive,
            "photos": photos,
            "count": len(photos)
        }
    except Exception as e:
        logger.error(f"Error getting folder photos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{folder_id}/children")
async def get_folder_children(
    folder_id: str,
    db: Session = Depends(get_db)
):
    """Get child folders for lazy loading"""
    try:
        # This would be used for lazy loading in the tree
        # For now, the tree endpoint returns everything
        return {"children": []}
    except Exception as e:
        logger.error(f"Error getting folder children: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/scan")
async def scan_directory(db: Session = Depends(get_db)):
    # TODO: Implement directory scanning
    return {"message": "Scan initiated"}