'use client'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'
import { staggerContainer, fadeUp, EASE_OUT } from '@/lib/motion'

interface Props {
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
  /** When true, propagates staggerChildren to AnimatedCard children */
  stagger?: boolean
  /** Delay in seconds before this section animates in (non-stagger mode only) */
  delay?: number
}

export default function AnimatedSection({
  children,
  style,
  className,
  stagger = false,
  delay = 0,
}: Props) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.1 })
  const reduced = useReducedMotion()

  const variants = stagger
    ? staggerContainer(0.07)
    : {
        hidden: fadeUp.hidden,
        visible: {
          ...fadeUp.visible,
          transition: { duration: 0.5, ease: EASE_OUT, delay },
        },
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
