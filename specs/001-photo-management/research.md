# Research: Photo Management Application

## Executive Summary
Research findings for building a containerized photo management application with Next.js frontend and Python image processing backend, focusing on performance, scalability, and container-first development.

## Technical Decisions

### 1. API Framework: FastAPI over Flask
**Decision**: FastAPI for Python backend API  
**Rationale**: 
- Native async support crucial for I/O-heavy photo operations
- Automatic OpenAPI documentation generation
- Built-in validation with Pydantic models
- Better performance for concurrent requests
- Type hints provide better LLM understanding  
**Alternatives considered**: Flask (simpler but lacks async), Django (too heavyweight)

### 2. Data Fetching: React Query
**Decision**: React Query (TanStack Query) for frontend data management  
**Rationale**:
- Superior caching strategies for photo metadata
- Optimistic updates for better UX
- Built-in infinite scroll support
- Background refetching for real-time updates
- Smaller bundle size than SWR  
**Alternatives considered**: SWR (similar but less features), Redux+RTK Query (overkill)

### 3. Job Queue: Celery with Redis
**Decision**: Celery for background job processing  
**Rationale**:
- Mature Python ecosystem integration
- Redis backend for fast job queuing
- Built-in retry mechanisms
- Progress tracking support
- Containerization-friendly  
**Alternatives considered**: RQ (simpler but less features), Custom solution (reinventing wheel)

### 4. Image Processing Architecture
**Decision**: Hybrid approach - Python Pillow for processing, Sharp for web optimization  
**Rationale**:
- Python handles RAW/HEIF formats better via rawpy/pillow-heif
- Sharp in Node.js for final web optimization (WebP generation)
- Separation allows parallel processing
- Best tool for each job  
**Alternatives considered**: Pure Python (slower WebP), Pure Node.js (poor RAW support)

### 5. Database Schema Strategy
**Decision**: PostgreSQL with strategic JSONB for metadata  
**Rationale**:
- JSONB for EXIF data allows flexible schema
- GIN indexes on JSONB for fast metadata queries
- Partial indexes for common queries
- Table partitioning for photos table at scale  
**Key indexes**:
```sql
CREATE INDEX idx_photos_metadata ON photos USING GIN(metadata_json);
CREATE INDEX idx_photos_date_taken ON photos((metadata_json->>'date_taken'));
CREATE INDEX idx_photos_camera ON photos((metadata_json->>'camera_model'));
```

### 6. Virtual Scrolling Implementation
**Decision**: react-window with custom infinite loader  
**Rationale**:
- Lightweight (smaller than react-virtualized)
- Better performance for image grids
- Custom loader for progressive image loading
- Works well with React Query  
**Implementation approach**:
- FixedSizeGrid for uniform thumbnails
- Custom cell renderer with lazy image loading
- Intersection Observer for infinite scroll trigger

### 7. Container Orchestration
**Decision**: Docker Compose with named volumes for development  
**Rationale**:
- Simple enough for single-host deployment
- Named volumes for photo persistence
- Health checks for service dependencies
- Override files for dev/test/prod environments  
**Service architecture**:
```yaml
services:
  frontend:    # Next.js app
  backend:     # FastAPI
  worker:      # Celery worker
  redis:       # Job queue
  postgres:    # Database
```

### 8. Authentication Strategy
**Decision**: JWT with refresh tokens, httpOnly cookies  
**Rationale**:
- Stateless authentication scales better
- httpOnly cookies prevent XSS attacks
- Refresh tokens in separate cookie
- Short-lived access tokens (15 min)
- Backend validates all tokens  
**Alternatives considered**: Session-based (requires sticky sessions), OAuth (overkill for self-hosted)

## Performance Optimizations

### Image Loading Pipeline
```
1. Request → CDN/Cache check
2. Miss → Load 150px thumbnail (base64 in initial response)
3. Viewport check → Load 400px version
4. Full view → Load 1200px or original
5. Background → Preload ±3 images
```

### Database Optimizations
- Connection pooling (100 connections)
- Read replicas for heavy queries (future)
- Materialized views for folder stats
- Batch inserts for import operations
- VACUUM ANALYZE scheduled weekly

### Frontend Optimizations
- Code splitting by route
- Dynamic imports for heavy components
- Service Worker for offline caching
- WebP with JPEG fallback
- Lazy loading with native loading="lazy"
- Virtual DOM recycling in grid

## Scalability Considerations

### Horizontal Scaling Path
1. **Phase 1** (1-10k photos): Single container stack
2. **Phase 2** (10k-100k): Separate media server, CDN for thumbnails
3. **Phase 3** (100k-1M): Read replicas, Redis cache layer, S3 storage
4. **Phase 4** (1M+): Microservices, Kubernetes, distributed processing

### Bottleneck Mitigation
- **CPU**: Worker pool for image processing
- **Memory**: Stream processing for large files
- **Disk I/O**: SSD cache for hot thumbnails
- **Network**: CDN for static assets
- **Database**: Connection pooling, query optimization

## Security Best Practices

### File Handling
- Whitelist allowed extensions
- Magic number validation for file types
- Sandbox image processing in containers
- Path sanitization to prevent traversal
- File size limits (100MB default)

### API Security
- Rate limiting (100 req/min per user)
- CORS configuration for frontend only
- Input validation at all layers
- SQL injection prevention via ORM
- XSS prevention via React sanitization

## Development Workflow

### Container-First Approach
```bash
# Development
docker-compose -f docker-compose.dev.yml up

# Testing
docker-compose -f docker-compose.test.yml run tests

# Production build
docker-compose -f docker-compose.yml up -d
```

### Hot Reload Setup
- Frontend: Next.js fast refresh
- Backend: FastAPI with --reload
- Worker: Celery with watchdog
- Database: Volume persistence

## Testing Strategy

### Test Pyramid
1. **Unit tests** (60%): Component logic, service methods
2. **Integration tests** (30%): API endpoints, database operations
3. **E2E tests** (10%): Critical user flows

### Performance Testing
- Lighthouse CI for frontend metrics
- k6 for API load testing
- Memory profiling for workers
- Query analysis for database

## Monitoring & Observability

### Metrics Collection
- Prometheus for metrics
- Grafana for visualization
- Sentry for error tracking
- Custom dashboards for photo stats

### Key Metrics
- Photo import rate
- Thumbnail generation time
- API response times
- Queue depth
- Memory usage per worker

## Migration Path

### From Existing Solutions
- **Lightroom**: Export catalog as CSV, parse metadata
- **Google Photos**: Takeout import support
- **Apple Photos**: APFS library scanner
- **Raw folders**: Direct import with structure preservation

## Conclusion

This research provides a solid technical foundation for building a performant, scalable photo management application. The chosen technologies balance modern best practices with pragmatic development concerns, optimizing for LLM-assisted development through clear patterns and well-documented APIs.