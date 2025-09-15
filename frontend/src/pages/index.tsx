import { useState, useEffect } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import Head from 'next/head'
import PhotoGridSimple from '@/components/PhotoGridSimple'
import StatusBar from '@/components/StatusBar'
import { fetchPhotos } from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function Home() {
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [hasActiveJobs, setHasActiveJobs] = useState(false)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

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

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch
  } = useInfiniteQuery({
    queryKey: ['photos', sortOrder],
    queryFn: ({ pageParam = 1 }) => fetchPhotos(pageParam, sortOrder, 100),  // 100 per page
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

  return (
    <>
      <Head>
        <title>Bokeh.</title>
        <meta name="description" content="Photo management application" />
      </Head>
      <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-semibold text-gray-900">
              Bokeh.
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-16 mb-20">
        {/* Sort Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Sort by Date:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setSortOrder('desc')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  sortOrder === 'desc'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Newest First
              </button>
              <button
                onClick={() => setSortOrder('asc')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  sortOrder === 'asc'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Oldest First
              </button>
            </div>
          </div>
          {data && (
            <div className="text-sm text-gray-600">
              {data.pages[0]?.pagination?.total || 0} photos
            </div>
          )}
        </div>

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
          />
        )}
      </main>

      <StatusBar photoCount={allPhotos.length} />
    </div>
    </>
  )
}