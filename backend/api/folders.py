from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models import get_db, Folder
from typing import List

router = APIRouter()

@router.get("")
async def get_folder_tree(db: Session = Depends(get_db)):
    # Get root folders (no parent)
    root_folders = db.query(Folder).filter(Folder.parent_id == None).all()
    
    def build_tree(folder):
        return {
            "id": folder.id,
            "path": folder.path,
            "name": folder.name,
            "photo_count": folder.photo_count,
            "total_size": folder.total_size,
            "children": [build_tree(child) for child in folder.children]
        }
    
    return [build_tree(folder) for folder in root_folders]

@router.get("/{folder_id}")
async def get_folder_contents(folder_id: int, db: Session = Depends(get_db)):
    folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not folder:
        return {"error": "Folder not found"}
    
    return {
        "folder": folder,
        "photos": []  # TODO: Implement photo filtering by folder
    }

@router.post("/scan")
async def scan_directory(db: Session = Depends(get_db)):
    # TODO: Implement directory scanning
    return {"message": "Scan initiated"}