import React from 'react'

export function Progress({
  value,
  color = 'violet',
  className = '',
}: {
  value: number
  color?: string
  className?: string
}) {
  const clamped = Math.max(0, Math.min(100, isNaN(value) ? 0 : value))
  const colorMap: Record<string, string> = {
    violet: 'bg-violet-400',
    blue: 'bg-blue-400',
    cyan: 'bg-cyan-400',
    amber: 'bg-amber-400',
    emerald: 'bg-emerald-400',
    red: 'bg-red-400',
  }
  const bgClass = colorMap[color] || 'bg-violet-400'
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-white/[0.07] ${className}`}>
      <div
        className={`h-full rounded-full ${bgClass} transition-all duration-300`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
