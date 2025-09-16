# Auto-Reload System Documentation

## Overview
The auto-reload system enables real-time photo grid updates during scanning and thumbnail generation, providing a seamless user experience where new photos appear automatically without manual refresh.

## Key Features

### 1. Photo Visibility Control
Photos only appear in the grid after their thumbnails are successfully generated. This is enforced at the API level:

```python
# backend/api/photos.py
# Only get photos that have at least one thumbnail
subquery = db.query(Thumbnail.photo_id).filter(
    Thumbnail.size == "400"
).subquery()

query = db.query(Photo).filter(
    Photo.is_deleted == False,
    Photo.id.in_(subquery)
)
```

### 2. Sorting Options

#### Default: "Most Recently Added"
- Sorts by `created_at` timestamp (when photo was added to library)
- New photos appear at the top immediately after processing
- Ideal for watching new imports appear in real-time

#### Alternative: "Date Taken"
- Sorts by `date_taken` from EXIF metadata
- Photos appear in chronological order of when they were captured
- Better for browsing historical photos

### 3. Smart Polling System

The frontend uses a two-tier polling strategy to detect new photos efficiently:

```typescript
// frontend/src/pages/index.tsx

// Lightweight count polling
const { data: photoCountData } = useQuery({
  queryKey: ['photoCount'],
  queryFn: fetchPhotoCount,
  refetchInterval: hasActiveJobs ? 2000 : 10000, // 2s during jobs, 10s idle
  enabled: viewMode === 'grid'
})

// When count increases, fetch only new photos
if (currentCount > lastPhotoCount && latestCreatedAt) {
  fetchRecentPhotos(latestCreatedAt, currentCount - lastPhotoCount + 10)
    .then(response => {
      // Trigger grid refresh with new photos
      queryClient.invalidateQueries(['photos', sortOrder, sortBy])
    })
}
```

## API Endpoints

### GET /api/v1/photos/count
Returns the current count of photos with thumbnails and the latest photo's timestamp.

**Response:**
```json
{
  "count": 13078,
  "latest_created_at": "2025-09-16T00:29:45.491582"
}
```

### GET /api/v1/photos/recent
Fetches photos added after a specific timestamp.

**Parameters:**
- `since` (optional): ISO timestamp to get photos created after
- `limit`: Maximum number of photos to return (default: 50, max: 200)

**Response:**
```json
{
  "data": [...], // Array of photo objects
  "count": 5
}
```

### GET /api/v1/photos
Updated to support `created_at` sorting.

**Parameters:**
- `sort`: Now accepts `created_at`, `date_taken`, `filename`, `size`, `rating`
- `order`: `asc` or `desc`
- Default: `sort=created_at&order=desc`

## Frontend Components

### SortSelector Component
Located at `frontend/src/components/SortSelector.tsx`

Provides UI for switching between sort modes:
- "Recently Added" (created_at)
- "Date Taken" (date_taken)
- "Newest First" / "Oldest First" toggle

### Auto-Reload Logic
Located in `frontend/src/pages/index.tsx`

Key features:
1. Polls `/photos/count` every 2 seconds during active jobs
2. Detects count increases
3. Fetches only new photos via `/photos/recent`
4. Invalidates React Query cache to trigger UI update
5. Shows "• Scanning for new photos..." indicator

## User Experience Flow

1. **User starts a scan** via Jobs modal
2. **Scanner finds photos** and adds them to database
3. **Thumbnail jobs process** each photo
4. **As thumbnails complete**, photos become visible
5. **Frontend detects new photos** via count polling
6. **Grid updates automatically** with new photos at top (if sorted by "Recently Added")
7. **Visual feedback** shows scanning is active

## Performance Optimizations

### Lightweight Polling
- Count endpoint returns only two values (count + timestamp)
- Minimal database query overhead
- No heavy photo data transferred during polling

### Incremental Loading
- Only fetches photos added since last check
- Avoids reloading entire photo list
- Uses React Query cache invalidation for efficient updates

### Configurable Poll Rates
- Active jobs: 2-second intervals
- Idle: 10-second intervals
- Only polls in grid view (disabled in year/files views)

## Configuration

### Backend Environment Variables
```bash
# No specific env vars needed for auto-reload
# Uses existing database and API configuration
```

### Frontend Behavior
```typescript
// Poll intervals (hardcoded for reliability)
const ACTIVE_POLL_INTERVAL = 2000;  // 2 seconds during jobs
const IDLE_POLL_INTERVAL = 10000;   // 10 seconds when idle
```

### User Preferences
- Sort preference saved to localStorage as `photoSortBy`
- Persists across sessions
- Defaults to `created_at` for new users

## Testing

### Manual Testing
1. Start a scan via Jobs modal
2. Switch to "Recently Added" sort
3. Watch as new photos appear at the top of grid
4. Verify "• Scanning for new photos..." indicator shows

### Automated Test
```bash
node tests/js/test-auto-reload.js
```

Tests:
- Sort selector visibility and functionality
- API endpoints (/count, /recent)
- Sorting behavior
- Photo count updates

## Troubleshooting

### Photos not appearing automatically
1. Verify sort is set to "Recently Added"
2. Check if thumbnails are generating (Jobs modal)
3. Ensure browser allows JavaScript polling
4. Check backend logs for thumbnail generation errors

### Sort not persisting
1. Clear localStorage and reload
2. Check browser console for errors
3. Verify localStorage is enabled

### Performance issues
1. Reduce poll frequency if needed
2. Check database indexes on `created_at` field
3. Monitor thumbnail generation worker count

## Future Enhancements

1. **WebSocket Support**: Replace polling with real-time WebSocket updates
2. **Progressive Loading**: Stream photos as they're ready rather than batch
3. **Smart Prefetch**: Predict which photos will be ready next
4. **Notification System**: Toast notifications for new photos
5. **Selective Updates**: Only update visible portions of grid
6. **Background Sync**: Continue updating even when tab is not focused

## Related Documentation
- [Cache Management](./CACHE_MANAGEMENT.md) - Cache invalidation and thumbnail versioning
- [Photo Import Workflow](../CLAUDE.md#photo-ingestion-workflow) - How photos are scanned and imported
- [Thumbnail Generation](../CLAUDE.md#image-processing-pipeline) - Thumbnail creation process