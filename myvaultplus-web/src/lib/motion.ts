export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1]
export const EASE_IN: [number, number, number, number] = [0.7, 0, 0.84, 0]

// Section-level entrance — big y + subtle scale
export const fadeUp = {
  hidden: { opacity: 0, y: 80, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1 },
}

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.84 },
  visible: { opacity: 1, scale: 1 },
}

// Zoom out — starts oversized, shrinks to natural size (dramatic reveal)
export const zoomOut = {
  hidden: { opacity: 0, scale: 1.18 },
  visible: { opacity: 1, scale: 1 },
}

// Directional slides
export const slideLeft = {
  hidden: { opacity: 0, x: -80 },
  visible: { opacity: 1, x: 0 },
}
export const slideRight = {
  hidden: { opacity: 0, x: 80 },
  visible: { opacity: 1, x: 0 },
}
export const slideUp = {
  hidden: { opacity: 0, y: 100 },
  visible: { opacity: 1, y: 0 },
}

// Per-element section-header variants — used inside a staggerContainer parent
export const labelVariant = {
  hidden: { opacity: 0, y: 28, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.9, ease: EASE_OUT } },
}
export const headingVariant = {
  hidden: { opacity: 0, y: 64 },
  visible: { opacity: 1, y: 0, transition: { duration: 1.1, ease: EASE_OUT } },
}
export const bodyVariant = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 1.0, ease: EASE_OUT } },
}

// Stagger container — propagates staggerChildren to child motion elements
export const staggerContainer = (stagger = 0.15) => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren: 0.1 } },
})

// Card child variant — scale + lift on entrance
export const cardVariant = {
  hidden: { opacity: 0, y: 80, scale: 0.90 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 1.0, ease: EASE_OUT },
  },
}

// Zoom-out card variant — starts oversized, settles to normal
export const zoomOutCard = {
  hidden: { opacity: 0, scale: 1.18, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 1.1, ease: EASE_OUT },
  },
}

// Slide-up card variant — dramatic vertical rise
export const slideUpCard = {
  hidden: { opacity: 0, y: 100 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 1.0, ease: EASE_OUT },
  },
}

// Transition presets
export const transition = {
  slow: { duration: 1.1, ease: EASE_OUT },
  normal: { duration: 0.85, ease: EASE_OUT },
  fast: { duration: 0.25, ease: EASE_OUT },
  spring: { type: 'spring' as const, stiffness: 180, damping: 22 },
}
