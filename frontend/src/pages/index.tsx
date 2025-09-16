import { useState, useEffect, useRef } from 'react'
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import Head from 'next/head'
import PhotoGridSimple from '@/components/PhotoGridSimple'
import YearView from '@/components/YearView'
import FilesView from '@/components/FilesView'
import ViewModeSelector, { ViewMode } from '@/components/ViewModeSelector'
import SortSelector from '@/components/SortSelector'
import StatusBar from '@/components/StatusBar'
import { fetchPhotos, fetchPhotoCount, fetchRecentPhotos, SortBy, Photo } from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function Home() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [hasActiveJobs, setHasActiveJobs] = useState(false)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [sortBy, setSortBy] = useState<SortBy>(() => {
    // Load saved sort preference
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('photoSortBy') as SortBy) || 'created_at'
    }
    return 'created_at'
  })
  const [thumbnailVersions, setThumbnailVersions] = useState<Map<number, number>>(new Map())
  const [lastPhotoCount, setLastPhotoCount] = useState<number>(0)
  const [latestCreatedAt, setLatestCreatedAt] = useState<string | null>(null)
  const newPhotosRef = useRef<Photo[]>([])
  
  // Get view mode from URL or default to 'grid'
  const viewMode = (router.query.view as ViewMode) || 'grid'
  
  const setViewMode = (mode: ViewMode) => {
    router.push({ query: { ...router.query, view: mode } }, undefined, { shallow: true })
  }
  
  // Keyboard shortcuts for view switching
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      
      switch(e.key.toLowerCase()) {
        case 'g':
          setViewMode('grid')
          break
        case 'y':
          setViewMode('year')
          break
        case 'f':
          setViewMode('files')
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  // Check for active jobs
  const { data: jobsData } = useQuery({
    queryKey: ['activeJobs'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/v1/jobs?include_completed=false`)
      return response.json()
    },
    refetchInterval: hasActiveJobs ? 2000 : 30000, // Poll every 2s when active, every 30s otherwise
  })

  // Update active jobs status
  useEffect(() => {
    const activeJobs = jobsData?.filter((job: any) => 
      job.status === 'running' || job.status === 'RUNNING' || 
      job.status === 'pending' || job.status === 'PENDING'
    ) || []
    setHasActiveJobs(activeJobs.length > 0)
  }, [jobsData])

  // Poll photo count to detect new photos
  const { data: photoCountData } = useQuery({
    queryKey: ['photoCount'],
    queryFn: fetchPhotoCount,
    refetchInterval: hasActiveJobs ? 2000 : 10000, // Poll more frequently during active jobs
    enabled: viewMode === 'grid' // Only poll in grid view
  })

  // Load new photos when count increases
  useEffect(() => {
    if (!photoCountData) return
    
    const currentCount = photoCountData.count
    
    // If this is first load, just set the count
    if (lastPhotoCount === 0) {
      setLastPhotoCount(currentCount)
      setLatestCreatedAt(photoCountData.latest_created_at)
      return
    }
    
    // If count increased, fetch the new photos
    if (currentCount > lastPhotoCount && latestCreatedAt) {
      fetchRecentPhotos(latestCreatedAt, currentCount - lastPhotoCount + 10) // Get a few extra to be safe
        .then(response => {
          if (response.data.length > 0) {
            // Store new photos to prepend to grid
            newPhotosRef.current = response.data
            
            // If sorting by created_at, trigger a refresh of the first page
            if (sortBy === 'created_at') {
              queryClient.invalidateQueries(['photos', sortOrder, sortBy])
            }
            
            // Update counts
            setLastPhotoCount(currentCount)
            setLatestCreatedAt(photoCountData.latest_created_at)
            
            // Show notification (optional)
            console.log(`${response.data.length} new photos added`)
          }
        })
        .catch(err => console.error('Failed to fetch new photos:', err))
    }
  }, [photoCountData, lastPhotoCount, latestCreatedAt, sortBy, sortOrder, queryClient])

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch
  } = useInfiniteQuery({
    queryKey: ['photos', sortOrder, sortBy],
    queryFn: ({ pageParam = 1 }) => fetchPhotos(pageParam, sortOrder, 100, sortBy),  // 100 per page
    getNextPageParam: (lastPage, pages) => {
      const currentPage = pages.length
      const totalPages = Math.ceil(lastPage.pagination.total / lastPage.pagination.per_page)
      return currentPage < totalPages ? currentPage + 1 : undefined
    },
    initialPageParam: 1,
    // Don't auto-refresh photos - this causes duplicate fetching
    refetchInterval: false,
    refetchOnWindowFocus: false,  // Don't refetch on window focus
    staleTime: 5 * 60 * 1000,  // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000,  // Keep in cache for 10 minutes
  })

  const handleImport = async () => {
    setImportStatus('Starting import...')
    try {
      const response = await fetch('/api/v1/photos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scan_type: 'incremental' })
      })
      const data = await response.json()
      setImportStatus(`Import job started: ${data.job_id}`)
      
      // Refetch photos after a delay
      setTimeout(() => {
        window.location.reload()
      }, 5000)
    } catch (error) {
      setImportStatus('Import failed')
      console.error(error)
    }
  }

  const allPhotos = data?.pages.flatMap(page => page.data) || []

  const handleRotationUpdate = (photoId: number, thumbnailVersion: number) => {
    // Update the thumbnail version for this photo
    setThumbnailVersions(prev => {
      const newVersions = new Map(prev)
      newVersions.set(photoId, thumbnailVersion)
      return newVersions
    })
  }

  return (
    <>
      <Head>
        <title>Bokeh.</title>
        <meta name="description" content="Photo management application" />
      </Head>
      <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 shadow-lg border-b border-gray-700 fixed top-0 left-0 right-0 z-50">
        <div className="w-full px-4">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-semibold text-white">
              Bokeh.
            </h1>
            
            {/* View Mode Selector */}
            <ViewModeSelector 
              currentMode={viewMode}
              onModeChange={setViewMode}
            />
          </div>
        </div>
      </header>

      {/* Conditional rendering based on view mode */}
      {viewMode === 'grid' ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-16 mb-12">
          {/* Sort Controls */}
          <div className="mb-4">
            <SortSelector
              currentSort={sortBy}
              sortOrder={sortOrder}
              onSortChange={(newSort) => {
                setSortBy(newSort)
                // Save preference to localStorage
                localStorage.setItem('photoSortBy', newSort)
              }}
              onOrderToggle={() => {
                setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')
              }}
            />
          </div>
          {data && (
            <div className="text-sm text-gray-600 mb-2">
              {data.pages[0]?.pagination?.total || 0} photos
              {hasActiveJobs && (
                <span className="ml-2 text-blue-500 animate-pulse">
                  • Scanning for new photos...
                </span>
              )}
            </div>
          )}

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-lg text-gray-600">Loading photos...</div>
          </div>
        ) : error ? (
          <div className="text-red-600">Error loading photos</div>
        ) : allPhotos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No photos found</p>
            <p className="text-sm text-gray-500">Click the ⚡ Jobs button below to scan your library</p>
          </div>
        ) : (
          <PhotoGridSimple
            photos={allPhotos}
            onLoadMore={fetchNextPage}
            hasMore={hasNextPage || false}
            isLoading={isFetchingNextPage}
            thumbnailVersions={thumbnailVersions}
            onRotationUpdate={handleRotationUpdate}
          />
        )}
        </main>
      ) : viewMode === 'year' ? (
        <div className="mt-16">
          <YearView onPhotoClick={(photo, photos, index) => {
            // Could open viewer here if needed
            console.log('Photo clicked:', photo)
          }} />
        </div>
      ) : viewMode === 'files' ? (
        <div className="mt-16">
          <FilesView onPhotoClick={(photo, photos, index) => {
            // Could open viewer here if needed
            console.log('Photo clicked:', photo)
          }} />
        </div>
      ) : null}

      <StatusBar photoCount={allPhotos.length} />
    </div>
    </>
  )
}