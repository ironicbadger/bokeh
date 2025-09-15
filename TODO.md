# Bokeh - Todo List

## ✅ Completed Features (2025-01-15)

### Full-Screen Image Viewer with Rotation Persistence
**Status**: Completed ✅  
- Full-screen display with keyboard navigation (arrows, Esc, i for info)
- EXIF metadata display panel with file info, dimensions, camera data
- Zoom controls (+/- keys) and rotation controls (R key)
- Manual rotation persistence saved to database
- Automatic thumbnail regeneration when rotated
- Image preloading for smooth navigation (3 images ahead/behind)
- Thumbnail strip for quick navigation

### EXIF-Based Image Orientation
**Status**: Completed ✅  
- Automatic EXIF orientation detection and correction
- Applied during thumbnail generation with `ImageOps.exif_transpose()`
- Database fields: `original_orientation`, `rotation_applied`, `user_rotation`
- Combined EXIF + user rotation for final display

### Performance Optimizations
**Status**: Completed ✅  
- Grid lazy loading with 800px prefetch distance
- Increased page size to 100 photos per request
- 5-minute cache time to prevent duplicate fetches
- Image preloading for 10 rows ahead of scroll
- Reduced thumbnail workers to 4 with lower priority
- 500ms delay between thumbnail batches to prioritize UI

### UI/UX Improvements
**Status**: Completed ✅  
- Masonry-style photo grid with minimal gaps
- Fixed header pinned to top
- Sort controls for date ordering (newest/oldest)
- Library size shown in GB/TB instead of percentages
- Real-time grid population during scanning
- Force regenerate thumbnails button
- Progress tracking with actual items/total

---

## 🚀 Immediate Next Steps

### Thumbnail Rotation Sync
**Status**: Not Started  
**Priority**: High  
**Issue**: When user rotates an image in the viewer, the thumbnail in the grid view doesn't update immediately
- Need real-time thumbnail update in grid when rotation is saved
- Options to implement:
  - Invalidate React Query cache for affected photo
  - WebSocket/SSE for real-time updates
  - Optimistic UI update with temporary rotation CSS
- Currently requires page refresh to see rotated thumbnails in grid
- Consider showing rotation indicator while thumbnail regenerates

### TIF/TIFF File Support in Image Viewer
**Status**: Not Started  
**Priority**: High  
**Issue**: TIF/TIFF files don't load in the full-screen image viewer (lightbox)
- Thumbnails likely work since they're converted to JPEG
- Full-size endpoint may need to convert TIF to JPEG on-the-fly
- Or serve TIF with proper MIME type and ensure browser compatibility
- Test with various TIF formats (compressed, uncompressed, multi-page)
- Consider using Canvas API or converting server-side for compatibility

### RAW/HEIF File Support in Image Viewer
**Status**: Not Started  
**Priority**: Medium  
**Issue**: RAW files (CR2, NEF, ARW) and HEIF/HEIC don't display in viewer
- Similar to TIF issue - thumbnails work but full-size viewing fails
- Need server-side conversion for browser compatibility
- Consider caching converted versions for performance

### Batch Operations
**Status**: Not Started  
**Priority**: High  
- Multi-select mode with Shift+Click and Ctrl+Click
- Bulk rotate, delete, favorite operations
- Visual selection feedback
- Keyboard shortcuts for common operations

### Photo Search & Filtering
**Status**: Not Started  
**Priority**: High  
- Search by filename
- Filter by date range
- Filter by camera/device
- Quick filter buttons (favorites, recent, etc.)

### Folder/Album Organization
**Status**: Not Started  
**Priority**: High  
- Create albums/collections
- Move photos between albums
- Folder tree navigation
- Virtual folders based on metadata

### Settings Page Improvements
**Status**: Not Started  
**Priority**: Medium  
- Configure scan directories
- Thumbnail quality settings
- Performance tuning options
- User preferences

---

## 🔄 In Progress

### ML-Based Image Orientation Detection
**Status**: Not Started  
**Complexity**: Medium  
**Dependencies**: TensorFlow/PyTorch, Pre-trained model

#### Purpose
Automatically detect and correct image orientation for photos without EXIF data using machine learning.

#### Background
Currently, we use EXIF orientation tags to auto-rotate images (implemented). However, many images lack EXIF data:
- Screenshots
- Images from older cameras
- Images that have been processed/edited
- Images from certain apps that strip EXIF

#### Implementation Strategy

1. **Model Selection**
   - Use lightweight CNN (MobileNet or EfficientNet based)
   - 4-class classification: 0°, 90°, 180°, 270°
   - Target model size: <10MB for fast loading
   - Expected accuracy: 90-95%

2. **Training Approach**
   - Option A: Use pre-trained model from research papers
   - Option B: Fine-tune ImageNet model with rotation augmentation
   - Option C: Train from scratch with augmented dataset

3. **Integration Points**
   ```python
   # Backend processing flow
   if photo.original_orientation is None:  # No EXIF data
       confidence, rotation = ml_detect_orientation(photo.filepath)
       if confidence > 0.85:  # 85% threshold
           photo.rotation_applied = rotation
           photo.orientation_corrected = True
           regenerate_thumbnails(photo.id)
   ```

4. **Performance Considerations**
   - Process as background job after initial scan
   - Batch processing for efficiency
   - Cache model in memory
   - Optional GPU acceleration (not Coral TPU based on analysis)

5. **Database Schema (Already Added)**
   - `original_orientation`: EXIF value (1-8)
   - `rotation_applied`: Degrees rotated (0, 90, 180, 270)
   - `orientation_corrected`: Boolean flag
   - `orientation_confidence`: Float (to be added for ML)

#### Technical Requirements

1. **Python Dependencies**
   ```txt
   tensorflow>=2.10.0  # or pytorch>=2.0.0
   opencv-python>=4.8.0
   scikit-image>=0.20.0
   ```

2. **Model Architecture Example**
   ```python
   model = tf.keras.Sequential([
       tf.keras.layers.Conv2D(32, (3, 3), activation='relu', input_shape=(224, 224, 3)),
       tf.keras.layers.MaxPooling2D((2, 2)),
       tf.keras.layers.Conv2D(64, (3, 3), activation='relu'),
       tf.keras.layers.MaxPooling2D((2, 2)),
       tf.keras.layers.Conv2D(128, (3, 3), activation='relu'),
       tf.keras.layers.GlobalAveragePooling2D(),
       tf.keras.layers.Dense(128, activation='relu'),
       tf.keras.layers.Dropout(0.5),
       tf.keras.layers.Dense(4, activation='softmax')  # 4 rotation classes
   ])
   ```

3. **API Endpoint**
   ```python
   @router.post("/api/v1/photos/detect-orientation")
   async def detect_orientation(
       photo_ids: List[int] = None,
       confidence_threshold: float = 0.85
   ):
       """Process photos without EXIF orientation"""
   ```

#### Testing Strategy
1. Create test dataset with known rotations
2. Measure accuracy on different image types:
   - Natural photos
   - Screenshots
   - Documents
   - Art/illustrations
3. Performance benchmarks:
   - Target: <500ms per image on CPU
   - Batch processing: 10+ images/second

#### References
- [Deep Image Orientation Angle Detection (2020)](https://arxiv.org/abs/2007.06709)
- [Correcting Image Orientation Using CNNs](https://d4nst.github.io/2017/01/12/image-orientation/)
- [TensorFlow.js implementation](https://github.com/pidahbus/deep-image-orientation-angle-detection)

#### Decision: Coral TPU
After analysis, decided NOT to use Coral TPU because:
- Requires model conversion and INT8 quantization
- EXIF handling solves most cases
- Complexity outweighs benefits for this specific task
- Better suited for real-time inference or more complex ML tasks

---

## Medium Priority

### Face Detection and Grouping
- Detect faces in photos
- Group photos by people
- Privacy-focused (all processing local)

### Smart Albums
- Auto-categorize by scene type
- Date-based collections
- Location clustering (from GPS EXIF)

### Advanced Search
- Natural language queries
- Similar image search
- Filter by camera settings

---

## Low Priority

### Photo Editing
- Basic adjustments (brightness, contrast)
- Crop and rotate UI
- Batch operations

### Sharing Features
- Generate share links
- Album sharing
- Export collections

### Mobile App
- React Native companion app
- Photo backup from phone
- Remote browsing