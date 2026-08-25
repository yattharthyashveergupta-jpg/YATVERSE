import React from 'react'

export function Pill({
  children,
  tone = 'violet',
  className = '',
}: {
  children: React.ReactNode
  tone?: string
  className?: string
}) {
  return <span className={`pill pill-${tone} ${className}`}>{children}</span>
}
