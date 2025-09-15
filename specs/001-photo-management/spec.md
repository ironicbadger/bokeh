# Feature Specification: Photo Management Application

## Overview
A self-hosted, containerized photo management application for handling photos from DSLRs (RAW formats) to modern phone formats (HEIF/HEIC), emphasizing performance, modularity, and container-first development.

## User Stories

### Stage 1 - MVP
1. **As a photographer**, I want to bulk import thousands of photos via CLI or web interface so I can quickly ingest my photo library
2. **As a user**, I want to view my photos in an infinite-scrolling grid with lazy loading so I can browse large collections efficiently
3. **As a user**, I want to navigate through hierarchical folder structures (Lightroom-style) so I can organize my photos
4. **As a user**, I want to see real-time system metrics (library size, disk usage, job status) so I understand system state
5. **As a user**, I want automatic thumbnail generation with retina support so photos load quickly
6. **As an admin**, I want basic authentication so my photo library is secure

### Stage 2 - Enhanced UI/UX
7. **As a user**, I want advanced grid features (filtering, sorting, metadata display) so I can find specific photos
8. **As a user**, I want a full-size image viewer with preloading (3 images either side) for smooth navigation
9. **As a user**, I want pick mode for duplicate detection and selection with keyboard shortcuts
10. **As an admin**, I want multi-user support with admin/user roles and permissions
11. **As an admin**, I want settings panel for maintenance operations, forced scans, and thumbnail regeneration

## Functional Requirements

### Core Photo Management
- **FR-1**: Support ingestion of 1000+ photos in batch operations
- **FR-2**: Handle RAW formats (CR2, NEF, ARW), modern formats (HEIF, HEIC), and standard formats (JPEG, PNG, TIFF)
- **FR-3**: Generate SHA-256 hashes for duplicate detection
- **FR-4**: Extract and store EXIF metadata as JSONB
- **FR-5**: Create multiple thumbnail sizes (150px, 400px, 1200px) in WebP with JPEG fallback
- **FR-6**: Support hierarchical folder navigation with lazy loading
- **FR-7**: Implement virtual scrolling for grid view
- **FR-8**: Preload 3 images in each direction for smooth navigation

### Photo Ingestion
- **FR-9**: Configure multiple photo directories without file movement
- **FR-10**: Support full, incremental, and verification scans
- **FR-11**: Process files in batches of 100 for efficiency
- **FR-12**: Exclude patterns support (.DS_Store, Thumbs.db, *.tmp)
- **FR-13**: Background job processing with progress tracking
- **FR-14**: Handle duplicates across different directories

### User Interface
- **FR-15**: Infinite scroll with virtual scrolling for performance
- **FR-16**: Pick mode with keyboard shortcuts (P to activate, Space to toggle, Delete to mark)
- **FR-17**: Status bar showing library size, disk usage, and active jobs
- **FR-18**: Settings page for directory configuration and maintenance
- **FR-19**: Real-time job progress updates
- **FR-20**: Multi-select with Shift+Click and Ctrl+Click

## Non-Functional Requirements

### Performance
- **NFR-1**: Initial grid load <2 seconds
- **NFR-2**: Subsequent page loads <500ms
- **NFR-3**: Image navigation <100ms between images
- **NFR-4**: Batch process 100+ images for thumbnail generation
- **NFR-5**: Efficient memory management for large datasets

### Security
- **NFR-6**: JWT-based authentication
- **NFR-7**: Role-based access control (admin/user)
- **NFR-8**: Path validation to prevent directory traversal
- **NFR-9**: File type validation with whitelist

### Scalability
- **NFR-10**: Support libraries with 100,000+ photos
- **NFR-11**: Handle concurrent users
- **NFR-12**: Background job queue for heavy operations

### Deployment
- **NFR-13**: Container-first development
- **NFR-14**: Docker compose for local development
- **NFR-15**: Multi-stage builds for production
- **NFR-16**: PostgreSQL for data persistence

## Success Criteria
1. Successfully import and display 10,000+ photos
2. Grid view loads and scrolls smoothly without lag
3. Thumbnail generation completes for 1000 photos in reasonable time
4. Image viewer navigates smoothly with preloading
5. Pick mode allows efficient duplicate management
6. System remains responsive under load

## Technical Constraints
- Must use Next.js 14+ with TypeScript for frontend
- Must use Python for image processing (Pillow, pillow-heif, rawpy)
- Must use PostgreSQL for database
- Must support Docker containerization
- Must implement Playwright tests in containers
- No packages installed on host system

## Dependencies
- Next.js 14+ (frontend framework)
- Python 3.11+ (image processing)
- PostgreSQL 15+ (database)
- Docker & Docker Compose (containerization)
- Playwright (testing)
- pillow-heif, rawpy (image format support)

## Acceptance Criteria
1. All Stage 1 MVP features implemented and tested
2. Performance metrics meet specified targets
3. Container-based development workflow functional
4. Playwright tests pass in containerized environment
5. Documentation complete for setup and usage