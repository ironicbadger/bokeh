import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchSystemStats } from '@/lib/api'
import JobsModal from './JobsModal'
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface StatusBarProps {
  photoCount: number
}

export default function StatusBar({ photoCount }: StatusBarProps) {
  const [showJobsModal, setShowJobsModal] = useState(false)
  const [jobsMinimized, setJobsMinimized] = useState(false)
  const [hasActiveJobs, setHasActiveJobs] = useState(false)
  const [currentJob, setCurrentJob] = useState<any>(null)
  
  // Check for active jobs to adjust polling rate
  const { data: jobsData } = useQuery({
    queryKey: ['activeJobs'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/v1/jobs?include_completed=false`)
      return response.json()
    },
    refetchInterval: hasActiveJobs ? 1000 : 5000, // Poll every 1s when active, 5s otherwise
  })
  
  // Update active jobs status
  useEffect(() => {
    const activeJobs = jobsData?.filter((job: any) => 
      job.status === 'running' || job.status === 'RUNNING' || 
      job.status === 'pending' || job.status === 'PENDING'
    ) || []
    setHasActiveJobs(activeJobs.length > 0)
    
    // Find the most relevant current job
    const scanJob = activeJobs.find((j: any) => j.type === 'directory_scan')
    const thumbJob = activeJobs.find((j: any) => j.type === 'thumbnail_generation')
    setCurrentJob(scanJob || thumbJob || activeJobs[0] || null)
  }, [jobsData])
  
  const { data: stats } = useQuery({
    queryKey: ['systemStats'],
    queryFn: fetchSystemStats,
    refetchInterval: hasActiveJobs ? 2000 : 10000 // Faster when active jobs
  })
  
  // Animated numbers for smooth transitions
  const animatedPhotoCount = useAnimatedNumber(photoCount, 600)
  const animatedTotalPhotos = useAnimatedNumber(stats?.total_photos || 0, 800)
  
  const handleJobsClick = () => {
    if (showJobsModal && !jobsMinimized) {
      // If modal is open and not minimized, minimize it
      setJobsMinimized(true)
    } else {
      // Otherwise, open/restore the modal
      setShowJobsModal(true)
      setJobsMinimized(false)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800/95 backdrop-blur-sm border-t border-gray-700 z-50">
      <div className="w-full px-4">
        <div className="flex justify-between items-center h-8 text-xs text-gray-400">
          <div className="flex gap-6 items-center">
            <span 
              className={`animated-number ${hasActiveJobs ? 'animate-pulse text-blue-400' : ''}`} 
              title="Photos visible on this page"
            >
              Viewing: {animatedPhotoCount}
            </span>
            {stats && (
              <>
                <span 
                  className={`animated-number ${stats.total_photos !== photoCount ? 'text-yellow-400' : ''}`} 
                  title="All photos in your library"
                >
                  Library: {animatedTotalPhotos} photos
                </span>
                <span title="Total storage used">Storage: {formatBytes(stats.total_size)}</span>
                <span title="Available disk space">Free: {formatBytes(stats.disk_usage.available)}</span>
              </>
            )}
            {currentJob && (
              <span className="text-blue-400 animate-pulse text-xs">
                {currentJob.type === 'directory_scan' ? '📁 Scanning' : '🖼️ Thumbnails'}: 
                {currentJob.progress ? ` ${Math.round(currentJob.progress)}%` : ' ...'}
                {currentJob.processed_items && currentJob.total_items ? 
                  ` (${currentJob.processed_items}/${currentJob.total_items})` : ''}
              </span>
            )}
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleJobsClick}
              className={`flex items-center gap-1 transition-colors ${
                stats?.active_jobs > 0 
                  ? 'text-blue-400 animate-pulse hover:text-blue-300' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <span>⚡</span>
              {stats?.active_jobs > 0 ? (
                <span>{stats.active_jobs} active job{stats.active_jobs !== 1 ? 's' : ''}</span>
              ) : (
                <span>Jobs</span>
              )}
            </button>
            <span className="text-gray-400">v{stats?.version || '0.1.0'}</span>
          </div>
        </div>
      </div>
      
      {showJobsModal && !jobsMinimized && (
        <JobsModal 
          isOpen={true}
          onClose={() => {
            setShowJobsModal(false)
            setJobsMinimized(false)
          }}
          onMinimize={() => setJobsMinimized(true)}
        />
      )}
    </div>
  )
}