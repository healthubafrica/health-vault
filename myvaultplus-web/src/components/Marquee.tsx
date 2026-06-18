const items = [
  { text: '"Your health records, your care services, your specialist opinions: one vault. Always accessible."', accent: false },
  { text: 'HEALTH-HUB AFRICA®', accent: true },
  { text: 'MYHEALTH VAULT+™', accent: false },
  { text: 'HHA MIDDLEWARE', accent: false },
  { text: 'FHIR-COMPLIANT', accent: false },
  { text: 'ZERO PHI ON DEVICE', accent: false },
]

export default function Marquee() {
  return (
    <section
      style={{
        background: 'transparent',
        padding: '20px 0',
        overflow: 'hidden',
        /* Space between the hero card and the marquee */
        marginTop: 40,
      }}
    >
      <div style={{ display: 'flex', width: 'max-content' }} className="animate-marquee">
        {[0, 1].map((copy) => (
          <div
            key={copy}
            aria-hidden={copy === 1 ? true : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: 44, paddingRight: 44 }}
          >
            {items.map((item, i) => (
              <span
                key={i}
                style={{
                  color: item.accent ? '#0E8567' : i === 0 ? '#07251C' : 'rgba(7,37,28,0.42)',
                  fontWeight: item.accent ? 700 : 500,
                  fontSize: item.accent ? 13 : 14.5,
                  letterSpacing: item.accent ? '0.05em' : undefined,
                  whiteSpace: 'nowrap',
                }}
              >
                {item.text}
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
