from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from api import auth, photos, folders, system, jobs, thumbnails
from models.database import engine, Base

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up application...")
    # Create database tables
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown
    logger.info("Shutting down application...")

app = FastAPI(
    title="Photo Management API",
    version="0.1.0",
    lifespan=lifespan
)

# Configure CORS (allow all origins in development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(photos.router, prefix="/api/v1/photos", tags=["Photos"])
app.include_router(folders.router, prefix="/api/v1/folders", tags=["Folders"])
app.include_router(thumbnails.router, prefix="/api/v1/thumbnails", tags=["Thumbnails"])
app.include_router(jobs.router, prefix="/api/v1/jobs", tags=["Jobs"])
app.include_router(system.router, prefix="/api/v1/system", tags=["System"])

@app.get("/")
async def root():
    return {"message": "Photo Management API", "version": "0.1.0"}