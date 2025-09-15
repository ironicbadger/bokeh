import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchSystemStats } from '@/lib/api'
import JobsModal from './JobsModal'

interface StatusBarProps {
  photoCount: number
}

export default function StatusBar({ photoCount }: StatusBarProps) {
  const [showJobsModal, setShowJobsModal] = useState(false)
  const [jobsMinimized, setJobsMinimized] = useState(false)
  
  const { data: stats } = useQuery({
    queryKey: ['systemStats'],
    queryFn: fetchSystemStats,
    refetchInterval: 30000 // Refresh every 30 seconds
  })
  
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
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-12 text-sm text-gray-600">
          <div className="flex gap-6">
            <span>Photos: {photoCount}</span>
            {stats && (
              <>
                <span>Total: {stats.total_photos}</span>
                <span>Library: {formatBytes(stats.total_size)}</span>
                <span>Free: {formatBytes(stats.disk_usage.available)}</span>
              </>
            )}
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleJobsClick}
              className={`flex items-center gap-1 transition-colors ${
                stats?.active_jobs > 0 
                  ? 'text-blue-600 animate-pulse hover:text-blue-700' 
                  : 'text-gray-500 hover:text-gray-700'
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