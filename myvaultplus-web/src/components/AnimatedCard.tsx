'use client'
import { motion, useReducedMotion } from 'framer-motion'
import { cardVariant, EASE_OUT } from '@/lib/motion'

interface Props {
  children: React.ReactNode
  style?: React.CSSProperties
  /** Apply y-lift on hover (default true) */
  hoverLift?: boolean
}

export default function AnimatedCard({ children, style, hoverLift = true }: Props) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      style={style}
      variants={cardVariant}
      whileHover={
        !reduced && hoverLift
          ? { y: -6, transition: { duration: 0.18, ease: EASE_OUT } }
          : undefined
      }
      whileTap={!reduced ? { scale: 0.98, transition: { duration: 0.1 } } : undefined}
    >
      {children}
    </motion.div>
  )
}
