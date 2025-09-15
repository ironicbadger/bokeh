import { useEffect, useRef, useCallback, useState } from 'react'
import { Photo } from '@/lib/api'
import { Loader2 } from 'lucide-react'
import ImageViewer from './ImageViewerNew'
import ZoomControl from './ZoomControl'

interface PhotoGridProps {
  photos: Photo[]
  onLoadMore: () => void
  hasMore: boolean
  isLoading: boolean
  thumbnailVersions?: Map<number, number>  // Map of photo ID to thumbnail version
  onPhotoClick?: (photoIndex: number) => void
  onRotationUpdate?: (photoId: number, thumbnailVersion: number) => void
}

export default function PhotoGridSimple({ photos, onLoadMore, hasMore, isLoading, thumbnailVersions, onPhotoClick, onRotationUpdate }: PhotoGridProps) {
  const observerTarget = useRef<HTMLDivElement>(null)
  const [loadingImages, setLoadingImages] = useState<Set<number>>(new Set())
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const [localThumbnailVersions, setLocalThumbnailVersions] = useState<Map<number, number>>(thumbnailVersions || new Map())
  const [recentlyRotated, setRecentlyRotated] = useState<Map<number, number>>(new Map()) // Map of photoId to timestamp
  const [zoomLevel, setZoomLevel] = useState(5) // Default zoom level
  
  // Update local versions when prop changes
  useEffect(() => {
    if (thumbnailVersions) {
      setLocalThumbnailVersions(thumbnailVersions)
    }
  }, [thumbnailVersions])

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [target] = entries
    if (target.isIntersecting && hasMore && !isLoading) {
      onLoadMore()
    }
  }, [hasMore, isLoading, onLoadMore])

  useEffect(() => {
    const element = observerTarget.current
    if (!element) return

    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.01,  // Trigger earlier (1% visible instead of 10%)
      rootMargin: '800px'  // Much larger margin for earlier detection (was 100px)
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [handleObserver])

  const getThumbnailUrl = (photo: Photo) => {
    const baseUrl = `http://localhost:8000/api/v1/thumbnails/${photo.id}/400`
    // Use rotation_version from photo object or local version map
    const version = localThumbnailVersions.get(photo.id) || photo.rotation_version || 0
    // Add timestamp for photos that were just rotated to force refresh
    const rotationTimestamp = recentlyRotated.get(photo.id)
    if (rotationTimestamp && version) {
      // Use the stored timestamp for consistent URL until cleared
      return `${baseUrl}?v=${version}&_t=${rotationTimestamp}`
    }
    return version ? `${baseUrl}?v=${version}` : baseUrl
  }
  
  const handlePhotoClick = (photoIndex: number) => {
    console.log('Photo clicked:', { photoIndex, hasOnPhotoClick: !!onPhotoClick })
    if (onPhotoClick) {
      onPhotoClick(photoIndex)
    } else {
      console.log('Opening internal viewer')
      setViewerIndex(photoIndex)
      setViewerOpen(true)
    }
  }

  // Dynamically determine columns based on screen width
  const getColumnCount = () => {
    if (typeof window === 'undefined') return 5
    const width = window.innerWidth
    if (width < 640) return 2   // mobile
    if (width < 768) return 3   // tablet
    if (width < 1024) return 4  // small desktop
    if (width < 1280) return 5  // desktop
    return 6                    // large desktop
  }
  
  const [columns, setColumns] = useState(getColumnCount())
  
  useEffect(() => {
    const handleResize = () => setColumns(getColumnCount())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  // Preload images that are about to come into view
  useEffect(() => {
    const preloadImages = () => {
      // Get current scroll position
      const scrollTop = window.scrollY
      const windowHeight = window.innerHeight
      
      // Calculate which photos are likely to be viewed soon
      const photosPerRow = columns
      const rowHeight = 200  // Approximate row height
      const currentRow = Math.floor(scrollTop / rowHeight)
      const visibleRows = Math.ceil(windowHeight / rowHeight)
      
      // Preload next 10 rows worth of images
      const preloadRows = 10
      const startIndex = currentRow * photosPerRow
      const endIndex = Math.min(
        (currentRow + visibleRows + preloadRows) * photosPerRow,
        photos.length
      )
      
      // Preload images
      for (let i = startIndex; i < endIndex; i++) {
        if (photos[i]) {
          const img = new Image()
          img.src = getThumbnailUrl(photos[i])
        }
      }
    }
    
    // Debounce preloading
    const timeoutId = setTimeout(preloadImages, 100)
    
    // Add scroll listener
    const handleScroll = () => {
      clearTimeout(timeoutId)
      setTimeout(preloadImages, 100)
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    
    // Initial preload
    preloadImages()
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(timeoutId)
    }
  }, [photos, columns])
  
  // Calculate columns based on zoom level
  const getGridColumns = () => {
    switch(zoomLevel) {
      case 1: return 2
      case 2: return 3
      case 3: return 4
      case 4: return 5
      case 5: return 6
      case 6: return 7
      case 7: return 8
      case 8: return 9
      case 9: return 10
      case 10: return 12
      default: return 6
    }
  }
  
  const dynamicColumns = getGridColumns()
  
  // Group photos into columns for masonry effect
  const photoColumns: Photo[][] = Array.from({ length: dynamicColumns }, () => [])
  
  photos.forEach((photo, index) => {
    photoColumns[index % dynamicColumns].push(photo)
  })

  return (
    <div className="pb-12">
      {/* Zoom Control - Subtle bottom-right */}
      <ZoomControl 
        value={zoomLevel} 
        onChange={setZoomLevel}
        min={2}
        max={10}
      />
      
      {/* Masonry grid with dynamic columns */}
      <div 
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${dynamicColumns}, minmax(0, 1fr))` }}
      >
        {photoColumns.map((column, colIndex) => (
          <div key={colIndex} className="flex flex-col gap-0.5">
            {column.map((photo) => {
              const photoIndex = photos.findIndex(p => p.id === photo.id)
              return (
                <div
                key={photo.id}
                className="relative overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity cursor-pointer group"
                onClick={() => handlePhotoClick(photoIndex)}
              >
                {loadingImages.has(photo.id) && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                )}
                <img
                  src={getThumbnailUrl(photo)}
                  alt={photo.filename}
                  className="w-full h-auto block"
                  loading="lazy"
                  onLoad={() => {
                    setLoadingImages(prev => {
                      const newSet = new Set(prev)
                      newSet.delete(photo.id)
                      return newSet
                    })
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    setLoadingImages(prev => {
                      const newSet = new Set(prev)
                      newSet.delete(photo.id)
                      return newSet
                    })
                    // Don't show placeholder - photo shouldn't be visible without thumbnail
                    console.error(`Failed to load thumbnail for photo ${photo.id}`)
                  }}
                  onLoadStart={() => {
                    setLoadingImages(prev => new Set(prev).add(photo.id))
                  }}
                />
                {/* Minimal hover overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <p className="text-white text-[10px] truncate">{photo.filename}</p>
                </div>
              </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Infinite scroll trigger */}
      <div ref={observerTarget} className="h-10 flex justify-center items-center mt-4">
        {isLoading && (
          <div className="text-gray-600">Loading more photos...</div>
        )}
      </div>
      
      {/* Image Viewer */}
      {viewerOpen && (
        <ImageViewer
          photos={photos}
          initialIndex={viewerIndex}
          onClose={() => {
            setViewerOpen(false)
            // Clear recently rotated after a delay to allow images to load
            setTimeout(() => {
              setRecentlyRotated(new Map())
            }, 5000)
          }}
          onRotationUpdate={(photoId, rotationVersion) => {
            console.log('PhotoGridSimple: Rotation update received', { photoId, rotationVersion })
            // Mark as recently rotated with timestamp
            setRecentlyRotated(prev => {
              const newMap = new Map(prev)
              newMap.set(photoId, Date.now())
              return newMap
            })
            // Update local thumbnail versions
            setLocalThumbnailVersions(prev => {
              const newVersions = new Map(prev)
              newVersions.set(photoId, rotationVersion)
              console.log('Updated thumbnail versions map:', newVersions)
              return newVersions
            })
            // Update the photo object's rotation_version
            const photoToUpdate = photos.find(p => p.id === photoId)
            if (photoToUpdate) {
              photoToUpdate.rotation_version = rotationVersion
            }
            // Also call parent callback if provided
            if (onRotationUpdate) {
              onRotationUpdate(photoId, rotationVersion)
            }
          }}
          onBatchRotationUpdate={(updates) => {
            console.log('PhotoGridSimple: Batch rotation updates received', updates)
            // Mark all as recently rotated with timestamps
            const timestamp = Date.now()
            setRecentlyRotated(prev => {
              const newMap = new Map(prev)
              updates.forEach((_, photoId) => {
                newMap.set(photoId, timestamp)
              })
              return newMap
            })
            
            // Update all rotation versions at once
            setLocalThumbnailVersions(prev => {
              const newVersions = new Map(prev)
              updates.forEach((version, photoId) => {
                newVersions.set(photoId, version)
                // Also update the photo object
                const photo = photos.find(p => p.id === photoId)
                if (photo) {
                  photo.rotation_version = version
                }
              })
              return newVersions
            })
          }}
        />
      )}
    </div>
  )
}