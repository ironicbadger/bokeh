# Photo Management Application

> WARNING: THIS APP IS FAAAAAAAAR FROM FINISHED. DO NOT USE. IT WAS YEETED INTO EXISTENCE BY VIBES.

A containerized photo management application with support for RAW and HEIF formats, built with Next.js and FastAPI.

## Quick Start

### Prerequisites
- Docker Desktop installed and running
- 10GB+ free disk space

### 1. Start the Application

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up --build

# Or run in background
docker-compose -f docker-compose.dev.yml up -d --build
```

This will start:
- PostgreSQL database (port 5432)
- Redis cache (port 6379)
- FastAPI backend (port 8000)
- Next.js frontend (port 3000)
- Celery worker for background jobs

### 2. Access the Application

Open your browser and go to: http://localhost:3000

### 3. Import Photos

The application is configured to scan `/Users/alex/Pictures/test-images` by default.

Click the "Import Photos" button in the UI to start scanning and importing your photos.

### 4. Monitor Progress

Watch the import progress in the Docker logs:
```bash
docker-compose -f docker-compose.dev.yml logs -f backend worker
```

## Features

- ✅ Bulk photo import with progress tracking
- ✅ Automatic thumbnail generation (150px, 400px, 1200px)
- ✅ Infinite scroll grid view
- ✅ EXIF metadata extraction
- ✅ Duplicate detection via SHA-256 hashing
- ✅ Support for JPEG, PNG, HEIF/HEIC formats
- ✅ Real-time system statistics

## API Documentation

The FastAPI backend provides automatic API documentation:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Development

### Backend Development
```bash
# Install Python dependencies locally (optional)
cd backend
pip install -r requirements.txt

# Run tests
pytest
```

### Frontend Development
```bash
# Install Node dependencies locally (optional)
cd frontend
npm install

# Run development server
npm run dev
```

### Database Access
```bash
# Connect to PostgreSQL
docker-compose -f docker-compose.dev.yml exec postgres psql -U photouser -d photos

# View tables
\dt

# Query photos
SELECT id, filename, file_size, date_taken FROM photos LIMIT 10;
```

## Troubleshooting

### Photos not appearing
1. Check if import job completed:
   ```bash
   docker-compose -f docker-compose.dev.yml logs backend
   ```

2. Verify photos directory is mounted correctly:
   ```bash
   docker-compose -f docker-compose.dev.yml exec backend ls -la /photos
   ```

### Reset everything
```bash
# Stop and remove containers
docker-compose -f docker-compose.dev.yml down

# Remove volumes (WARNING: deletes all data)
docker-compose -f docker-compose.dev.yml down -v

# Start fresh
docker-compose -f docker-compose.dev.yml up --build
```

## Architecture

- **Frontend**: Next.js 14 with TypeScript, TailwindCSS, React Query
- **Backend**: FastAPI with SQLAlchemy, Celery for background jobs
- **Database**: PostgreSQL with JSONB for metadata storage
- **Cache**: Redis for job queue and caching
- **Image Processing**: Pillow for thumbnail generation

## Project Structure
```
.
├── backend/           # FastAPI backend
│   ├── api/          # API endpoints
│   ├── models/       # Database models
│   ├── services/     # Business logic
│   └── schemas/      # Pydantic schemas
├── frontend/         # Next.js frontend
│   ├── src/
│   │   ├── pages/    # Next.js pages
│   │   ├── components/ # React components
│   │   └── lib/      # Utilities
├── database/         # Database initialization
├── docker/           # Docker configurations
└── thumbnails/       # Generated thumbnails
```

## Next Steps

1. Add authentication and user management
2. Implement RAW format support (CR2, NEF, ARW)
3. Add advanced search and filtering
4. Create fullscreen image viewer
5. Add batch operations and photo organization features