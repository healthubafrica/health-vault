import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        vault: {
          forest: '#07251C',
          green: '#0E8567',
          mint: '#34E0A0',
          'mint-dark': '#34BC93',
          'bg-light': '#F7FAF7',
          'dark-deep': '#052018',
          'dark-mid': '#0C3328',
          'text-mid': '#27433A',
          'text-soft': '#41584E',
          'text-muted': '#7A8C84',
          'text-faint': '#5b6b63',
        },
      },
      fontFamily: {
        grotesk: ['var(--font-space-grotesk)', 'sans-serif'],
        hanken: ['var(--font-hanken-grotesk)', 'sans-serif'],
        playfair: ['var(--font-playfair-display)', 'serif'],
      },
    },
  },
  plugins: [],
}

export default config
