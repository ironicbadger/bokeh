# Bokeh Project Instructions

## Test File Organization

### Playwright Browser Tests
All Playwright browser tests should be placed in the `tests/js/` directory.

**Location**: `/tests/js/`

**Naming Convention**: 
- Test files should be named descriptively with `test-` prefix
- Examples: `test-jobs-modal.js`, `test-cancel-button.js`, `test-scan-button.js`

**Running Tests**:
```bash
# Run a specific test
node tests/js/test-jobs-modal.js

# Run all tests (if test runner is configured)
npm test
```

### Test Categories:
- **UI Component Tests**: Testing modal behaviors, button interactions
- **Workflow Tests**: Testing complete user workflows (scan, cancel, etc.)
- **Integration Tests**: Testing API interactions with UI

## Development Guidelines

### Frontend (Next.js + TypeScript)
- Components in `/frontend/src/components/`
- Pages in `/frontend/src/pages/`
- API client in `/frontend/src/lib/api.ts`
- Styles in `/frontend/src/styles/`

### Backend (FastAPI + Python)
- API routes in `/backend/api/`
- Services in `/backend/services/`
- Models in `/backend/models.py`
- Worker tasks in `/backend/worker.py`

### Docker Services
- Frontend: `bokeh-frontend-1`
- Backend: `bokeh-backend-1`
- Worker: `bokeh-worker-1`
- Database: `bokeh-postgres-1`
- Redis: `bokeh-redis-1`

## Important Notes

1. **Jobs Modal**: Central hub for all background tasks
   - "Scan My Library" button for photo scanning
   - Real-time progress updates
   - Two-step cancellation confirmation

2. **Photo Processing**: 
   - Supports HEIC/HEIF formats (iPhone photos)
   - Handles RAW formats (CR2, NEF, ARW)
   - Thumbnail generation in multiple sizes (150, 400, 1200)

3. **Database**: PostgreSQL with proper null character sanitization for EXIF data

4. **Testing Best Practices**:
   - Always test with `headless: false` for debugging
   - Use proper waits (`waitForTimeout`, `waitForSelector`)
   - Test both happy path and error cases
   - Clean up test data after tests

## Common Commands

```bash
# Restart services
docker restart bokeh-backend-1
docker restart bokeh-frontend-1

# Check logs
docker logs bokeh-backend-1 --tail 50
docker logs bokeh-frontend-1 --tail 50

# Database queries
docker exec bokeh-postgres-1 psql -U photouser -d photos -c "SELECT * FROM jobs WHERE status='RUNNING';"

# Clear completed jobs
docker exec bokeh-postgres-1 psql -U photouser -d photos -c "UPDATE jobs SET status='COMPLETED', completed_at=NOW() WHERE status='RUNNING';"
```

## API Endpoints

Key endpoints used by the frontend:
- `GET /api/v1/jobs` - List jobs (with `?include_completed=false` for active only)
- `POST /api/v1/jobs/{id}/cancel` - Cancel a job
- `POST /api/v1/photos/import` - Start photo scan
- `GET /api/v1/system/stats` - System statistics
- `GET /api/v1/thumbnails/{id}/{size}` - Get thumbnail

---
Last Updated: 2025-09-15