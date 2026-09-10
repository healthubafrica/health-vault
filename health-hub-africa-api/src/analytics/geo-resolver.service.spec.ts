import { GeoResolverService, isNonRoutableIp } from './geo-resolver.service';

describe('isNonRoutableIp', () => {
  it.each([
    undefined,
    '127.0.0.1',
    '10.1.2.3',
    '192.168.0.1',
    '172.16.5.4',
    '172.31.255.255',
    '169.254.1.1',
    '100.64.0.1', // CGNAT
    '::1',
    '::ffff:10.0.0.1', // IPv4-mapped private
    'fe80::1',
    'fd00::1',
  ])('treats %s as non-routable', (ip) => {
    expect(isNonRoutableIp(ip)).toBe(true);
  });

  it.each(['8.8.8.8', '1.1.1.1', '102.89.34.10', '2001:4860:4860::8888'])(
    'treats %s as routable',
    (ip) => {
      expect(isNonRoutableIp(ip)).toBe(false);
    },
  );
});

describe('GeoResolverService.resolve', () => {
  function build() {
    const config = { get: jest.fn().mockReturnValue(undefined) };
    const service = new GeoResolverService(config as any);
    return service;
  }

  it('returns null when no database is loaded', () => {
    expect(build().enabled).toBe(false);
    expect(build().resolve('8.8.8.8')).toBeNull();
  });

  it('returns null for a non-routable IP even with a database loaded', () => {
    const service = build();
    (service as any).cityReader = { get: jest.fn() };
    expect(service.resolve('10.0.0.5')).toBeNull();
    expect((service as any).cityReader.get).not.toHaveBeenCalled();
  });

  it('maps a City response into ResolvedGeo and keeps the continent NAME convention', () => {
    const service = build();
    (service as any).dbVersion = '2026-09-10';
    (service as any).cityReader = {
      get: () => ({
        country: { iso_code: 'ng' },
        subdivisions: [{ iso_code: 'LA', names: { en: 'Lagos' } }],
        city: { names: { en: 'Lagos' } },
        continent: { code: 'AF' },
        location: { latitude: 6.45, longitude: 3.39, time_zone: 'Africa/Lagos' },
      }),
    };
    (service as any).asnReader = { get: () => ({ autonomous_system_number: 327790 }) };

    expect(service.resolve('102.89.34.10')).toEqual({
      countryCode: 'NG',
      regionCode: 'LA',
      regionName: 'Lagos',
      city: 'Lagos',
      continentName: 'Africa',
      timezone: 'Africa/Lagos',
      latitude: 6.45,
      longitude: 3.39,
      asn: 'AS327790',
      geoAccuracy: 'city',
      geoProvider: 'maxmind-geolite2',
      geoProviderVersion: '2026-09-10',
    });
  });

  it('reports region-level accuracy when the City name is missing', () => {
    const service = build();
    (service as any).cityReader = {
      get: () => ({ country: { iso_code: 'us' }, subdivisions: [{ iso_code: 'IL', names: { en: 'Illinois' } }] }),
    };
    const result = service.resolve('8.8.8.8');
    expect(result?.geoAccuracy).toBe('region');
    expect(result?.city).toBeUndefined();
  });

  it('still resolves City data when the ASN lookup throws', () => {
    const service = build();
    (service as any).cityReader = { get: () => ({ country: { iso_code: 'gb' } }) };
    (service as any).asnReader = { get: () => { throw new Error('asn miss'); } };
    const result = service.resolve('8.8.8.8');
    expect(result?.countryCode).toBe('GB');
    expect(result?.asn).toBeUndefined();
  });
});
