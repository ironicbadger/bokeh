import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Info, ZoomIn, ZoomOut, RotateCw, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'

interface Photo {
  id: number
  filename: string
  rotation_version?: number
  final_rotation?: number
  [key: string]: any
}

interface ImageViewerProps {
  photos: Photo[]
  initialIndex: number
  onClose: () => void
  onRotationUpdate?: (photoId: number, rotationVersion: number) => void
  onBatchRotationUpdate?: (updates: Map<number, number>) => void
}

export default function ImageViewer({ photos, initialIndex, onClose, onRotationUpdate, onBatchRotationUpdate }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [zoom, setZoom] = useState(1)
  const [showInfo, setShowInfo] = useState(false)
  
  // Track rotation state for each photo
  const [photoRotations, setPhotoRotations] = useState<Map<number, number>>(new Map())
  const [isRotating, setIsRotating] = useState(false)
  // Track which photos have been rotated in this session
  const rotatedPhotos = useRef<Set<number>>(new Set())
  // Track rotation version updates
  const rotationVersionUpdates = useRef<Map<number, number>>(new Map())
  
  const containerRef = useRef<HTMLDivElement>(null)
  const currentPhoto = photos[currentIndex]
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  
  // Get current rotation for the photo (from local state or server)
  const getCurrentRotation = useCallback(() => {
    // First check local state (for changes made in this session)
    if (photoRotations.has(currentPhoto.id)) {
      return photoRotations.get(currentPhoto.id) || 0
    }
    // Otherwise use the most up-to-date server rotation from the photo object
    // This will be updated when we save rotations
    return currentPhoto.final_rotation || 0
  }, [currentPhoto, photoRotations])
  
  // Current display rotation
  const displayRotation = getCurrentRotation()
  
  // Trigger thumbnail regeneration when leaving a rotated photo
  const triggerThumbnailRegeneration = useCallback(async (photoId: number) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/thumbnails/regenerate/${photoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        console.log(`Thumbnail regeneration triggered for photo ${photoId}`)
      }
    } catch (error) {
      console.error('Failed to trigger thumbnail regeneration:', error)
    }
  }, [API_URL])
  
  // Handle photo change - trigger thumbnail regen if previous photo was rotated
  const previousPhotoId = useRef<number | null>(null)
  
  useEffect(() => {
    // If we're changing photos and the previous photo was rotated, trigger regen
    if (previousPhotoId.current && rotatedPhotos.current.has(previousPhotoId.current)) {
      triggerThumbnailRegeneration(previousPhotoId.current)
      // Remove from rotated set after triggering
      rotatedPhotos.current.delete(previousPhotoId.current)
    }
    
    // Update previous photo ID
    previousPhotoId.current = currentPhoto.id
    
    // Reset zoom when changing photos
    setZoom(1)
  }, [currentIndex, currentPhoto.id, triggerThumbnailRegeneration])
  
  // Handle rotation
  const handleRotate = useCallback(async (direction: 'left' | 'right') => {
    if (isRotating) return // Prevent multiple simultaneous rotations
    
    const delta = direction === 'right' ? 90 : -90
    
    // 1. Calculate new rotation based on current state
    const currentRotation = getCurrentRotation()
    let newRotation = (currentRotation + delta + 360) % 360
    if (newRotation === 360) newRotation = 0
    
    // 2. Update local state immediately for instant visual feedback
    setPhotoRotations(prev => {
      const newMap = new Map(prev)
      newMap.set(currentPhoto.id, newRotation)
      return newMap
    })
    
    // 3. Send to server
    setIsRotating(true)
    try {
      const response = await fetch(`${API_URL}/api/v1/photos/${currentPhoto.id}/rotation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rotation: newRotation })
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Update the photo object with new rotation data
        currentPhoto.rotation_version = data.rotation_version
        currentPhoto.final_rotation = data.final_rotation
        
        // Track the version update
        rotationVersionUpdates.current.set(currentPhoto.id, data.rotation_version)
        
        // Mark this photo as rotated
        rotatedPhotos.current.add(currentPhoto.id)
        
        // Notify parent to update thumbnails
        if (onRotationUpdate) {
          onRotationUpdate(currentPhoto.id, data.rotation_version)
        }
      } else {
        console.error('Failed to save rotation')
      }
    } catch (error) {
      console.error('Error saving rotation:', error)
    } finally {
      setIsRotating(false)
    }
  }, [currentPhoto, isRotating, API_URL, onRotationUpdate, getCurrentRotation])
  
  // Handle closing the viewer - trigger thumbnail regen for any rotated photos
  const handleClose = useCallback(() => {
    // If current photo was rotated, trigger regeneration
    if (rotatedPhotos.current.has(currentPhoto.id)) {
      triggerThumbnailRegeneration(currentPhoto.id)
    }
    
    // Trigger regeneration for any other rotated photos
    rotatedPhotos.current.forEach(photoId => {
      triggerThumbnailRegeneration(photoId)
    })
    
    // Send all rotation version updates to parent
    if (onBatchRotationUpdate && rotationVersionUpdates.current.size > 0) {
      onBatchRotationUpdate(new Map(rotationVersionUpdates.current))
    }
    
    // Clear the tracking sets
    rotatedPhotos.current.clear()
    rotationVersionUpdates.current.clear()
    
    // Call the original onClose
    onClose()
  }, [currentPhoto.id, onClose, triggerThumbnailRegeneration, onBatchRotationUpdate])
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when Cmd (Mac) or Ctrl (Windows/Linux) is pressed
      // This prevents conflicts with browser shortcuts like Cmd+R for refresh
      if (e.metaKey || e.ctrlKey) {
        return
      }
      
      // Prevent handling if already rotating
      if (isRotating && (e.key === 'r' || e.key === 'R' || e.key === 'l' || e.key === 'L')) {
        return
      }
      
      switch (e.key) {
        case 'Escape':
          handleClose()
          break
        case 'ArrowLeft':
          if (currentIndex > 0) setCurrentIndex(currentIndex - 1)
          break
        case 'ArrowRight':
          if (currentIndex < photos.length - 1) setCurrentIndex(currentIndex + 1)
          break
        case 'i':
        case 'I':
          setShowInfo(prev => !prev)
          break
        case '+':
        case '=':
          setZoom(prev => Math.min(prev * 1.2, 5))
          break
        case '-':
        case '_':
          setZoom(prev => Math.max(prev / 1.2, 0.5))
          break
        case 'r':
        case 'R':
          e.preventDefault()
          handleRotate('right')
          break
        case 'l':
        case 'L':
          e.preventDefault()
          handleRotate('left')
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, handleClose, photos.length, handleRotate, isRotating, zoom])
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Unknown'
    }
  }
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }
  
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" ref={containerRef}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center justify-between p-4">
          <div className="text-white">
            <h2 className="text-lg font-medium">{currentPhoto.filename}</h2>
            <p className="text-sm opacity-80">
              {currentIndex + 1} / {photos.length}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Rotation controls */}
            <button
              onClick={() => handleRotate('left')}
              disabled={isRotating}
              className={`p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors ${
                isRotating ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title="Rotate Left (L)"
            >
              <RotateCcw className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => handleRotate('right')}
              disabled={isRotating}
              className={`p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors ${
                isRotating ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title="Rotate Right (R)"
            >
              <RotateCw className="w-5 h-5 text-white" />
            </button>
            
            {/* Zoom controls */}
            <button
              onClick={() => setZoom(prev => Math.max(prev / 1.2, 0.5))}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => setZoom(prev => Math.min(prev * 1.2, 5))}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-5 h-5 text-white" />
            </button>
            
            {/* Info toggle */}
            <button
              onClick={() => setShowInfo(!showInfo)}
              className={`p-2 rounded-full transition-colors ${
                showInfo ? 'bg-white/30' : 'bg-white/20 hover:bg-white/30'
              }`}
              title="Toggle Info (I)"
            >
              <Info className="w-5 h-5 text-white" />
            </button>
            
            {/* Close button */}
            <button
              onClick={handleClose}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              title="Close (Esc)"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Navigation buttons */}
      {currentIndex > 0 && (
        <button
          onClick={() => setCurrentIndex(currentIndex - 1)}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          title="Previous (←)"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
      )}
      
      {currentIndex < photos.length - 1 && (
        <button
          onClick={() => setCurrentIndex(currentIndex + 1)}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          title="Next (→)"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      )}
      
      {/* Main image container - flex-1 to take remaining space after header */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <div 
          key={`img-${currentPhoto.id}-${displayRotation}`}
          className="transition-transform duration-200"
          style={{
            transform: `scale(${zoom}) rotate(${displayRotation}deg)`,
            transformOrigin: 'center',
          }}
        >
          <img
            src={`${API_URL}/api/v1/thumbnails/${currentPhoto.id}/full`}
            alt={currentPhoto.filename}
            className="max-w-full max-h-full object-contain"
            draggable={false}
            style={{
              // Constrain image to viewport with some padding
              maxWidth: Math.abs(displayRotation % 180) === 90 ? '85vh' : '95vw',
              maxHeight: Math.abs(displayRotation % 180) === 90 ? '95vw' : '85vh',
              width: 'auto',
              height: 'auto',
            }}
          />
          {isRotating && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="text-white">Saving rotation...</div>
            </div>
          )}
        </div>
      </div>
      
      {/* Info panel */}
      {showInfo && (
        <div className="absolute right-0 top-20 bottom-0 w-80 bg-black/80 backdrop-blur-sm p-6 overflow-y-auto">
          <h3 className="text-white font-semibold mb-4">Photo Information</h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-400">Filename:</span>
              <div className="text-white">{currentPhoto.filename}</div>
            </div>
            <div>
              <span className="text-gray-400">Size:</span>
              <div className="text-white">{formatFileSize(currentPhoto.file_size || 0)}</div>
            </div>
            {currentPhoto.width && currentPhoto.height && (
              <div>
                <span className="text-gray-400">Dimensions:</span>
                <div className="text-white">{currentPhoto.width} × {currentPhoto.height}</div>
              </div>
            )}
            <div>
              <span className="text-gray-400">Date Taken:</span>
              <div className="text-white">{formatDate(currentPhoto.date_taken)}</div>
            </div>
            {currentPhoto.camera_make && (
              <div>
                <span className="text-gray-400">Camera:</span>
                <div className="text-white">{currentPhoto.camera_make} {currentPhoto.camera_model}</div>
              </div>
            )}
            <div>
              <span className="text-gray-400">Type:</span>
              <div className="text-white">{currentPhoto.mime_type}</div>
            </div>
            <div>
              <span className="text-gray-400">Rotation:</span>
              <div className="text-white">{displayRotation}°</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}