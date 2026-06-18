'use client'
import { motion, useReducedMotion } from 'framer-motion'
import { cardVariant, EASE_OUT } from '@/lib/motion'

interface Props {
  children: React.ReactNode
  style?: React.CSSProperties
  /** Apply y-lift + scale on hover (default true) */
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
          ? { y: -14, scale: 1.03, transition: { duration: 0.22, ease: EASE_OUT } }
          : undefined
      }
      whileTap={!reduced ? { scale: 0.97, transition: { duration: 0.1 } } : undefined}
    >
      {children}
    </motion.div>
  )
}
