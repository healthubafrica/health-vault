// Shared animation tokens — all durations, easings, and variants live here

export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1]
export const EASE_IN: [number, number, number, number] = [0.7, 0, 0.84, 0]

export const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
}

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
}

// Container variant — propagates staggerChildren to child motion elements
export const staggerContainer = (stagger = 0.07) => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger } },
})

// Standard card child variant — used with staggerContainer parents
export const cardVariant = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE_OUT },
  },
}

// Transition presets
export const transition = {
  slow: { duration: 0.5, ease: EASE_OUT },
  normal: { duration: 0.3, ease: EASE_OUT },
  fast: { duration: 0.15, ease: EASE_OUT },
  spring: { type: 'spring' as const, stiffness: 280, damping: 28 },
}
