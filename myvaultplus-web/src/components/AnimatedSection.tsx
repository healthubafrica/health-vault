'use client'
import { motion, useInView, useReducedMotion, type TargetAndTransition } from 'framer-motion'
import { useRef } from 'react'
import { staggerContainer, EASE_OUT } from '@/lib/motion'

interface Props {
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
  /** Propagates staggerChildren to AnimatedCard children */
  stagger?: boolean
  /** Delay in seconds (non-stagger mode only) */
  delay?: number
  /** Entrance direction */
  from?: 'up' | 'left' | 'right' | 'scale'
}

const HIDDEN: Record<NonNullable<Props['from']>, TargetAndTransition> = {
  up:    { opacity: 0, y: 64, scale: 0.97 },
  left:  { opacity: 0, x: -64 },
  right: { opacity: 0, x: 64 },
  scale: { opacity: 0, scale: 0.88 },
}
const VISIBLE: Record<NonNullable<Props['from']>, TargetAndTransition> = {
  up:    { opacity: 1, y: 0, scale: 1 },
  left:  { opacity: 1, x: 0 },
  right: { opacity: 1, x: 0 },
  scale: { opacity: 1, scale: 1 },
}

export default function AnimatedSection({
  children,
  style,
  className,
  stagger = false,
  delay = 0,
  from = 'up',
}: Props) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.08 })
  const reduced = useReducedMotion()

  const variants = stagger
    ? staggerContainer(0.1)
    : {
        hidden: HIDDEN[from],
        visible: { ...VISIBLE[from], transition: { duration: 0.88, ease: EASE_OUT, delay } },
      }

  return (
    <motion.div
      ref={ref}
      style={style}
      className={className}
      variants={variants}
      initial={reduced ? 'visible' : 'hidden'}
      animate={inView ? 'visible' : 'hidden'}
    >
      {children}
    </motion.div>
  )
}
