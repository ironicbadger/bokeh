# Data Model: Photo Management Application

## Entity Definitions

### User
Represents system users with authentication and authorization.

```typescript
interface User {
  id: number;                    // Primary key, auto-increment
  username: string;               // Unique, 3-50 chars
  email: string;                  // Unique, valid email
  password_hash: string;          // Bcrypt hash
  role: 'admin' | 'user';        // Role-based access
  created_at: Date;              // Account creation
  updated_at: Date;              // Last modification
  last_login: Date | null;       // Last successful login
  is_active: boolean;            // Account status
}
```

**Validation Rules**:
- Username: alphanumeric + underscore, 3-50 chars
- Email: Valid RFC 5322 format
- Password: Min 8 chars, requires upper/lower/digit
- Role: Defaults to 'user'

### Photo
Core entity representing an individual photo file.

```typescript
interface Photo {
  id: number;                    // Primary key
  user_id: number;               // Foreign key to User
  directory_id: number;          // Foreign key to PhotoDirectory
  filename: string;              // Original filename
  filepath: string;              // Full container path
  relative_path: string;         // Path relative to mount point
  file_hash: string;             // SHA-256 hash (unique)
  file_size: bigint;             // Size in bytes
  mime_type: string;             // MIME type
  width: number | null;          // Image width in pixels
  height: number | null;         // Image height in pixels
  metadata_json: object;         // EXIF and other metadata
  date_taken: Date | null;       // From EXIF or file
  camera_make: string | null;    // Extracted for indexing
  camera_model: string | null;   // Extracted for indexing
  lens_info: string | null;      // Lens information
  gps_latitude: number | null;   // GPS coordinates
  gps_longitude: number | null;  
  rating: number | null;         // User rating (1-5)
  is_favorite: boolean;          // Favorite flag
  is_deleted: boolean;           // Soft delete flag
  created_at: Date;              // Import timestamp
  updated_at: Date;              // Last modification
}
```

**Validation Rules**:
- file_hash: 64 char hex string, unique across system
- mime_type: Must be in allowed list
- file_size: Max 500MB per file
- rating: Integer 1-5 or null

### PhotoDirectory
Configured photo source directories.

```typescript
interface PhotoDirectory {
  id: number;                    // Primary key
  mount_path: string;            // Container mount point
  display_name: string;          // User-friendly name
  host_path: string | null;      // Documentation only
  is_active: boolean;            // Enable/disable scanning
  scan_subdirectories: boolean;  // Recursive scanning
  auto_scan: boolean;            // Auto-scan on changes
  exclude_patterns: string[];    // Glob patterns to exclude
  last_scan_at: Date | null;     // Last successful scan
  created_at: Date;
  updated_at: Date;
}
```

### Folder
Hierarchical folder structure for organization.

```typescript
interface Folder {
  id: number;                    // Primary key
  directory_id: number;          // Foreign key to PhotoDirectory
  path: string;                  // Full folder path
  name: string;                  // Folder name
  parent_id: number | null;      // Self-reference for hierarchy
  photo_count: number;           // Cached count
  total_size: bigint;            // Cached size in bytes
  created_at: Date;
  updated_at: Date;
}
```

**Validation Rules**:
- Path must be unique within directory
- Name cannot contain: / \ : * ? " < > |

### Thumbnail
Generated thumbnails for photos.

```typescript
interface Thumbnail {
  id: number;                    // Primary key
  photo_id: number;              // Foreign key to Photo
  size: '150' | '400' | '1200';  // Thumbnail size
  format: 'webp' | 'jpeg';       // Image format
  filepath: string;              // Storage path
  file_size: number;             // Size in bytes
  width: number;                 // Actual width
  height: number;                // Actual height
  created_at: Date;
}
```

### Job
Background job tracking.

```typescript
interface Job {
  id: number;                    // Primary key
  user_id: number | null;        // Initiating user
  type: JobType;                 // Job type enum
  status: JobStatus;             // Current status
  priority: number;              // Execution priority (1-10)
  payload: object;               // Job-specific data
  progress: number;              // Completion percentage
  total_items: number | null;    // Total items to process
  processed_items: number;       // Items completed
  error_message: string | null;  // Error details
  result: object | null;         // Job result data
  started_at: Date | null;       // Execution start
  completed_at: Date | null;     // Execution end
  created_at: Date;
  updated_at: Date;
}

enum JobType {
  DIRECTORY_SCAN = 'directory_scan',
  THUMBNAIL_GENERATION = 'thumbnail_generation',
  METADATA_EXTRACTION = 'metadata_extraction',
  DUPLICATE_DETECTION = 'duplicate_detection',
  IMPORT_PHOTOS = 'import_photos',
  DELETE_PHOTOS = 'delete_photos'
}

enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}
```

### Gallery
Smart and manual photo collections.

```typescript
interface Gallery {
  id: number;                    // Primary key
  user_id: number;               // Owner
  name: string;                  // Gallery name
  description: string | null;    // Description
  cover_photo_id: number | null; // Cover image
  is_smart: boolean;             // Smart vs manual
  is_public: boolean;            // Visibility
  criteria_json: object | null;  // Smart gallery rules
  photo_count: number;           // Cached count
  created_at: Date;
  updated_at: Date;
}

interface GalleryPhoto {
  gallery_id: number;            // Foreign key to Gallery
  photo_id: number;              // Foreign key to Photo
  position: number;              // Sort order
  added_at: Date;                // When added
}
```

### Session
User session management.

```typescript
interface Session {
  id: string;                    // UUID
  user_id: number;               // Foreign key to User
  refresh_token: string;         // Refresh token
  expires_at: Date;              // Token expiration
  ip_address: string;            // Client IP
  user_agent: string;            // Browser info
  created_at: Date;
  last_used_at: Date;
}
```

## Relationships

### Primary Relationships
- User ←→ Photo: One-to-Many (user owns photos)
- Photo ←→ Thumbnail: One-to-Many (multiple sizes)
- Photo ←→ PhotoDirectory: Many-to-One
- Folder ←→ Folder: Self-referential hierarchy
- Gallery ←→ Photo: Many-to-Many via GalleryPhoto
- User ←→ Job: One-to-Many (user initiates jobs)

### Indexes for Performance

```sql
-- Photos table
CREATE INDEX idx_photos_user_id ON photos(user_id);
CREATE INDEX idx_photos_file_hash ON photos(file_hash);
CREATE INDEX idx_photos_date_taken ON photos(date_taken);
CREATE INDEX idx_photos_camera ON photos(camera_make, camera_model);
CREATE INDEX idx_photos_metadata ON photos USING GIN(metadata_json);
CREATE INDEX idx_photos_gps ON photos(gps_latitude, gps_longitude) 
  WHERE gps_latitude IS NOT NULL;

-- Folders table
CREATE INDEX idx_folders_parent ON folders(parent_id);
CREATE INDEX idx_folders_path ON folders(path);

-- Thumbnails table
CREATE INDEX idx_thumbnails_photo_size ON thumbnails(photo_id, size);

-- Jobs table
CREATE INDEX idx_jobs_status ON jobs(status) WHERE status IN ('pending', 'running');
CREATE INDEX idx_jobs_type_status ON jobs(type, status);

-- Sessions table
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

## State Transitions

### Photo Lifecycle
```
DETECTED → IMPORTING → PROCESSING → READY → DELETED
    ↓          ↓           ↓          ↓
  SKIPPED   FAILED     FAILED    ARCHIVED
```

### Job State Machine
```
PENDING → RUNNING → COMPLETED
           ↓    ↓
        FAILED CANCELLED
```

## Metadata Schema (JSONB)

```json
{
  "exif": {
    "make": "Canon",
    "model": "EOS R5",
    "lens": "RF 24-70mm F2.8L IS USM",
    "focal_length": 50,
    "aperture": 2.8,
    "shutter_speed": "1/125",
    "iso": 400,
    "date_time_original": "2024-01-15T14:30:00Z",
    "orientation": 1,
    "color_space": "sRGB",
    "white_balance": "Auto"
  },
  "gps": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "altitude": 28.5,
    "direction": 180
  },
  "file": {
    "original_name": "IMG_1234.CR2",
    "import_source": "/photos/vacation",
    "import_date": "2024-01-20T10:00:00Z"
  },
  "ai": {
    "faces_detected": 2,
    "scene_type": "landscape",
    "objects": ["mountain", "lake", "trees"],
    "quality_score": 0.92
  }
}
```

## Data Integrity Rules

1. **Duplicate Prevention**: Unique constraint on file_hash
2. **Cascade Deletion**: Delete thumbnails when photo deleted
3. **Soft Deletes**: Photos marked as deleted, not removed
4. **Orphan Prevention**: Cannot delete user with photos
5. **Path Validation**: Ensure paths within mount points
6. **Atomic Operations**: Use transactions for multi-table updates

## Performance Considerations

1. **Pagination**: Use cursor-based pagination for large result sets
2. **Batch Operations**: Process photos in batches of 100-1000
3. **Lazy Loading**: Load metadata only when needed
4. **Caching**: Cache folder counts and gallery contents
5. **Partitioning**: Consider partitioning photos table by date_taken at scale