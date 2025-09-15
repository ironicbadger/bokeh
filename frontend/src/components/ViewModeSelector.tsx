import React from 'react'

// SVG Icon Components
export const GridIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7" strokeWidth="2" />
    <rect x="14" y="3" width="7" height="7" strokeWidth="2" />
    <rect x="3" y="14" width="7" height="7" strokeWidth="2" />
    <rect x="14" y="14" width="7" height="7" strokeWidth="2" />
  </svg>
)

export const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2" />
    <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" strokeLinecap="round" />
    <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" strokeLinecap="round" />
    <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" />
  </svg>
)

export const FolderIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
)

export const ChevronRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
  </svg>
)

export const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
  </svg>
)

export const FolderOpenIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
  </svg>
)

export const PhotoIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

export const LoadingIcon = () => (
  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
)

export type ViewMode = 'grid' | 'year' | 'files'

interface ViewModeSelectorProps {
  currentMode: ViewMode
  onModeChange: (mode: ViewMode) => void
}

const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({ currentMode, onModeChange }) => {
  return (
    <div className="flex gap-1">
      <button
        className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
          currentMode === 'grid'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
        onClick={() => onModeChange('grid')}
        title="Grid View (G)"
      >
        <GridIcon />
        <span className="text-sm">Grid</span>
      </button>
      
      <button
        className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
          currentMode === 'year'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
        onClick={() => onModeChange('year')}
        title="Year View (Y)"
      >
        <CalendarIcon />
        <span className="text-sm">Year</span>
      </button>
      
      <button
        className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
          currentMode === 'files'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
        onClick={() => onModeChange('files')}
        title="Files View (F)"
      >
        <FolderIcon />
        <span className="text-sm">Files</span>
      </button>
    </div>
  )
}

export default ViewModeSelector