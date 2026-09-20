// iso-3166-1 ships no type declarations; this covers only what the world-map
// component uses (alpha-2 → ISO numeric, to match world-atlas feature ids).
declare module 'iso-3166-1' {
  export interface Iso3166Country {
    country: string
    alpha2: string
    alpha3: string
    numeric: string
  }
  const iso3166: {
    whereAlpha2(alpha2: string): Iso3166Country | undefined
    all(): Iso3166Country[]
  }
  export default iso3166
}
