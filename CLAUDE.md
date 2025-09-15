# Claude Development Instructions for Bokeh

## 📅 Recent Work Completed (2025-01-15)

### Session Summary
Successfully implemented a full-screen image viewer with rotation persistence and significant performance optimizations.

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

3. **Performance Fixes**
   - Grid: 800px prefetch, 100 photos/page, 5-min cache
   - Thumbnails: Reduced workers to 4, added delays for UI priority
   - Fixed duplicate API requests issue
   - Added image preloading for scroll performance

### Current State
- ✅ Photo grid with infinite scroll working smoothly
- ✅ Image viewer fully functional with all controls
- ✅ Rotation saves and persists correctly
- ✅ Thumbnails regenerate with proper orientation
- ✅ Performance optimized for large libraries (tested with 11,000+ photos)

### Known Issues
- **Thumbnail Rotation Sync**: When rotating an image in the viewer, the thumbnail in the grid doesn't update immediately. Requires page refresh to see rotated thumbnails. Need to implement real-time sync between viewer rotation and grid thumbnails.
- **TIF/TIFF Files**: Don't load in the full-screen image viewer (lightbox). Thumbnails work but full-size viewing fails. Need to add TIF support to the `/thumbnails/{id}/full` endpoint.
- **RAW/HEIF Files**: RAW files (CR2, NEF, ARW) and HEIF/HEIC files don't display in viewer. Need server-side conversion.
- Thumbnail regeneration takes time but doesn't block UI

### Important Decisions Made
- **No Coral TPU**: Decided against using Coral TPU for ML orientation - EXIF handles most cases, complexity not worth it
- **Thumbnail Strategy**: Overwrite thumbnails in-place rather than delete-then-recreate to avoid broken images
- **Concurrency**: Reduced workers to 4 rather than implement complex job queuing - simpler and effective

---

## 🎯 Next Session Tasks (Priority Order)

### 1. Fix Thumbnail Rotation Sync
- Implement real-time thumbnail updates in grid when image is rotated in viewer
- Consider optimistic UI updates or cache invalidation strategy
- Test with WebSocket/SSE for real-time updates

### 2. Fix TIF/TIFF Support in Image Viewer
- Add support for TIF files in the full-screen viewer
- Modify `/thumbnails/{id}/full` endpoint to handle TIF conversion
- Consider server-side conversion to JPEG for browser compatibility

### 3. Batch Operations
- Add multi-select mode to grid
- Implement bulk operations (rotate, delete, favorite)
- Keyboard shortcuts for selection

### 2. Search & Filtering
- Add search bar component
- Implement filename search
- Add date range filtering
- Quick filter buttons

### 3. Album/Folder Organization  
- Create album management UI
- Add photo-to-album assignment
- Implement folder tree navigation

### 4. Settings Page
- Scan directory configuration
- Performance tuning options
- User preferences

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

### Key Files Modified Today
- `frontend/src/components/ImageViewer.tsx` - Full image viewer component
- `frontend/src/components/PhotoGridSimple.tsx` - Masonry grid with lazy loading
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
- Run containers: `docker-compose -f docker-compose.dev.yml up`
- Test viewer: `node tests/js/test-viewer-complete.js`
- Test rotation: `node tests/js/test-rotation.js`
- Test image viewer: `node tests/js/test-image-viewer.js`
- Test orientation: `node tests/js/test-orientation-status.js`

### Keyboard Shortcuts (Image Viewer)
- **Arrow Left/Right**: Navigate photos
- **Escape**: Close viewer
- **i/I**: Toggle info panel
- **+/=**: Zoom in
- **-/_**: Zoom out
- **r**: Rotate right
- **R**: Rotate left

### Common Issues & Fixes
1. **Duplicate API requests**: Set `refetchInterval: false` in React Query
2. **Thumbnail blocking UI**: Add delays and reduce worker count
3. **PostgreSQL JSON errors**: Use subquery instead of DISTINCT on JSON columns
4. **React init errors**: Define state variables before using in dependencies