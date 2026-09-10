import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import maxmind, { type Reader, type CityResponse, type AsnResponse } from 'maxmind';
import { continentForCountry } from './continent-map';

// Spec §24: an approved GeoIP source, resolved server-side, with the
// provider/version recorded for reproducibility and unknown/private ranges
// handled explicitly. This is the self-hosted MaxMind GeoLite2 path
// (free tier); it degrades to null so the caller can fall back to the
// trusted edge-header geo it already has.

export interface ResolvedGeo {
  countryCode?: string;
  regionCode?: string;
  regionName?: string;
  city?: string;
  continentName?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  asn?: string;
  // Never fabricate precision (spec §H) — this states how far the lookup got.
  geoAccuracy: 'country' | 'region' | 'city' | 'unknown';
  geoProvider: string;
  geoProviderVersion?: string;
}

const PROVIDER = 'maxmind-geolite2';
const CITY_DB = 'GeoLite2-City.mmdb';
const ASN_DB = 'GeoLite2-ASN.mmdb';

// Private / loopback / link-local / CGNAT / reserved. A GeoIP lookup on any
// of these is meaningless, so short-circuit to null rather than return a
// bogus datacentre location.
export function isNonRoutableIp(ip: string | undefined): boolean {
  if (!ip) return true;
  let addr = ip.trim().toLowerCase();
  if (addr === '::1' || addr === 'localhost') return true;
  if (addr.startsWith('::ffff:')) addr = addr.slice(7); // IPv4-mapped IPv6
  if (addr.startsWith('fc') || addr.startsWith('fd') || addr.startsWith('fe80:')) return true;

  const m = addr.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false; // not an IPv4 literal — let maxmind.validate decide
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true; // link-local
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  return false;
}

@Injectable()
export class GeoResolverService implements OnModuleInit {
  private readonly logger = new Logger(GeoResolverService.name);
  private cityReader?: Reader<CityResponse>;
  private asnReader?: Reader<AsnResponse>;
  private dbVersion?: string;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.load();
  }

  /** True once a City database is open and lookups can succeed. */
  get enabled(): boolean {
    return Boolean(this.cityReader);
  }

  private async load(): Promise<void> {
    const dir = this.config.get<string>('GEOIP_DB_DIR');
    if (!dir) {
      this.logger.log('GEOIP_DB_DIR not set — GeoIP resolution disabled, analytics uses edge-header geo.');
      return;
    }
    const cityPath = join(dir, CITY_DB);
    if (!existsSync(cityPath)) {
      this.logger.warn(`${CITY_DB} not found in ${dir} — GeoIP resolution disabled. Run scripts/download-geoip.mjs.`);
      return;
    }
    try {
      // maxmind's own LRU keeps hot lookups off the file — no extra cache layer.
      this.cityReader = await maxmind.open<CityResponse>(cityPath, { cache: { max: 10_000 } });
      this.dbVersion = statSync(cityPath).mtime.toISOString().slice(0, 10);

      const asnPath = join(dir, ASN_DB);
      if (existsSync(asnPath)) {
        this.asnReader = await maxmind.open<AsnResponse>(asnPath, { cache: { max: 10_000 } });
      }
      this.logger.log(`GeoLite2 loaded (city${this.asnReader ? ' + asn' : ''}, db ${this.dbVersion}).`);
    } catch (err) {
      this.logger.error('Failed to open GeoLite2 — falling back to edge-header geo.', err as Error);
      this.cityReader = undefined;
      this.asnReader = undefined;
    }
  }

  /** Resolve a trusted client IP, or null when disabled / non-routable / not found. */
  resolve(ip: string | undefined): ResolvedGeo | null {
    if (!this.cityReader || isNonRoutableIp(ip) || !maxmind.validate(ip!)) return null;

    try {
      const city = this.cityReader.get(ip!);
      if (!city) return null;

      const countryCode = (city.country?.iso_code ?? city.registered_country?.iso_code)?.toUpperCase();
      const subdivision = city.subdivisions?.[0];
      const cityName = city.city?.names?.en;
      const geoAccuracy = cityName ? 'city' : subdivision ? 'region' : countryCode ? 'country' : 'unknown';

      let asn: string | undefined;
      try {
        const a = this.asnReader?.get(ip!);
        if (a?.autonomous_system_number) asn = `AS${a.autonomous_system_number}`;
      } catch {
        // ASN is best-effort — a City hit without an ASN hit is fine.
      }

      return {
        countryCode,
        regionCode: subdivision?.iso_code,
        regionName: subdivision?.names?.en,
        city: cityName,
        // Keep the codebase's existing continent-NAME convention
        // (continentForCountry returns "Africa", not "AF").
        continentName: countryCode ? continentForCountry(countryCode) : undefined,
        timezone: city.location?.time_zone,
        latitude: city.location?.latitude,
        longitude: city.location?.longitude,
        asn,
        geoAccuracy,
        geoProvider: PROVIDER,
        geoProviderVersion: this.dbVersion,
      };
    } catch (err) {
      this.logger.debug(`GeoIP lookup failed: ${(err as Error).message}`);
      return null;
    }
  }
}
