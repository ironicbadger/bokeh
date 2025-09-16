import { ArrowDownUp, Calendar, Clock } from 'lucide-react'
import { SortBy } from '@/lib/api'

interface SortSelectorProps {
  currentSort: SortBy
  sortOrder: 'asc' | 'desc'
  onSortChange: (sort: SortBy) => void
  onOrderToggle: () => void
}

export default function SortSelector({ 
  currentSort, 
  sortOrder, 
  onSortChange, 
  onOrderToggle 
}: SortSelectorProps) {
  return (
    <div className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-2">
      <span className="text-sm text-gray-400">Sort by:</span>
      
      {/* Sort by options */}
      <div className="flex gap-1">
        <button
          onClick={() => onSortChange('created_at')}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors
            ${currentSort === 'created_at' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }
          `}
          title="Sort by when photos were added to library"
        >
          <Clock size={14} />
          Recently Added
        </button>
        
        <button
          onClick={() => onSortChange('date_taken')}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors
            ${currentSort === 'date_taken' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }
          `}
          title="Sort by when photos were taken"
        >
          <Calendar size={14} />
          Date Taken
        </button>
      </div>
      
      {/* Order toggle */}
      <button
        onClick={onOrderToggle}
        className="
          flex items-center gap-1.5 px-3 py-1.5 rounded text-sm
          bg-gray-600 text-gray-300 hover:bg-gray-500 transition-colors
        "
        title={sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
      >
        <ArrowDownUp size={14} />
        {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
      </button>
    </div>
  )
}