import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Image from 'next/image'
import ZoomControl from './ZoomControl'
import ImageViewer from './ImageViewer'
import SortSelector from './SortSelector'

interface Photo {
  id: number
  filename: string
  rotation_version?: number
  user_rotation?: number
  date_taken?: string
  created_at: string
  is_favorite?: boolean
}

interface YearDetailViewProps {
  year: number
  onPhotoClick?: (photo: Photo, photos: Photo[], index: number) => void
  onBack: () => void
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const YearDetailView: React.FC<YearDetailViewProps> = ({ year, onPhotoClick, onBack }) => {
  const [zoomLevel, setZoomLevel] = useState(5)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [sortBy, setSortBy] = useState<'date_taken' | 'created_at'>('date_taken')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Fetch photos for the specific year
  const { data, isLoading } = useQuery({
    queryKey: ['photos', 'year', year],
    queryFn: async () => {
      const response = await fetch(`http://localhost:8000/api/v1/photos/year/${year}`)
      if (!response.ok) throw new Error('Failed to fetch year photos')
      return response.json()
    },
    refetchInterval: false,
  })
  
  const rawPhotos: Photo[] = data?.photos || []
  
  // Sort photos based on current settings
  const photos = [...rawPhotos].sort((a, b) => {
    const aDate = sortBy === 'date_taken' 
      ? (a.date_taken ? new Date(a.date_taken) : new Date(a.created_at))
      : new Date(a.created_at)
    const bDate = sortBy === 'date_taken'
      ? (b.date_taken ? new Date(b.date_taken) : new Date(b.created_at))  
      : new Date(b.created_at)
    
    const diff = aDate.getTime() - bDate.getTime()
    return sortOrder === 'desc' ? -diff : diff
  })
  
  // Group photos by month
  const photosByMonth = photos.reduce((acc, photo) => {
    const date = photo.date_taken ? new Date(photo.date_taken) : new Date(photo.created_at)
    const month = date.getMonth()
    
    if (!acc[month]) {
      acc[month] = []
    }
    acc[month].push(photo)
    return acc
  }, {} as Record<number, Photo[]>)
  
  const getThumbnailUrl = (photo: Photo) => {
    const baseUrl = `http://localhost:8000/api/v1/thumbnails/${photo.id}/400`
    const version = photo.rotation_version || 0
    return version ? `${baseUrl}?v=${version}` : baseUrl
  }
  
  const getGridCols = () => {
    switch(zoomLevel) {
      case 1: return 'grid-cols-1'
      case 2: return 'grid-cols-2'
      case 3: return 'grid-cols-3'
      case 4: return 'grid-cols-4'
      case 5: return 'grid-cols-5'
      case 6: return 'grid-cols-6'
      case 7: return 'grid-cols-7'
      case 8: return 'grid-cols-8'
      default: return 'grid-cols-5'
    }
  }
  
  const handlePhotoClick = (photo: Photo) => {
    const index = photos.findIndex(p => p.id === photo.id)
    setSelectedPhoto(photo)
    setSelectedIndex(index)
  }
  
  const handleViewerClose = () => {
    setSelectedPhoto(null)
  }
  
  const handleRotationUpdate = (photoId: number, rotationVersion: number) => {
    // Update the photo's rotation version in the local state if needed
    console.log('Photo rotated:', photoId, rotationVersion)
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 pt-20 pb-16">
      {/* Header with back button and sort controls */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-3xl font-bold">{year}</h1>
          <span className="text-gray-400">{photos.length} photos</span>
        </div>
        
        {/* Sort Controls */}
        <div className="flex justify-end">
          <SortSelector
            currentSort={sortBy}
            sortOrder={sortOrder}
            onSortChange={(newSort) => setSortBy(newSort as 'date_taken' | 'created_at')}
            onOrderToggle={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
          />
        </div>
      </div>
      
      {/* Zoom Control */}
      <ZoomControl 
        value={zoomLevel} 
        onChange={setZoomLevel}
        min={2}
        max={8}
      />
      
      {/* Photos grouped by month */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-400">Loading photos...</div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(photosByMonth)
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([monthStr, monthPhotos]) => {
              const month = Number(monthStr)
              return (
                <div key={month}>
                  <h2 className="text-xl font-semibold mb-4 text-gray-300">
                    {MONTH_NAMES[month]} ({monthPhotos.length})
                  </h2>
                  <div className={`grid ${getGridCols()} gap-2`}>
                    {monthPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        data-testid="photo-item"
                        className="relative aspect-square bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                        onClick={() => handlePhotoClick(photo)}
                      >
                        <Image
                          src={getThumbnailUrl(photo)}
                          alt={photo.filename}
                          fill
                          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                          className="object-cover"
                        />
                        {photo.is_favorite && (
                          <div className="absolute top-2 right-2 text-red-500 bg-black bg-opacity-50 rounded-full p-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
        </div>
      )}
      
      {/* Image Viewer (Lightbox) */}
      {selectedPhoto && (
        <ImageViewer
          photos={photos}
          initialIndex={selectedIndex}
          onClose={handleViewerClose}
          onRotationUpdate={handleRotationUpdate}
        />
      )}
    </div>
  )
}

export default YearDetailView