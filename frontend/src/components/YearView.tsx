import React, { useState, useEffect } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import Image from 'next/image'
import { useRouter } from 'next/router'
import ZoomControl from './ZoomControl'

interface Photo {
  id: number
  filename: string
  rotation_version?: number
  user_rotation?: number
  date_taken?: string
  created_at: string
}

interface MonthGroup {
  month: number
  monthName: string
  photoCount: number
  photos: Photo[]
}

interface YearData {
  year: number
  count: number
  preview_photo?: Photo
}

interface YearViewProps {
  onPhotoClick?: (photo: Photo, photos: Photo[], index: number) => void
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const YearView: React.FC<YearViewProps> = ({ onPhotoClick }) => {
  const router = useRouter()
  const [zoomLevel, setZoomLevel] = useState(4)
  
  // Fetch years overview with preview photos
  const { data: yearsData, isLoading } = useInfiniteQuery({
    queryKey: ['photos', 'years'],
    queryFn: async () => {
      const response = await fetch('http://localhost:8000/api/v1/photos/years')
      if (!response.ok) throw new Error('Failed to fetch years')
      return response.json()
    },
    getNextPageParam: () => undefined,
    refetchInterval: false,
  })
  
  const handleYearClick = (year: number) => {
    // Navigate to the year detail view
    router.push(`/year/${year}`)
  }
  
  const getThumbnailUrl = (photo: Photo) => {
    const baseUrl = `http://localhost:8000/api/v1/thumbnails/${photo.id}/400`
    const version = photo.rotation_version || 0
    return version ? `${baseUrl}?v=${version}` : baseUrl
  }
  
  const years: YearData[] = yearsData?.pages?.[0]?.years || []
  
  // Calculate grid columns based on zoom level
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
      default: return 'grid-cols-4'
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 pt-20 pb-16">
      {/* Zoom Control - Subtle bottom-right */}
      <ZoomControl 
        value={zoomLevel} 
        onChange={setZoomLevel}
        min={2}
        max={8}
      />
      
      {/* Year Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-400">Loading years...</div>
        </div>
      ) : (
        <div className={`grid ${getGridCols()} gap-4 max-w-full`}>
          {years.map((yearData: YearData) => (
            <div
              key={yearData.year}
              className="relative group cursor-pointer transform transition-all hover:scale-105"
              onClick={() => handleYearClick(yearData.year)}
            >
              {/* Year Card */}
              <div className="relative aspect-square bg-gray-800 rounded-lg overflow-hidden">
                {yearData.preview_photo ? (
                  <Image
                    src={getThumbnailUrl(yearData.preview_photo)}
                    alt={`${yearData.year} preview`}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800" />
                )}
                
                {/* Overlay with year and count */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Year text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <h2 className="text-4xl font-bold text-white drop-shadow-lg">
                    {yearData.year}
                  </h2>
                </div>
                
                {/* Photo count badge */}
                <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded">
                  <span className="text-xs text-white">
                    {yearData.count} photos
                  </span>
                </div>
                
                {/* Hover effect */}
                <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/10 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default YearView