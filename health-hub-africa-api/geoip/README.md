# GeoIP databases

`GeoResolverService` (`src/analytics/geo-resolver.service.ts`) resolves session
IPs to country / region / city / lat-long / ASN for analytics (spec §24), using
the self-hosted **MaxMind GeoLite2** databases.

The `.mmdb` files are **not committed** — MaxMind's GeoLite2 EULA forbids
redistribution. They are gitignored (`*.mmdb`); this directory is kept only for
this README.

## Files expected here

| File | Edition | Purpose |
|---|---|---|
| `GeoLite2-City.mmdb` | GeoLite2 City | country → region → city + coords + timezone |
| `GeoLite2-ASN.mmdb` | GeoLite2 ASN | autonomous-system number (VPN/hosting signal) |

## Setup

1. Create a free MaxMind account → **Manage License Keys** → generate a key.
2. Set in the API environment:
   - `GEOIP_DB_DIR` — absolute path to this directory in the deployed image
     (e.g. `/var/app/current/health-hub-africa-api/geoip`)
   - `MAXMIND_LICENSE_KEY` — the key from step 1 (used only by the download
     script, never read at runtime)
3. Run `npm run geoip:download` (needs `tar` on PATH — bundled with Windows 10+,
   macOS, Linux).

## CI / deploy

Add `npm run geoip:download` to the API deploy job after `npm ci`. MaxMind
refreshes GeoLite2 twice weekly, so re-running on every deploy (or via a weekly
job) keeps it current. `GeoResolverService` records the file's mtime date as
`geo_provider_version` on each event.

## Graceful absence

If `MAXMIND_LICENSE_KEY` or the `.mmdb` files are missing, the download script
exits 0 with a warning and `GeoResolverService` stays disabled — analytics falls
back to the Vercel/CloudFront edge-header geo (country + region + city only). A
deploy without GeoIP still succeeds.
