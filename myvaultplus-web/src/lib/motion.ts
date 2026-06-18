export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1]
export const EASE_IN: [number, number, number, number] = [0.7, 0, 0.84, 0]

// Section-level entrance — big y + subtle scale
export const fadeUp = {
  hidden: { opacity: 0, y: 60, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1 },
}

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.88 },
  visible: { opacity: 1, scale: 1 },
}

// Directional slides for 2-column left/right layouts
export const slideLeft = {
  hidden: { opacity: 0, x: -64 },
  visible: { opacity: 1, x: 0 },
}
export const slideRight = {
  hidden: { opacity: 0, x: 64 },
  visible: { opacity: 1, x: 0 },
}

// Per-element section-header variants — used inside a staggerContainer parent
export const labelVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
}
export const headingVariant = {
  hidden: { opacity: 0, y: 48 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.85, ease: EASE_OUT } },
}
export const bodyVariant = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT } },
}

// Stagger container — propagates staggerChildren to child motion elements
export const staggerContainer = (stagger = 0.1) => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren: 0.05 } },
})

// Card child variant — scale + lift on entrance
export const cardVariant = {
  hidden: { opacity: 0, y: 56, scale: 0.94 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.75, ease: EASE_OUT },
  },
}

// Transition presets
export const transition = {
  slow: { duration: 0.85, ease: EASE_OUT },
  normal: { duration: 0.65, ease: EASE_OUT },
  fast: { duration: 0.2, ease: EASE_OUT },
  spring: { type: 'spring' as const, stiffness: 220, damping: 22 },
}
