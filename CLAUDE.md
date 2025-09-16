# Claude Development Instructions for Bokeh

## 📚 Documentation
For detailed technical documentation on specific features, see the `docs/` directory:
- **`docs/CACHE_MANAGEMENT.md`** - Cache invalidation system, development mode headers, Clear Cache button implementation, and RAW file thumbnail consistency
- **`docs/AUTO_RELOAD_SYSTEM.md`** - Auto-reload system for real-time photo grid updates during scanning, smart polling, and sort options

## 📅 Recent Work Completed (2025-01-16)

### Latest Session Updates - Auto-Reload System & Sort Options
Implemented real-time photo grid updates with automatic refresh during scanning and new sorting options.

#### 1. **Auto-Reload System**
- **Smart polling**: Lightweight `/photos/count` endpoint polls every 2s during active jobs
- **Incremental loading**: Only fetches new photos via `/photos/recent` endpoint
- **Automatic grid updates**: Photos appear automatically as thumbnails are generated
- **Visual feedback**: "• Scanning for new photos..." indicator during active jobs

#### 2. **Enhanced Sorting Options**
- **"Most Recently Added"**: New default sort by `created_at` (when added to library)
- **"Date Taken"**: Alternative sort by EXIF date
- **Sort UI**: Clean toggle between sort modes with order controls
- **Persistence**: Sort preference saved to localStorage

#### 3. **New API Endpoints**
- `GET /api/v1/photos/count` - Returns photo count and latest timestamp
- `GET /api/v1/photos/recent?since={timestamp}` - Fetches only new photos
- Updated `/api/v1/photos` to support `created_at` sorting

#### 4. **Files Modified**
- `backend/api/photos.py` - Added new endpoints and created_at sorting
- `frontend/src/lib/api.ts` - Added TypeScript interfaces and new API functions
- `frontend/src/components/SortSelector.tsx` - New sort UI component
- `frontend/src/pages/index.tsx` - Auto-reload logic and polling
- `docs/AUTO_RELOAD_SYSTEM.md` - Complete technical documentation

## 📅 Previous Work (2025-01-15)

### Latest Session Updates - RAW File Support & Thumbnail Job Fixes
Successfully implemented full RAW file support (CR3, CR2, NEF, ARW, DNG, RAF, ORF) with performant pre-generated thumbnails and fixed thumbnail generation job management.

#### 1. **Complete RAW File Support**
- **Added rawpy dependency** for RAW file processing (`backend/requirements.txt`)
- **Updated scanner** to include RAW extensions: `.cr3`, `.cr2`, `.nef`, `.arw`, `.dng`, `.raf`, `.orf` (`backend/services/scanner.py`)
- **Fixed thumbnail generation** in both service and worker to handle RAW files using rawpy
- **Docker updates**: Added `libraw-dev` to Dockerfiles for rawpy support
- **Results**: 
  - 713 CR3 files successfully imported and thumbnailed
  - 84 DNG files successfully imported and thumbnailed
  - All RAW formats now work with pre-generated thumbnails for performance

#### 2. **Thumbnail Job Management Fixes**
- **Single job enforcement**: Added checks to prevent multiple concurrent thumbnail jobs
  - API endpoint check (`backend/api/thumbnails.py`)
  - Celery task check (`backend/tasks/thumbnails.py`)
- **Fixed job completion**: Corrected batch tracking logic so jobs properly mark as COMPLETED
- **Fixed progress calculation**: Jobs now accurately track processed items
- **Job status**: Set to RUNNING immediately to prevent race conditions

#### 3. **Performance Optimizations**
- **Pre-generated thumbnails**: RAW files converted to JPEG thumbnails during import (not on-the-fly)
- **Batch processing**: 40 photos per batch with 4 workers
- **Smart fallback**: If rawpy fails for certain files, falls back to PIL

#### 4. **Files Modified**
- `backend/requirements.txt` - Added rawpy==0.19.1
- `backend/services/scanner.py` - Added RAW extensions to supported_extensions
- `backend/services/thumbnail_service.py` - Added RAW file handling with rawpy
- `backend/tasks/thumbnails.py` - Fixed batch processing, job completion, and RAW support
- `backend/api/thumbnails.py` - Added check to prevent concurrent jobs
- `backend/api/photos.py` - Fixed import endpoint to accept JSON body
- `docker/Dockerfile.backend.dev` - Added libraw-dev
- `docker/Dockerfile.backend` - Added libraw-dev and other dependencies

### Previous Session Updates (Earlier on 2025-01-15)
Successfully implemented view modes, favorites, zoom controls, and UI improvements.

#### New Features Implemented:
1. **Three View Modes**
   - Grid View: Traditional photo grid with sorting
   - Year View: Year cards with preview photos
   - Files View: Folder tree with recursive photo display

2. **Favorites System**
   - Database field `is_favorite` for photos
   - Heart button in image viewer
   - Favorite photos prioritized as year previews
   - API endpoint: `PATCH /api/v1/photos/{id}/favorite`

3. **Subtle Zoom Control**
   - Minimal indicator in bottom-right corner
   - Expands to modal panel on hover/click
   - Keyboard shortcuts: Cmd/Ctrl + Plus/Minus/0
   - Shows current grid density as "X columns"
   - Auto-collapses after 3 seconds

4. **UI Improvements**
   - Compact status bar (32px height)
   - Dark theme consistency
   - Proper content padding to prevent overlap
   - Recursive folder browsing in Files view

## 📅 Previous Work Completed (2025-01-15)

### Session Summary
Successfully implemented a full-screen image viewer with rotation persistence, real-time thumbnail updates, and significant performance optimizations.

### Key Accomplishments
1. **Full-Screen Image Viewer** (`frontend/src/components/ImageViewer.tsx`)
   - Keyboard navigation (arrows, Esc, i, +/-, r/R)
   - EXIF metadata display
   - Rotation persistence with database storage
   - Image preloading for smooth navigation
   - Thumbnail strip navigation

2. **Rotation System**
   - Database: Added `user_rotation` field to photos table
   - API: `PATCH /api/v1/photos/{id}/rotation` endpoint
   - Automatic thumbnail regeneration with rotation applied
   - Combined EXIF + user rotation handling

3. **Real-Time Thumbnail Updates** ✅ **FIXED**
   - Thumbnails now update immediately when rotating in viewer
   - Implemented Map-based timestamp tracking for cache-busting
   - Temporary `&_t=timestamp` parameter for recently rotated images
   - 5-second cache bypass window after rotation
   - Version-based long-term caching with `?v=version`

4. **Performance Fixes**
   - Grid: 800px prefetch, 100 photos/page, 5-min cache
   - Thumbnails: Reduced workers to 4, added delays for UI priority
   - Fixed duplicate API requests issue
   - Added image preloading for scroll performance

### Current State
- ✅ Photo grid with infinite scroll working smoothly
- ✅ Image viewer fully functional with all controls
- ✅ Rotation saves and persists correctly
- ✅ Thumbnails regenerate with proper orientation
- ✅ **Thumbnail sync fixed** - Real-time updates without refresh
- ✅ Performance optimized for large libraries (tested with 11,000+ photos)

### Known Issues
- **TIF/TIFF Files**: Don't load in the full-screen image viewer (lightbox). Thumbnails work but full-size viewing fails. Need to add TIF support to the `/thumbnails/{id}/full` endpoint.
- ~~**RAW/HEIF Files**: RAW files (CR2, NEF, ARW) and HEIF/HEIC files don't display in viewer. Need server-side conversion.~~ ✅ **FIXED** - RAW files now fully supported with pre-generated thumbnails

### Important Decisions Made
- **No Coral TPU**: Decided against using Coral TPU for ML orientation - EXIF handles most cases, complexity not worth it
- **Thumbnail Strategy**: Overwrite thumbnails in-place rather than delete-then-recreate to avoid broken images
- **Concurrency**: Reduced workers to 4 rather than implement complex job queuing - simpler and effective
- **Cache-Busting Strategy**: Use Map for timestamp tracking instead of Set for consistent cache-busting URLs

---

## 🎨 UI Components

### Zoom Control (ZoomControl.tsx)
**Description**: Subtle, non-intrusive zoom control for adjusting grid density

#### Features
- **Minimal collapsed state**: Shows just "5x" in bottom-right corner
- **Modal panel on expand**: Dark panel with clear controls and labels
- **Keyboard shortcuts**: Cmd/Ctrl + Plus/Minus/0
- **Auto-collapse**: Hides after 3 seconds of inactivity
- **Persistent across views**: Works in Grid, Year, and Files views

#### Design
- Position: Fixed bottom-right, above status bar
- Collapsed: Small gray badge with zoom icon
- Expanded: Modal panel with slider, buttons, and reset option
- Shows current value as "X columns" for clarity

### Status Bar (StatusBar.tsx)
**Description**: Compact status bar showing system information

#### Features
- **Compact height**: 32px (reduced from 48px)
- **Dark theme**: bg-gray-800 with transparency
- **Photo counts**: Current view and total library
- **Storage info**: Library size and free space
- **Jobs button**: Shows active job count with animation

### Favorites System
**Description**: Mark photos as favorites for quick access and organization

#### Implementation
- Database field: `is_favorite` boolean on photos table
- API endpoint: `PATCH /api/v1/photos/{id}/favorite`
- UI: Heart button in image viewer (filled when favorited)
- Year view: Favorite photos prioritized as preview images

## 🎯 Next Session Tasks (Priority Order)

### 1. Fix TIF/TIFF Support in Image Viewer
- Add support for TIF files in the full-screen viewer
- Modify `/thumbnails/{id}/full` endpoint to handle TIF conversion
- Consider server-side conversion to JPEG for browser compatibility

### 2. Batch Operations
- Add multi-select mode to grid
- Implement bulk operations (rotate, delete, favorite)
- Keyboard shortcuts for selection

### 3. Search & Filtering
- Add search bar component
- Implement filename search
- Add date range filtering
- Quick filter buttons

### 4. Album/Folder Organization  
- Create album management UI
- Add photo-to-album assignment
- Implement folder tree navigation

### 5. Settings Page
- Scan directory configuration
- Performance tuning options
- User preferences

---

## 📸 View Modes Specification

### Overview
The application will support three distinct view modes for browsing photos, each optimized for different browsing patterns and user needs:

1. **Grid View** (Current) - Time-based sorting with infinite scroll
2. **Year View** - Calendar year grouping with month dividers
3. **Files View** - File tree navigation with directory structure

### UI Components

#### Nerd Font Icons Setup
```tsx
// Install Nerd Fonts Web
// npm install --save @nerd-fonts/fontface

// In _app.tsx or layout component
import '@nerd-fonts/fontface/css/symbols-nerd-font.css'

// Icon constants
const ICONS = {
  // View mode icons
  grid: '',        // nf-cod-symbol_namespace (grid view)
  calendar: '',    // nf-fa-calendar (year view)
  folder: '',      // nf-fa-folder (files view)
  
  // File tree icons
  folderClosed: '',     // nf-fa-folder
  folderOpen: '',       // nf-fa-folder_open
  folderEmpty: '',      // nf-custom-folder
  file: '',             // nf-fa-file_image_o
  chevronRight: '',     // nf-fa-chevron_right
  chevronDown: '',      // nf-fa-chevron_down
  
  // UI elements
  sort: '',             // nf-fa-sort
  sortUp: '',           // nf-fa-sort_amount_asc
  sortDown: '',         // nf-fa-sort_amount_desc
  close: '',            // nf-fa-times
  expand: '',           // nf-oct-unfold
  collapse: '',         // nf-oct-fold
  photo: '',            // nf-fa-picture_o
  
  // Status icons
  loading: '',          // nf-fa-spinner (animate with CSS)
  check: '',            // nf-fa-check
  warning: '',          // nf-fa-warning
  error: '',            // nf-fa-times_circle
}
```

#### View Mode Selector Component
Location: `frontend/src/components/ViewModeSelector.tsx`
```tsx
interface ViewModeSelectorProps {
  currentMode: 'grid' | 'year' | 'files'
  onModeChange: (mode: 'grid' | 'year' | 'files') => void
}

// Visual representation
<div className="view-mode-selector">
  <button className="active"> Grid</button>
  <button> Year</button>
  <button> Files</button>
</div>
```

### 1. Grid View (Current Mode)
**Description**: Traditional photo grid sorted by date (newest/oldest)
**Icon**: `` (nf-cod-symbol_namespace)
**Features**:
- Infinite scroll with lazy loading
- Sort toggle (newest first `` / oldest first ``)
- Masonry layout with responsive columns
- Click to open full-screen viewer

**Current Implementation**:
- Component: `PhotoGridSimple.tsx`
- Sorting: By `created_at` or `date_taken`
- Page size: 100 photos
- Prefetch: 800px ahead

### 2. Year View (UPDATED)
**Description**: Grid of year cards with preview photos (like Apple Photos)
**Implementation**: Grid layout with favorite photo as preview

#### Current Implementation
- **Year cards grid**: Shows all years as cards with preview image
- **Favorite priority**: If a photo is marked as favorite in that year, it becomes the preview
- **Photo count badges**: Shows total photos per year
- **Click navigation**: Clicking a year card opens year detail view
- **Zoom control**: Adjustable grid density (2-8 columns)

#### Visual Layout
```
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ [IMG]  │ │ [IMG]  │ │ [IMG]  │ │ [IMG]  │
│  2024  │ │  2023  │ │  2022  │ │  2021  │
│ 709 photos │ 70 photos │ 258 photos │ 1945 photos
└────────┘ └────────┘ └────────┘ └────────┘
```

#### Technical Implementation
**Component**: `frontend/src/components/YearView.tsx`

**Features**:
- Year cards with `` expand/collapse icons
- Month sections with photo counts
- Collapsible year sections (`` collapsed, `` expanded)
- Jump-to-year navigation sidebar
- Photo count badges

**Data Structure**:
```typescript
interface YearGroup {
  year: number
  photoCount: number
  months: MonthGroup[]
  previewPhotos: Photo[] // First 4 photos for year card
  isExpanded: boolean
}

interface MonthGroup {
  month: number // 1-12
  monthName: string // "January", "February", etc.
  photoCount: number
  photos: Photo[]
}
```

**API Endpoints**:
- `GET /api/v1/photos/years` - Get list of years with counts
- `GET /api/v1/photos/year/{year}` - Get photos for specific year
- `GET /api/v1/photos/year/{year}/month/{month}` - Get photos for specific month

**Performance Considerations**:
- Lazy load month sections within expanded years
- Virtual scrolling for large month collections
- Cache year/month data structure
- Prefetch adjacent years

### 3. Files View (UPDATED)
**Description**: File system tree navigation with recursive photo display
**Implementation**: Split panel with folder tree and photo grid

#### Current Implementation
- **Recursive display**: Shows ALL photos under selected folder and subfolders
- **Photo counts**: Each folder shows total recursive photo count
- **Split panel**: Draggable divider between tree and photos
- **Breadcrumb navigation**: Shows current path with "(recursive)" indicator
- **Zoom control**: Adjustable grid density (2-8 columns)

#### Key Feature: Recursive Browsing
When you select a folder like "2019", it shows ALL photos from 2019 and its subfolders, allowing users to browse by their logical folder groupings rather than having to navigate into each individual subfolder.

#### Visual Layout
```
┌─────────────────┬────────────────────────┐
│  Folders        │ /photos/2019 (6350 photos recursive) │
├─────────────────┼────────────────────────┤
│  📁 photos      │ ┌──┐ ┌──┐ ┌──┐ ┌──┐   │
│  ├ 📁 2019 (6350) │ └──┘ └──┘ └──┘ └──┘   │
│  │ ├ 📁 Camera (1688) │ ┌──┐ ┌──┐ ┌──┐ ┌──┐   │
│  │ └ 📁 Uploads (399) │ └──┘ └──┘ └──┘ └──┘   │
│  ├ 📁 2020 (2059) │ (All photos from 2019 and subfolders)  │
│  └ 📁 2021 (1945) │                        │
└─────────────────┴────────────────────────┘
```

#### Technical Implementation
**Component**: `frontend/src/components/FilesView.tsx`

**Features**:
- Collapsible file tree with Nerd Font icons:
  - `` Closed folder
  - `` Open folder
  - `` Empty folder
  - `` Expand chevron
  - `` Collapse chevron
- Directory lazy loading with `` spinner
- Breadcrumb navigation with `/` separators
- Right-click context menu
- Split view with draggable divider

**Sub-components**:
```typescript
// FileTree component with icons
interface FileTreeNode {
  id: string
  path: string
  name: string
  type: 'directory' | 'file'
  icon: string // Nerd Font character
  children?: FileTreeNode[]
  photoCount?: number
  isExpanded?: boolean
  isLoading?: boolean
}

// Tree node rendering
<div className="tree-node">
  <span className="icon">{node.isExpanded ? '' : ''}</span>
  <span className="folder-icon">{node.isExpanded ? '' : ''}</span>
  <span className="name">{node.name}</span>
  <span className="count">({node.photoCount})</span>
</div>
```

**API Endpoints**:
- `GET /api/v1/folders/tree` - Get folder tree structure
- `GET /api/v1/folders/{id}/children` - Get child folders
- `GET /api/v1/folders/{id}/photos` - Get photos in folder

**Performance Considerations**:
- Virtualized tree rendering for large structures
- Incremental tree loading
- Cache expanded folder states
- Resizable split pane with saved preferences

### Implementation Plan

#### Phase 1: View Mode Infrastructure
1. Create ViewModeSelector component
2. Add view mode state management (Context/Store)
3. Update router to handle view mode URLs (`/?view=grid|year|files`)
4. Add view mode persistence

#### Phase 2: Year View Implementation
1. Create YearView component
2. Add year/month grouping API endpoints
3. Implement year card grid
4. Add month sections with dividers
5. Implement expand/collapse functionality
6. Add year navigation sidebar

#### Phase 3: Files View Implementation  
1. Create FileTree component
2. Add folder tree API endpoints
3. Implement split pane layout
4. Add tree node expand/collapse
5. Implement breadcrumb navigation

#### Phase 4: Polish & Optimization
1. Add keyboard shortcuts
2. Implement view mode transitions
3. Add loading states and skeletons
4. Performance optimization (virtualization, caching)
5. Mobile responsive design
6. User preference persistence

### Complete API Endpoints Reference

```
/api/v1/
├── photos/
│   ├── / (GET) - List photos with pagination
│   ├── /{id} (GET) - Get single photo
│   ├── /{id}/favorite (PATCH) - Toggle favorite status
│   ├── /{id}/rotation (PATCH) - Update rotation
│   ├── /years (GET) - Get years with preview photos and counts
│   ├── /year/{year} (GET) - Get all photos for a year
│   ├── /year/{year}/month/{month} (GET) - Get photos for specific month
│   └── /duplicates (GET) - Find duplicate photos
├── folders/
│   ├── /tree (GET) - Get complete folder tree with counts
│   ├── /{path}/photos (GET) - Get photos in folder (recursive by default)
│   └── /{id}/children (GET) - Get child folders (for lazy loading)
├── thumbnails/
│   ├── /{id}/150 (GET) - Small thumbnail
│   ├── /{id}/400 (GET) - Medium thumbnail
│   ├── /{id}/1200 (GET) - Large thumbnail
│   └── /{id}/full (GET) - Full-size image
├── jobs/
│   ├── / (GET) - List all jobs
│   └── /cancel/{id} (POST) - Cancel a job
└── system/
    ├── /stats (GET) - System statistics
    └── /health (GET) - Health check
```

### Database Schema Updates

```sql
-- Add user preferences table for view settings
CREATE TABLE user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  default_view_mode VARCHAR(20) DEFAULT 'grid',
  files_view_split_position INTEGER DEFAULT 250,
  year_view_collapsed_years JSONB DEFAULT '[]',
  files_view_expanded_paths JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for year/month queries
CREATE INDEX idx_photos_year ON photos(EXTRACT(YEAR FROM COALESCE(date_taken, created_at)));
CREATE INDEX idx_photos_year_month ON photos(
  EXTRACT(YEAR FROM COALESCE(date_taken, created_at)),
  EXTRACT(MONTH FROM COALESCE(date_taken, created_at))
);
```

### Implementation CSS for Nerd Fonts

```css
/* Import Nerd Fonts */
@import '@nerd-fonts/fontface/css/symbols-nerd-font.css';

/* Icon styling */
.nf-icon {
  font-family: 'Symbols Nerd Font', monospace;
  font-size: 1.2em;
  vertical-align: middle;
  margin-right: 0.5em;
}

/* Spinning loader animation */
.nf-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* View mode buttons */
.view-mode-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.view-mode-btn .nf-icon {
  font-size: 1.1em;
}

/* File tree styling */
.file-tree-node {
  display: flex;
  align-items: center;
  padding: 0.25rem 0;
  cursor: pointer;
}

.file-tree-node:hover {
  background: rgba(0, 0, 0, 0.05);
}

.file-tree-node .chevron {
  width: 1em;
  transition: transform 0.2s;
}

.file-tree-node.expanded .chevron {
  transform: rotate(90deg);
}
```

### Component Examples

#### ViewModeSelector with Icons
```tsx
const ViewModeSelector = ({ currentMode, onModeChange }) => {
  return (
    <div className="flex gap-2">
      <button 
        className={`view-mode-btn ${currentMode === 'grid' ? 'active' : ''}`}
        onClick={() => onModeChange('grid')}
      >
        <span className="nf-icon"></span> Grid
      </button>
      <button 
        className={`view-mode-btn ${currentMode === 'year' ? 'active' : ''}`}
        onClick={() => onModeChange('year')}
      >
        <span className="nf-icon"></span> Year
      </button>
      <button 
        className={`view-mode-btn ${currentMode === 'files' ? 'active' : ''}`}
        onClick={() => onModeChange('files')}
      >
        <span className="nf-icon"></span> Files
      </button>
    </div>
  )
}
```

#### FileTreeNode with Icons
```tsx
const FileTreeNode = ({ node, onToggle, onSelect }) => {
  return (
    <div className="file-tree-node">
      <span 
        className="chevron nf-icon" 
        onClick={() => onToggle(node.id)}
      >
        {node.children ? (node.isExpanded ? '' : '') : ''}
      </span>
      <span className="folder-icon nf-icon">
        {node.isExpanded ? '' : ''}
      </span>
      <span className="name" onClick={() => onSelect(node)}>
        {node.name}
      </span>
      {node.photoCount > 0 && (
        <span className="count">({node.photoCount})</span>
      )}
    </div>
  )
}
```

### Keyboard Shortcuts
- **G** - Switch to Grid view
- **Y** - Switch to Year view  
- **F** - Switch to Files view
- **↑/↓** - Navigate tree (in Files view)
- **←/→** - Collapse/Expand folders
- **Enter** - Select folder/year

### Testing Requirements

1. **View Mode Switching**: Seamless transitions between modes
2. **Data Consistency**: Same photos visible across all views
3. **Performance**: Fast loading and scrolling in all modes
4. **State Persistence**: View preferences saved across sessions
5. **Responsive Design**: All views work on mobile/tablet/desktop

---

## Important: Test File Location
**All Playwright/browser test files MUST be placed in the `tests/js/` directory**

Do NOT create test files in the project root. The correct location is:
```
tests/js/
├── test-jobs-modal.js
├── test-cancel-button.js
├── test-scan-button.js
└── ... other test files
```

## Quick Reference

### Running Tests
```bash
# Always run tests from project root
node tests/js/test-name.js
```

### Creating New Tests
When creating new Playwright tests:
1. Create the file in `tests/js/` directory
2. Name it with `test-` prefix
3. Use descriptive names (e.g., `test-feature-name.js`)

### Test Template
```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Test description...');
  await page.goto('http://localhost:3000');
  
  // Test logic here
  
  await browser.close();
})();
```

## Key Components to Test

### Jobs Modal (`/frontend/src/components/JobsModal.tsx`)
- Scan My Library button functionality
- Job progress display
- Cancel button with two-step confirmation
- Minimize/restore behavior

### Status Bar (`/frontend/src/components/StatusBar.tsx`)
- Jobs button (always visible with ⚡ icon)
- Click to open/minimize jobs modal
- Active job count display

## Testing Checklist
- [ ] Test file created in `tests/js/` directory
- [ ] Descriptive test name with `test-` prefix
- [ ] Console output for test progress
- [ ] Proper cleanup (browser.close())
- [ ] Reasonable timeouts for async operations

## Common Test Scenarios
1. **Modal Operations**: Opening, closing, minimizing
2. **Job Management**: Starting scans, canceling jobs
3. **UI Feedback**: Progress bars, status messages
4. **Error Handling**: Network failures, invalid states

---
Remember: All test files go in `tests/js/` - this keeps the project root clean and organized.

---

## 🔧 Technical Context

### Key Files Modified
- `frontend/src/components/ImageViewer.tsx` - Full image viewer component
- `frontend/src/components/PhotoGridSimple.tsx` - Masonry grid with lazy loading and cache-busting
- `backend/api/photos.py` - Added rotation endpoint
- `backend/tasks/thumbnails.py` - Parallel thumbnail processing
- `backend/models/photo.py` - Added user_rotation field
- `frontend/src/pages/index.tsx` - Main page with infinite scroll

### Database Changes
```sql
-- Added to photos table
user_rotation INTEGER DEFAULT 0  -- User manual rotation (0, 90, 180, 270)
```

### Performance Settings
- Thumbnail workers: 4 (reduced from 8)
- Batch size: 40 photos (reduced from 80)
- Page size: 100 photos (increased from 50)
- Prefetch distance: 800px (increased from 100px)
- Cache time: 5 minutes
- Delay between batches: 500ms (to prioritize UI)

### Environment Variables
```bash
MAX_THUMBNAIL_WORKERS=4
THUMBNAIL_BATCH_SIZE=40
DB_COMMIT_BATCH_SIZE=10
PROGRESS_UPDATE_INTERVAL=5
```

### API Endpoints Added
- `PATCH /api/v1/photos/{id}/rotation` - Save user rotation
- `GET /api/v1/thumbnails/{id}/full` - Get full-size image

### Important Patterns
1. Use `ImageOps.exif_transpose()` for EXIF orientation
2. Combine `rotation_applied` + `user_rotation` for total rotation
3. Don't delete thumbnails before regenerating (overwrite in place)
4. Use lower priority for background tasks to prioritize UI

### Testing

#### Container Management
- Run containers: `docker-compose -f docker-compose.dev.yml up`
- Restart backend: `docker restart bokeh-backend-1`
- Check logs: `docker logs bokeh-backend-1 --tail 20`

#### Feature Tests
- Test viewer: `node tests/js/test-viewer-complete.js`
- Test rotation: `node tests/js/test-rotation.js`
- Test image viewer: `node tests/js/test-image-viewer.js`
- Test orientation: `node tests/js/test-orientation-status.js`
- Test thumbnail updates: `node tests/js/test-img7667-rotation.js`
- Test visual rotation: `node tests/js/test-rotation-visual-check.js`

#### New Feature Tests (Latest Session)
- Test view modes: `node tests/js/test-view-modes.js`
- Test year view: `node tests/js/test-year-view-favorites.js`
- Test files recursive: `node tests/js/test-files-recursive.js`
- Test subtle zoom: `node tests/js/test-subtle-zoom.js`
- Test zoom modal: `node tests/js/test-zoom-modal.js`

### Keyboard Shortcuts

#### Global Shortcuts
- **G**: Switch to Grid view
- **Y**: Switch to Year view
- **F**: Switch to Files view
- **Cmd/Ctrl + Plus**: Increase grid density (zoom in)
- **Cmd/Ctrl + Minus**: Decrease grid density (zoom out)
- **Cmd/Ctrl + 0**: Reset grid density to default

#### Image Viewer Shortcuts
- **Arrow Left/Right**: Navigate photos
- **Escape**: Close viewer
- **i/I**: Toggle info panel
- **+/=**: Zoom in
- **-/_**: Zoom out
- **r**: Rotate right
- **R**: Rotate left
- **f**: Toggle favorite (not yet implemented with shortcut)

### Common Issues & Fixes
1. **Duplicate API requests**: Set `refetchInterval: false` in React Query
2. **Thumbnail blocking UI**: Add delays and reduce worker count
3. **PostgreSQL JSON errors**: Use subquery instead of DISTINCT on JSON columns
4. **React init errors**: Define state variables before using in dependencies
5. **Thumbnail cache not updating**: Use Map<id, timestamp> for consistent cache-busting URLs

## 📚 Technical Deep Dive: Thumbnail Rotation Sync

### The Problem
When rotating an image in the lightbox viewer, the thumbnail in the grid view wasn't updating without a page refresh. Browser caching prevented the updated thumbnail from loading even though the server had regenerated it.

### The Solution
Implemented a dual-layer cache-busting strategy:

1. **Version-based caching** (`?v=version`):
   - Long-term cache management
   - Increments with each rotation
   - Persists across sessions

2. **Timestamp-based cache bypass** (`&_t=timestamp`):
   - Temporary parameter for recently rotated images
   - Stored in a Map<photoId, timestamp> for consistency
   - Cleared 5 seconds after viewer closes
   - Ensures immediate updates without breaking cache efficiency

### Implementation Details

```typescript
// PhotoGridSimple.tsx - Key changes

// Changed from Set to Map to store consistent timestamps
const [recentlyRotated, setRecentlyRotated] = useState<Map<number, number>>(new Map())

// Store timestamp when rotation occurs
const handleRotationUpdate = (photoId: number, rotationVersion: number) => {
  setRecentlyRotated(prev => {
    const newMap = new Map(prev)
    newMap.set(photoId, Date.now())  // Store timestamp once
    return newMap
  })
  setLocalThumbnailVersions(prev => new Map(prev).set(photoId, rotationVersion))
}

// Use stored timestamp for consistent URLs
const getThumbnailUrl = (photo: Photo) => {
  const baseUrl = `http://localhost:8000/api/v1/thumbnails/${photo.id}/400`
  const version = localThumbnailVersions.get(photo.id) || photo.rotation_version || 0
  const rotationTimestamp = recentlyRotated.get(photo.id)  // Get stored timestamp
  
  if (rotationTimestamp && version) {
    return `${baseUrl}?v=${version}&_t=${rotationTimestamp}`  // Consistent URL
  }
  return version ? `${baseUrl}?v=${version}` : baseUrl
}

// Clear timestamps after delay
const handleViewerClose = () => {
  setTimeout(() => {
    setRecentlyRotated(new Map())  // Clear all timestamps
  }, 5000)
}
```

### Why This Works

1. **Consistent URLs during render cycles**: By storing timestamps in a Map, the same timestamp is used across all renders until explicitly cleared.

2. **Browser cache bypass**: The `_t` parameter forces the browser to fetch the new image, bypassing any cached version.

3. **Temporary bypass window**: The 5-second delay allows the thumbnail to fully regenerate server-side before removing the bypass.

4. **Performance maintained**: After the bypass window, normal version-based caching resumes, maintaining performance for non-rotated images.

### Testing Verification

Created comprehensive tests that confirm:
- URL changes from `?v=3` to `?v=4&_t=timestamp` after rotation
- Visual confirmation via screenshots (180° rotation visible)
- Persistence after refresh (version retained, timestamp removed)
- No unnecessary re-fetches during normal browsing