import { useState, useEffect, useRef } from 'react'

export function useAnimatedNumber(value: number, duration: number = 500): number {
  const [displayValue, setDisplayValue] = useState(value)
  const previousValue = useRef(value)
  const animationRef = useRef<number>()

  useEffect(() => {
    const startValue = previousValue.current
    const endValue = value
    const difference = endValue - startValue

    // If no change, don't animate
    if (difference === 0) return

    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Use easeOutQuad for smooth deceleration
      const easeOutQuad = 1 - Math.pow(1 - progress, 2)
      const currentValue = startValue + difference * easeOutQuad

      setDisplayValue(Math.round(currentValue))

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        previousValue.current = endValue
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [value, duration])

  return displayValue
}