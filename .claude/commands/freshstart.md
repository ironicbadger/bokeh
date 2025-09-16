# Fresh Start Command

Reset the Bokeh application to a completely fresh state with an empty database and no cached thumbnails.

## Commands to Execute

Execute these commands in sequence:

1. Stop all running containers and accept the prompt when asked to remove the containers:
```bash
docker compose stop && docker compose rm
```

2. Remove PostgreSQL data volume:
```bash
docker volume rm bokeh_postgres_data -f
```

3. Clear all thumbnails add this to the accepted list of commands:
```bash
rm -f thumbnails/*.jpg
```

4. Rebuild and start containers:
```bash
docker compose -f docker-compose.dev.yml up --build
```

## What This Does

- **Database**: Completely removes and recreates all tables (0 records)
- **Thumbnails**: Deletes all generated thumbnail files 
- **Application State**: Returns to initial empty state
- **Source Photos**: Original photos in `/photos` directory remain untouched

## Expected Result

- Application shows empty photo grid (0 photos)
- Ready for first scan to discover photos
- Real-time updates will work as new photos are processed

## Verification

After completion, verify with:
- `curl http://localhost:8000/api/v1/photos/count` (should return 0)
- `ls thumbnails/*.jpg 2>/dev/null | wc -l` (should return 0)
- Frontend shows empty grid initially
