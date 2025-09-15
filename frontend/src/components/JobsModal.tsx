import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Loader2, ChevronDown, FolderOpen, Check } from 'lucide-react'

interface Job {
  id: number
  type: string
  status: string  // Allow any status string for flexibility
  progress: number
  total_items?: number
  processed_items?: number
  created_at: string
  started_at?: string
  completed_at?: string
  error_message?: string
  payload?: any
}

interface JobsModalProps {
  isOpen: boolean
  onClose: () => void
  onMinimize: () => void
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const fetchJobs = async (): Promise<Job[]> => {
  const response = await fetch(`${API_URL}/api/v1/jobs?include_completed=false`)
  if (!response.ok) throw new Error('Failed to fetch jobs')
  return response.json()
}

const cancelJob = async (jobId: number): Promise<void> => {
  const response = await fetch(`${API_URL}/api/v1/jobs/${jobId}/cancel`, {
    method: 'POST'
  })
  if (!response.ok) throw new Error('Failed to cancel job')
}

const startScan = async (scanType: string = 'incremental'): Promise<any> => {
  const response = await fetch(`${API_URL}/api/v1/photos/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scan_type: scanType })
  })
  if (!response.ok) throw new Error('Failed to start scan')
  return response.json()
}

export default function JobsModal({ isOpen, onClose, onMinimize }: JobsModalProps) {
  const queryClient = useQueryClient()
  const [scanStatus, setScanStatus] = useState<string>('')
  const [pendingCancelId, setPendingCancelId] = useState<number | null>(null)
  
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: fetchJobs,
    refetchInterval: isOpen ? 1000 : false, // Refresh every second when open
    enabled: isOpen
  })

  const cancelMutation = useMutation({
    mutationFn: cancelJob,
    onSuccess: () => {
      setPendingCancelId(null)
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['systemStats'] })
    },
    onError: () => {
      setPendingCancelId(null)
    }
  })

  const scanMutation = useMutation({
    mutationFn: () => startScan('incremental'),
    onSuccess: (data) => {
      setScanStatus(`Scan started: Job #${data.job_id}`)
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['systemStats'] })
      // Clear status after 3 seconds
      setTimeout(() => setScanStatus(''), 3000)
    },
    onError: () => {
      setScanStatus('Failed to start scan')
      setTimeout(() => setScanStatus(''), 3000)
    }
  })

  // Reset pending cancel when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPendingCancelId(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleCancelClick = (jobId: number) => {
    if (pendingCancelId === jobId) {
      // Second click on X - cancel the confirmation
      setPendingCancelId(null)
    } else {
      // First click - show confirmation
      setPendingCancelId(jobId)
      // Auto-reset after 3 seconds if no confirmation
      setTimeout(() => {
        setPendingCancelId(prev => prev === jobId ? null : prev)
      }, 3000)
    }
  }

  const handleConfirmCancel = (jobId: number) => {
    // Green check clicked - actually cancel the job
    cancelMutation.mutate(jobId)
  }

  const getJobTitle = (job: Job) => {
    const titles: Record<string, string> = {
      'DIRECTORY_SCAN': 'Scanning Photos',
      'directory_scan': 'Scanning Photos',
      'THUMBNAIL_GENERATION': 'Generating Thumbnails',
      'thumbnail_generation': 'Generating Thumbnails',
      'IMPORT': 'Importing Photos',
      'import': 'Importing Photos',
      'DUPLICATE_DETECTION': 'Finding Duplicates',
      'duplicate_detection': 'Finding Duplicates'
    }
    
    let title = titles[job.type] || job.type
    
    // Add worker count for thumbnail generation
    if ((job.type === 'THUMBNAIL_GENERATION' || job.type === 'thumbnail_generation') && job.payload?.workers) {
      title += ` (${job.payload.workers} workers)`
    }
    
    return title
  }

  const getCurrentFile = (job: Job) => {
    // Special handling for thumbnail generation
    if (job.type === 'THUMBNAIL_GENERATION' || job.type === 'thumbnail_generation') {
      if (job.payload?.processed !== undefined && job.payload?.photo_count) {
        return `Processing photos: ${job.payload.processed} completed, ${job.payload.failed || 0} failed`
      }
    }
    
    // Try to get current file from payload or progress info
    if (job.payload?.current_file) {
      return job.payload.current_file
    }
    if (job.processed_items && job.total_items) {
      return `Processing ${job.processed_items} of ${job.total_items} files`
    }
    return ''
  }

  const activeJobs = jobs?.filter(j => 
    j.status === 'RUNNING' || j.status === 'running' || 
    j.status === 'PENDING' || j.status === 'pending'
  ) || []

  return (
    <div className="fixed bottom-12 right-4 bg-white border border-gray-200 rounded-t-lg shadow-lg w-96 z-40 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-medium text-gray-700">Activity</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={onMinimize}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Minimize"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-3 border-b border-gray-100 space-y-2">
        <button
          onClick={() => scanMutation.mutate()}
          disabled={scanMutation.isPending || activeJobs.some(j => 
            j.type?.toLowerCase() === 'directory_scan'
          )}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <FolderOpen className="w-4 h-4" />
          <span>Scan My Library</span>
        </button>
        
        <button
          onClick={async () => {
            try {
              const response = await fetch(`${API_URL}/api/v1/thumbnails/regenerate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ force: true })
              })
              const data = await response.json()
              setScanStatus(`Regenerating thumbnails for ${data.total_photos || 'all'} photos`)
              queryClient.invalidateQueries({ queryKey: ['jobs'] })
              setTimeout(() => setScanStatus(''), 5000)
            } catch (error) {
              setScanStatus('Failed to start thumbnail regeneration')
              setTimeout(() => setScanStatus(''), 3000)
            }
          }}
          disabled={activeJobs.some(j => 
            j.type?.toLowerCase() === 'thumbnail_generation'
          )}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Loader2 className="w-4 h-4" />
          <span>Force Regenerate All Thumbnails</span>
        </button>
        
        {scanStatus && (
          <p className="text-xs text-center mt-2 text-gray-600">{scanStatus}</p>
        )}
      </div>

      {/* Jobs List */}
      <div className="max-h-64 overflow-y-auto bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : activeJobs.length > 0 ? (
          <div>
            {activeJobs.map((job) => (
              <div key={job.id} className="px-4 py-3 border-b border-gray-100 last:border-0">
                {/* Job Title and Cancel Button */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                    <span className="text-sm font-medium text-gray-700">{getJobTitle(job)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {pendingCancelId === job.id && (
                      <button
                        onClick={() => handleConfirmCancel(job.id)}
                        disabled={cancelMutation.isPending}
                        className="p-1 text-green-600 hover:text-green-700 transition-colors animate-pulse"
                        title="Confirm cancellation"
                      >
                        <Check className="w-4 h-4 font-bold" strokeWidth={3} />
                      </button>
                    )}
                    <button
                      onClick={() => handleCancelClick(job.id)}
                      disabled={cancelMutation.isPending}
                      className={`p-1 transition-colors ${
                        pendingCancelId === job.id 
                          ? 'text-red-600' 
                          : 'text-gray-400 hover:text-red-500'
                      }`}
                      title={pendingCancelId === job.id ? "Cancel confirmation" : "Cancel job"}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                
                {/* Confirmation text */}
                {pendingCancelId === job.id && (
                  <div className="text-xs text-red-600 text-right mb-1">
                    Confirm job cancellation?
                  </div>
                )}

                {/* Current File */}
                {getCurrentFile(job) && (
                  <div className="text-xs text-gray-500 mb-2 truncate pl-5">
                    {getCurrentFile(job)}
                  </div>
                )}

                {/* Progress Bar */}
                {job.progress !== undefined && (
                  <div className="pl-5">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-500">
                        {job.processed_items || 0} / {job.total_items || '?'} items
                      </span>
                      <span className="text-xs font-medium text-gray-600">
                        {Math.round(job.progress || 0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${job.progress || 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-6 text-sm">
            No active jobs
          </div>
        )}
      </div>
    </div>
  )
}