import React, { useState, useEffect } from 'react'

interface ZoomControlProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
}

const ZoomControl: React.FC<ZoomControlProps> = ({ 
  value, 
  onChange, 
  min = 1, 
  max = 10, 
  step = 1 
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null)
  
  // Auto-collapse after 3 seconds of no interaction
  useEffect(() => {
    if (isExpanded) {
      const timeout = setTimeout(() => {
        setIsExpanded(false)
      }, 3000)
      setHideTimeout(timeout)
      
      return () => {
        if (timeout) clearTimeout(timeout)
      }
    }
  }, [isExpanded, value]) // Reset timer when value changes
  
  const handleInteraction = () => {
    if (hideTimeout) {
      clearTimeout(hideTimeout)
    }
    setIsExpanded(true)
  }
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Check for Cmd/Ctrl key
      if (e.metaKey || e.ctrlKey) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault()
          onChange(Math.min(max, value + step))
          setIsExpanded(true)
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault()
          onChange(Math.max(min, value - step))
          setIsExpanded(true)
        } else if (e.key === '0') {
          e.preventDefault()
          onChange(Math.round((min + max) / 2)) // Reset to middle
          setIsExpanded(true)
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [value, onChange, min, max, step])
  
  return (
    <div 
      className="fixed bottom-12 right-4 z-20"
      onMouseEnter={handleInteraction}
      onMouseLeave={() => {
        const timeout = setTimeout(() => setIsExpanded(false), 1000)
        setHideTimeout(timeout)
      }}
    >
      {isExpanded ? (
        // Expanded state - modal-like panel with better readability
        <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl p-4 min-w-[280px]">
          {/* Title */}
          <div className="text-xs text-gray-400 font-medium mb-3 flex items-center justify-between">
            <span>Grid Density</span>
            <span className="text-gray-500 text-[10px]">Cmd/Ctrl + +/−</span>
          </div>
          
          {/* Slider controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onChange(Math.max(min, value - step))}
              className="text-gray-400 hover:text-white hover:bg-gray-800 rounded p-1.5 transition-all"
              title="Zoom out (Cmd/Ctrl + -)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
              </svg>
            </button>
            
            <div className="flex-1 flex flex-col gap-1">
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => {
                  onChange(Number(e.target.value))
                  handleInteraction()
                }}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${((value - min) / (max - min)) * 100}%, #4B5563 ${((value - min) / (max - min)) * 100}%, #4B5563 100%)`
                }}
              />
              <div className="flex justify-between text-[10px] text-gray-600 px-1">
                <span>{min}</span>
                <span className="text-blue-400 font-medium">{value} columns</span>
                <span>{max}</span>
              </div>
            </div>
            
            <button
              onClick={() => onChange(Math.min(max, value + step))}
              className="text-gray-400 hover:text-white hover:bg-gray-800 rounded p-1.5 transition-all"
              title="Zoom in (Cmd/Ctrl + +)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          
          {/* Reset button */}
          <div className="mt-3 pt-3 border-t border-gray-800">
            <button
              onClick={() => onChange(Math.round((min + max) / 2))}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Reset to default (Cmd/Ctrl + 0)
            </button>
          </div>
        </div>
      ) : (
        // Collapsed state - minimal indicator
        <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg px-2 py-1">
          <button 
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300 transition-colors"
            title="Click to adjust zoom (Cmd/Ctrl + +/-)"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>{value}x</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default ZoomControl