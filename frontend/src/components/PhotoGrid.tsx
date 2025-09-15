import { useEffect, useRef, useCallback, useState } from 'react'
import Image from 'next/image'
import { Photo } from '@/lib/api'
import { Loader2 } from 'lucide-react'

interface PhotoGridProps {
  photos: Photo[]
  onLoadMore: () => void
  hasMore: boolean
  isLoading: boolean
}

export default function PhotoGrid({ photos, onLoadMore, hasMore, isLoading }: PhotoGridProps) {
  const observerTarget = useRef<HTMLDivElement>(null)
  const [retryTimers, setRetryTimers] = useState<{ [key: number]: NodeJS.Timeout }>({})
  const [loadingThumbnails, setLoadingThumbnails] = useState<Set<number>>(new Set())

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

  // Cleanup retry timers on unmount
  useEffect(() => {
    return () => {
      Object.values(retryTimers).forEach(timer => clearTimeout(timer))
    }
  }, [retryTimers])

  const getThumbnailUrl = (photo: Photo) => {
    if (photo.thumbnails?.['400']) {
      return `http://localhost:8000${photo.thumbnails['400']}`
    }
    return `http://localhost:8000/api/v1/thumbnails/${photo.id}/400`
  }

  const handleThumbnailError = (photoId: number, retryCount: number = 0) => {
    const maxRetries = 5
    const retryDelays = [1000, 2000, 4000, 8000, 16000] // Exponential backoff

    if (retryCount < maxRetries) {
      // Set loading state
      setLoadingThumbnails(prev => new Set(prev).add(photoId))
      
      // Clear any existing timer for this photo
      if (retryTimers[photoId]) {
        clearTimeout(retryTimers[photoId])
      }

      // Set new retry timer
      const timer = setTimeout(() => {
        // Force re-render by updating the image src
        const img = document.getElementById(`photo-${photoId}`) as HTMLImageElement
        if (img) {
          const url = new URL(img.src)
          url.searchParams.set('retry', String(retryCount + 1))
          img.src = url.toString()
        }
        
        // Clear loading state
        setLoadingThumbnails(prev => {
          const newSet = new Set(prev)
          newSet.delete(photoId)
          return newSet
        })
      }, retryDelays[retryCount])

      setRetryTimers(prev => ({ ...prev, [photoId]: timer }))
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
          >
            {loadingThumbnails.has(photo.id) && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            )}
            <img
              id={`photo-${photo.id}`}
              src={getThumbnailUrl(photo)}
              alt={photo.filename}
              className="w-full h-full object-contain bg-gray-100"
              loading="lazy"
              onLoad={() => {
                // Clear retry timer on successful load
                if (retryTimers[photo.id]) {
                  clearTimeout(retryTimers[photo.id])
                  setRetryTimers(prev => {
                    const newTimers = { ...prev }
                    delete newTimers[photo.id]
                    return newTimers
                  })
                }
                setLoadingThumbnails(prev => {
                  const newSet = new Set(prev)
                  newSet.delete(photo.id)
                  return newSet
                })
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                const url = new URL(target.src)
                const retryCount = parseInt(url.searchParams.get('retry') || '0')
                
                if (retryCount < 5) {
                  // Retry loading the thumbnail
                  handleThumbnailError(photo.id, retryCount)
                } else {
                  // Final fallback after all retries
                  target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect width="400" height="400" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-family="sans-serif" font-size="16"%3EProcessing...%3C/text%3E%3C/svg%3E'
                }
              }}
            />
            {photo.is_favorite && (
              <div className="absolute top-2 right-2">
                <svg className="w-6 h-6 text-yellow-400 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
              <p className="text-white text-xs truncate">{photo.filename}</p>
              {photo.date_taken && (
                <p className="text-white/80 text-xs">
                  {new Date(photo.date_taken).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Infinite scroll trigger */}
      <div ref={observerTarget} className="h-10 flex justify-center items-center">
        {isLoading && (
          <div className="text-gray-600">Loading more photos...</div>
        )}
      </div>
    </div>
  )
}