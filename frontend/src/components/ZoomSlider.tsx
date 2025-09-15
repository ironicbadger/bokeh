import React from 'react'

interface ZoomSliderProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
}

const ZoomSlider: React.FC<ZoomSliderProps> = ({ 
  value, 
  onChange, 
  min = 1, 
  max = 10, 
  step = 1 
}) => {
  return (
    <div className="flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-1">
      <button
        onClick={() => onChange(Math.max(min, value - step))}
        className="text-gray-300 hover:text-white transition-colors"
        title="Zoom out"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
        </svg>
      </button>
      
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
        style={{
          background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${((value - min) / (max - min)) * 100}%, #4B5563 ${((value - min) / (max - min)) * 100}%, #4B5563 100%)`
        }}
      />
      
      <button
        onClick={() => onChange(Math.min(max, value + step))}
        className="text-gray-300 hover:text-white transition-colors"
        title="Zoom in"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
        </svg>
      </button>
      
      <span className="text-xs text-gray-400 ml-1">
        {value}x
      </span>
    </div>
  )
}

export default ZoomSlider