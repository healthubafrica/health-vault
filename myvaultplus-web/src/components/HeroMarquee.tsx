import RoundCarousel from './RoundCarousel'

const HERO_MARQUEE_CARD_IMAGES = [
  '/hero-cards/tags.png',
  '/hero-cards/profile.png',
  '/hero-cards/dark.png',
  '/hero-cards/satisfaction.png',
  '/hero-cards/appt.png',
  '/hero-cards/stat.png',
  '/hero-cards/lab-marquee.png',
  '/hero-cards/dispatch-marquee.png',
  '/hero-cards/review.png',
  '/hero-cards/score.png',
].map((src) => ({ src }))

export default function HeroMarquee({ marginTop = 120 }: { marginTop?: number }) {
  return (
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        // Grows past the passed-in value on wider viewports — the fixed px
        // gap looked fine on mobile but too tight once the hero has room
        // to breathe on desktop.
        marginTop: `clamp(${marginTop}px, ${marginTop}px + 6vw, ${marginTop + 80}px)`,
        height: 'clamp(200px, 28vw, 300px)',
      }}
    >
      <RoundCarousel
        images={HERO_MARQUEE_CARD_IMAGES}
        imageWidth={200}
        imageHeight={200}
        background="transparent"
        speed={1.5}
      />
    </div>
  )
}
