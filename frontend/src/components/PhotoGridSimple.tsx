import { useEffect, useRef, useCallback, useState } from 'react'
import { Photo } from '@/lib/api'
import { Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'

// Lazy load the ImageViewer for better performance
const ImageViewer = dynamic(() => import('./ImageViewer'), { ssr: false })

interface PhotoGridProps {
  photos: Photo[]
  onLoadMore: () => void
  hasMore: boolean
  isLoading: boolean
}

export default function PhotoGridSimple({ photos, onLoadMore, hasMore, isLoading }: PhotoGridProps) {
  const observerTarget = useRef<HTMLDivElement>(null)
  const [loadingImages, setLoadingImages] = useState<Set<number>>(new Set())
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)

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
    return `http://localhost:8000/api/v1/thumbnails/${photo.id}/400`
  }
  
  const handlePhotoClick = (photoIndex: number) => {
    setViewerIndex(photoIndex)
    setViewerOpen(true)
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
  
  // Group photos into columns for masonry effect
  const photoColumns: Photo[][] = Array.from({ length: columns }, () => [])
  
  photos.forEach((photo, index) => {
    photoColumns[index % columns].push(photo)
  })

  return (
    <div>
      {/* Masonry grid with minimal gaps */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-0.5">
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
          onClose={() => setViewerOpen(false)}
        />
      )}
    </div>
  )
}