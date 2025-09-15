# Quick Start Guide: Photo Management Application

## Prerequisites
- Docker Desktop installed and running
- 10GB+ free disk space for photos and thumbnails
- Git for cloning the repository

## 1. Initial Setup (5 minutes)

### Clone and Start Application
```bash
# Clone repository
git clone https://github.com/yourusername/photo-management.git
cd photo-management

# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be ready
docker-compose -f docker-compose.dev.yml ps

# Check logs if needed
docker-compose -f docker-compose.dev.yml logs -f
```

### Verify Installation
```bash
# Check health endpoint
curl http://localhost:3000/api/v1/system/health

# Expected response:
# {"status":"healthy","services":{"database":true,"redis":true,"storage":true}}
```

## 2. Create Admin User (2 minutes)

```bash
# Run setup script
docker-compose exec backend python scripts/create_admin.py

# Or use the API
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "SecurePass123!",
    "role": "admin"
  }'
```

## 3. Configure Photo Directories (3 minutes)

### Option A: Via Web Interface
1. Open http://localhost:3000 in your browser
2. Login with admin credentials
3. Navigate to Settings → Photo Directories
4. Click "Add Directory"
5. Configure mount path (e.g., `/photos`)
6. Set display name (e.g., "Main Library")
7. Save configuration

### Option B: Via Configuration File
```yaml
# config/settings.json
{
  "photo_directories": [
    {
      "mount_path": "/photos",
      "display_name": "Main Library",
      "is_active": true,
      "scan_subdirectories": true,
      "exclude_patterns": [".DS_Store", "Thumbs.db"]
    }
  ]
}
```

### Mount Your Photos
```yaml
# docker-compose.override.yml
services:
  backend:
    volumes:
      - /path/to/your/photos:/photos:ro  # Read-only mount
```

Restart containers:
```bash
docker-compose -f docker-compose.dev.yml restart backend worker
```

## 4. Import Photos (5-30 minutes depending on library size)

### Initial Full Scan
```bash
# Via CLI
docker-compose exec backend python -m cli.import_photos \
  --mount-path /photos \
  --scan-type full \
  --batch-size 100

# Via API
curl -X POST http://localhost:3000/api/v1/photos \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "directory_id": 1,
    "scan_type": "full"
  }'
```

### Monitor Import Progress
```bash
# Check job status
curl http://localhost:3000/api/v1/jobs?status=running \
  -H "Authorization: Bearer YOUR_TOKEN"

# Watch logs
docker-compose -f docker-compose.dev.yml logs -f worker
```

## 5. Browse Your Photos

### Access the Application
1. Open http://localhost:3000
2. Login with your credentials
3. Photos appear in grid view as they're processed
4. Use folder tree on left to navigate
5. Click any photo for full-screen view

### Keyboard Shortcuts
- `P` - Enter pick mode for selecting photos
- `Space` - Toggle selection in pick mode
- `Arrow Keys` - Navigate between photos
- `Escape` - Exit modes/close viewer
- `F` - Toggle favorite
- `1-5` - Rate photo

## 6. Common Operations

### Incremental Scan (for new photos)
```bash
docker-compose exec backend python -m cli.import_photos \
  --mount-path /photos \
  --scan-type incremental
```

### Regenerate Thumbnails
```bash
# For specific photos
curl -X POST http://localhost:3000/api/v1/thumbnails/regenerate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "photo_ids": [1, 2, 3],
    "sizes": ["150", "400", "1200"]
  }'

# For all photos (use with caution)
docker-compose exec backend python -m cli.regenerate_thumbnails --all
```

### Find Duplicates
```bash
curl http://localhost:3000/api/v1/photos/duplicates \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Export Photo List
```bash
docker-compose exec backend python -m cli.export \
  --format csv \
  --output /tmp/photos.csv
```

## 7. Performance Tuning

### For Large Libraries (10k+ photos)
```yaml
# docker-compose.override.yml
services:
  backend:
    environment:
      - THUMBNAIL_WORKERS=4
      - DB_POOL_SIZE=20
      - REDIS_MAX_CONNECTIONS=50
  
  worker:
    deploy:
      replicas: 3  # Multiple workers

  postgres:
    command: >
      postgres
      -c shared_buffers=256MB
      -c effective_cache_size=1GB
      -c maintenance_work_mem=128MB
```

### Enable Caching
```bash
# In production, use CDN for thumbnails
docker-compose -f docker-compose.prod.yml up -d nginx
```

## 8. Troubleshooting

### Photos Not Appearing
```bash
# Check import jobs
docker-compose exec backend python -m cli.jobs --status failed

# Verify file permissions
docker-compose exec backend ls -la /photos

# Check supported formats
docker-compose exec backend python -m cli.supported_formats
```

### Slow Performance
```bash
# Check database indexes
docker-compose exec postgres psql -U photouser -d photos \
  -c "SELECT * FROM pg_indexes WHERE tablename = 'photos';"

# Monitor resource usage
docker stats

# Clear thumbnail cache if needed
docker-compose exec backend python -m cli.clear_cache --type thumbnails
```

### Reset Everything
```bash
# Stop containers
docker-compose down

# Remove volumes (WARNING: deletes all data)
docker-compose down -v

# Start fresh
docker-compose -f docker-compose.dev.yml up -d
```

## 9. Next Steps

- **Configure Backup**: Set up automated database backups
- **Add Users**: Create additional user accounts
- **Customize Settings**: Adjust thumbnail sizes, quality settings
- **Enable ML Features**: Activate face detection (Stage 3)
- **Set Up Monitoring**: Configure Prometheus/Grafana dashboards

## 10. Testing Your Setup

Run the validation script to ensure everything is working:

```bash
# Run validation tests
docker-compose exec backend python scripts/validate_setup.py

# Expected output:
✓ Database connection successful
✓ Redis connection successful
✓ Storage directories accessible
✓ Photo import working
✓ Thumbnail generation working
✓ API endpoints responding
✓ Frontend accessible

Setup complete! Your photo management system is ready.
```

## Support

- Documentation: `/docs`
- API Reference: http://localhost:3000/api/docs
- Logs: `docker-compose logs [service-name]`
- Issues: https://github.com/yourusername/photo-management/issues