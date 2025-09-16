# Fresh Start Process for Bokeh

## Overview
This document describes the process for completely resetting the Bokeh application to a fresh state with an empty database and no cached thumbnails. This is useful for testing initial setup, debugging issues, or starting over with a clean installation.

## Fresh Start Command: `/freshstart`

When you request a fresh start using the `/freshstart` command, the following steps will be executed:

## Step-by-Step Process

### 1. Stop All Running Containers
```bash
docker compose stop
```
This ensures all containers are properly stopped before removing data.

### 2. Remove PostgreSQL Data Volume
```bash
docker volume rm bokeh_postgres_data
```
This completely removes the database volume, deleting all photos, metadata, jobs, and user data.

### 3. Clear All Thumbnails
```bash
rm -f thumbnails/*.jpg
```
This removes all generated thumbnail files from the thumbnails directory.

### 4. Rebuild and Start Containers
```bash
docker compose -f docker-compose.dev.yml up --build
```
This rebuilds the containers with any code changes and starts the application with a fresh database.

## What Gets Reset

- **Database**: All tables are recreated empty
  - Photos table (0 records)
  - Thumbnails table (0 records)
  - Jobs table (0 records)
  - Folders table (0 records)
  - All other tables

- **Thumbnails**: All generated thumbnail files are deleted
  - 150px thumbnails
  - 400px thumbnails  
  - 1200px thumbnails
  - All versioned thumbnails (v0, v1, etc.)

- **Application State**: Returns to initial state
  - No photos in library
  - No running jobs
  - No cached data

## What Is Preserved

- **Source Photos**: Original photos in `/photos` directory remain untouched
- **Configuration**: Application settings and environment variables
- **Code Changes**: Any modifications to the source code

## Expected Behavior After Fresh Start

1. **Initial Load**: Application shows empty photo grid (0 photos)
2. **First Scan**: Click "Scan My Library" to discover photos
3. **Real-time Updates**: 
   - Photos should appear immediately as they're discovered
   - Thumbnails generate in background
   - Status bar shows live progress
   - Grid auto-refreshes with new photos

## Verification Steps

After a fresh start, verify:
1. Database shows 0 photos: `curl http://localhost:8000/api/v1/photos/count`
2. Thumbnails directory is empty: `ls thumbnails/*.jpg 2>/dev/null | wc -l` should return 0
3. No active jobs: `curl http://localhost:8000/api/v1/jobs`
4. Frontend shows empty grid initially

## Automated Fresh Start Script

Create this script as `scripts/freshstart.sh`:

```bash
#!/bin/bash
echo "🔄 Starting fresh database reset for Bokeh..."

echo "📦 Stopping all containers..."
docker compose stop

echo "🗑️ Removing PostgreSQL data volume..."
docker volume rm bokeh_postgres_data -f

echo "🖼️ Clearing thumbnails..."
rm -f thumbnails/*.jpg

echo "🚀 Rebuilding and starting containers..."
docker compose -f docker-compose.dev.yml up --build
```

Make it executable: `chmod +x scripts/freshstart.sh`

## Common Use Cases

1. **Testing Initial User Experience**: See how the app behaves for a new user
2. **Debugging Scanning Issues**: Test photo discovery with clean state
3. **Performance Testing**: Measure import speed with empty database
4. **Development Reset**: Clear test data during development
5. **Testing Real-time Updates**: Verify auto-refresh functionality

## Notes

- This process is destructive and cannot be undone
- All application data will be lost
- Original photos are never deleted
- Process takes about 30-60 seconds to complete
- After fresh start, first scan will re-discover all photos