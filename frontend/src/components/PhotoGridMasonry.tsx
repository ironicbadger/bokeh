import { useEffect, useRef, useCallback } from 'react'
import { Photo } from '@/lib/api'
import PhotoAlbum from 'react-photo-album'

interface PhotoGridProps {
  photos: Photo[]
  onLoadMore: () => void
  hasMore: boolean
  isLoading: boolean
}

export default function PhotoGridMasonry({ photos, onLoadMore, hasMore, isLoading }: PhotoGridProps) {
  const observerTarget = useRef<HTMLDivElement>(null)

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
      threshold: 0.1,
      rootMargin: '100px'
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [handleObserver])

  // Transform photos to format expected by react-photo-album
  // Use the actual dimensions from the photo metadata
  const albumPhotos = photos.map(photo => {
    // Use actual dimensions if available, otherwise use defaults
    const width = photo.width || 400
    const height = photo.height || 300
    
    return {
      src: `http://localhost:8000/api/v1/thumbnails/${photo.id}/400`, // Use 400px thumbnails for better performance
      width: width,
      height: height,
      alt: photo.filename,
      title: photo.filename,
      key: photo.id.toString()
    }
  })

  return (
    <div className="space-y-4">
      {photos.length > 0 && (
        <PhotoAlbum
          layout="masonry"
          photos={albumPhotos}
          columns={(containerWidth) => {
            if (containerWidth < 400) return 2
            if (containerWidth < 600) return 3
            if (containerWidth < 800) return 4
            if (containerWidth < 1200) return 5
            return 6
          }}
          spacing={2}  // Much tighter spacing
          padding={0}
          renderPhoto={({ photo, imageProps, wrapperStyle }) => (
            <div style={{ ...wrapperStyle, position: 'relative' }}>
              <img
                {...imageProps}
                loading="lazy"
                style={{
                  ...imageProps.style,
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  // Fallback to placeholder
                  target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23e5e5e5"/%3E%3C/svg%3E'
                }}
                onMouseOver={(e) => {
                  (e.target as HTMLImageElement).style.transform = 'scale(1.02)'
                }}
                onMouseOut={(e) => {
                  (e.target as HTMLImageElement).style.transform = 'scale(1)'
                }}
              />
              {/* Overlay with filename on hover */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 hover:opacity-100 transition-opacity">
                <p className="text-white text-xs truncate">{photo.title}</p>
              </div>
            </div>
          )}
        />
      )}

      {/* Infinite scroll trigger */}
      <div ref={observerTarget} className="h-10 flex justify-center items-center">
        {isLoading && (
          <div className="text-gray-600">Loading more photos...</div>
        )}
      </div>
    </div>
  )
}