import { useEffect, useRef, useState } from 'react'

// A points balance that gives a satisfying little "bump" whenever it changes,
// with thousands-separator formatting.
export function PointsPill({ value, prefix = '✨' }: { value: number; prefix?: string }) {
  const [bump, setBump] = useState(false)
  const prev = useRef(value)
  useEffect(() => {
    if (prev.current !== value) {
      setBump(true)
      const t = setTimeout(() => setBump(false), 420)
      prev.current = value
      return () => clearTimeout(t)
    }
    prev.current = value
  }, [value])
  return (
    <span className={`points-pill ${bump ? 'bump' : ''}`}>
      {prefix} {value.toLocaleString()}
    </span>
  )
}
