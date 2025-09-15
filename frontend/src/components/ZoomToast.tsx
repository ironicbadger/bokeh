import React, { useEffect, useState } from 'react'

interface ZoomToastProps {
  level: number
  show: boolean
}

const ZoomToast: React.FC<ZoomToastProps> = ({ level, show }) => {
  const [visible, setVisible] = useState(false)
  
  useEffect(() => {
    if (show) {
      setVisible(true)
      const timer = setTimeout(() => {
        setVisible(false)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [show, level])
  
  if (!visible) return null
  
  return (
    <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
      <div className="bg-gray-800/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in-out">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-sm font-medium">{level} columns</span>
        </div>
      </div>
    </div>
  )
}

export default ZoomToast