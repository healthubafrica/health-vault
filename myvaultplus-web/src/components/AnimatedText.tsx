'use client'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'
import { EASE_OUT } from '@/lib/motion'

interface Props {
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
  delay?: number
  /** Y offset to start from (default 40) */
  y?: number
  /** Animation duration in seconds (default 0.78) */
  duration?: number
  /** Horizontal slide direction instead of vertical */
  x?: number
}

export default function AnimatedText({
  children,
  style,
  className,
  delay = 0,
  y = 40,
  duration = 0.78,
  x,
}: Props) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.15 })
  const reduced = useReducedMotion()

  const hidden = x !== undefined ? { opacity: 0, x } : { opacity: 0, y }
  const visible = x !== undefined ? { opacity: 1, x: 0 } : { opacity: 1, y: 0 }

  return (
    <motion.div
      ref={ref}
      style={style}
      className={className}
      initial={reduced ? false : hidden}
      animate={inView ? visible : hidden}
      transition={{ duration, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  )
}
