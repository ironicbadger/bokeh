import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Info, ZoomIn, ZoomOut, RotateCw, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'
import { Photo } from '@/lib/api'

interface ImageViewerProps {
  photos: Photo[]
  initialIndex: number
  onClose: () => void
  onRotationUpdate?: (photoId: number, thumbnailVersion: number) => void
}

export default function ImageViewer({ photos, initialIndex, onClose, onRotationUpdate }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [showInfo, setShowInfo] = useState(false)
  const [imageLoaded, setImageLoaded] = useState<{ [key: number]: boolean }>({})
  const [savedRotations, setSavedRotations] = useState<{ [key: number]: number }>({})
  const containerRef = useRef<HTMLDivElement>(null)
  const preloadedImages = useRef<{ [key: number]: HTMLImageElement }>({})
  
  const currentPhoto = photos[currentIndex]
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  
  // Preload images for smooth navigation
  const preloadImage = useCallback((index: number) => {
    if (index < 0 || index >= photos.length) return
    if (preloadedImages.current[index]) return
    
    const img = new Image()
    img.src = `${API_URL}/api/v1/thumbnails/${photos[index].id}/full`
    img.onload = () => {
      preloadedImages.current[index] = img
      setImageLoaded(prev => ({ ...prev, [index]: true }))
    }
  }, [photos, API_URL])
  
  // Preload current and adjacent images
  useEffect(() => {
    // Preload current
    preloadImage(currentIndex)
    
    // Preload next 2-3 images
    for (let i = 1; i <= 3; i++) {
      preloadImage(currentIndex + i)
      preloadImage(currentIndex - i)
    }
  }, [currentIndex, preloadImage])
  
  const saveRotation = async (photoId: number, newRotation: number) => {
    // Normalize rotation to 0, 90, 180, or 270
    let normalizedRotation = ((newRotation % 360) + 360) % 360
    // Round to nearest 90 degrees to handle any floating point issues
    normalizedRotation = Math.round(normalizedRotation / 90) * 90
    // 360 should become 0
    if (normalizedRotation === 360) normalizedRotation = 0
    
    console.log('Saving rotation:', { photoId, newRotation, normalizedRotation })
    
    try {
      const response = await fetch(`${API_URL}/api/v1/photos/${photoId}/rotation`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rotation: normalizedRotation })
      })
      
      if (response.ok) {
        const data = await response.json()
        // Save rotation state locally
        setSavedRotations(prev => ({ ...prev, [currentIndex]: normalizedRotation }))
        // Clear preloaded image to force reload with new rotation
        delete preloadedImages.current[currentIndex]
        setImageLoaded(prev => ({ ...prev, [currentIndex]: false }))
        // Notify parent component about rotation update with thumbnail version
        console.log('Rotation saved, notifying parent:', { photoId, version: data.thumbnail_version })
        if (onRotationUpdate && data.thumbnail_version) {
          onRotationUpdate(photoId, data.thumbnail_version)
        }
      }
    } catch (error) {
      console.error('Failed to save rotation:', error)
    }
  }
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          navigatePrev()
          break
        case 'ArrowRight':
          navigateNext()
          break
        case 'i':
        case 'I':
          setShowInfo(!showInfo)
          break
        case '+':
        case '=':
          handleZoomIn()
          break
        case '-':
        case '_':
          handleZoomOut()
          break
        case 'r':
          setRotation(prev => {
            const newRotation = prev + 90
            saveRotation(currentPhoto.id, newRotation)
            return newRotation
          })
          break
        case 'R':
          setRotation(prev => {
            const newRotation = prev - 90
            saveRotation(currentPhoto.id, newRotation)
            return newRotation
          })
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, showInfo, currentPhoto, onClose])
  
  const navigateNext = () => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1)
      resetViewState()
    }
  }
  
  const navigatePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      resetViewState()
    }
  }
  
  const resetViewState = () => {
    setZoom(1)
    // Load saved rotation for this photo if it exists
    const savedRotation = savedRotations[currentIndex] || 0
    setRotation(savedRotation)
  }
  
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 3))
  }
  
  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.5))
  }
  
  const handleRotateLeft = () => {
    const newRotation = rotation - 90
    setRotation(newRotation)
    saveRotation(currentPhoto.id, newRotation)
  }
  
  const handleRotateRight = () => {
    const newRotation = rotation + 90
    setRotation(newRotation)
    saveRotation(currentPhoto.id, newRotation)
  }
  
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
  }
  
  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black z-[100] flex flex-col"
      onClick={(e) => {
        if (e.target === containerRef.current) {
          onClose()
        }
      }}
    >
      {/* Header Controls */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              title="Close (Esc)"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <span className="text-white text-sm">
              {currentIndex + 1} / {photos.length}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInfo(!showInfo)}
              className={`p-2 rounded-full transition-colors ${
                showInfo ? 'bg-white/30' : 'bg-white/20 hover:bg-white/30'
              }`}
              title="Info (I)"
            >
              <Info className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleZoomIn}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleRotateLeft}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              title="Rotate Left (Shift+R)"
            >
              <RotateCcw className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleRotateRight}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              title="Rotate Right (R)"
            >
              <RotateCw className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Image Display */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Previous Button */}
        {currentIndex > 0 && (
          <button
            onClick={navigatePrev}
            className="absolute left-4 p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-10"
            title="Previous (←)"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
        )}
        
        {/* Image */}
        <div 
          className="relative transition-transform duration-200"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
          }}
        >
          <img
            src={`${API_URL}/api/v1/thumbnails/${currentPhoto.id}/full`}
            alt={currentPhoto.filename}
            className="max-w-full max-h-[90vh] object-contain"
            draggable={false}
          />
          
          {/* Loading indicator */}
          {!imageLoaded[currentIndex] && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>
        
        {/* Next Button */}
        {currentIndex < photos.length - 1 && (
          <button
            onClick={navigateNext}
            className="absolute right-4 p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-10"
            title="Next (→)"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        )}
      </div>
      
      {/* Info Panel */}
      {showInfo && (
        <div className="absolute top-16 right-4 w-80 bg-black/80 backdrop-blur-sm rounded-lg p-4 text-white text-sm">
          <h3 className="font-semibold mb-3">Image Information</h3>
          <div className="space-y-2">
            <div>
              <span className="text-gray-400">Filename:</span>
              <div className="text-white break-all">{currentPhoto.filename}</div>
            </div>
            <div>
              <span className="text-gray-400">Size:</span>
              <div className="text-white">{formatFileSize(currentPhoto.file_size)}</div>
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
          </div>
        </div>
      )}
      
      {/* Bottom Thumbnail Strip (optional preview) */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
        <div className="flex justify-center items-center gap-2 overflow-x-auto">
          {photos.slice(Math.max(0, currentIndex - 5), Math.min(photos.length, currentIndex + 6)).map((photo, idx) => {
            const photoIndex = Math.max(0, currentIndex - 5) + idx
            return (
              <button
                key={photo.id}
                onClick={() => {
                  setCurrentIndex(photoIndex)
                  resetViewState()
                }}
                className={`flex-shrink-0 transition-all ${
                  photoIndex === currentIndex 
                    ? 'ring-2 ring-white scale-110' 
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={`${API_URL}/api/v1/thumbnails/${photo.id}/150`}
                  alt={photo.filename}
                  className="w-12 h-12 object-cover rounded"
                />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}