import { OpenemrService } from './openemr.service';

// buildAuthorizationUrl only needs config (client id / base url), redis (state
// storage) and no queue interaction, so the service is constructed directly
// with minimal mocks rather than a Nest TestingModule.
function buildService() {
  const config = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'OPENEMR_BASE_URL') return 'https://clinical.example.com';
      if (key === 'OPENEMR_CLIENT_ID') return 'client-id';
      if (key === 'OPENEMR_CLIENT_SECRET') return 'client-secret';
      throw new Error(`unexpected config key ${key}`);
    }),
    get: jest.fn(() => 'af-south-1'),
  };
  const redis = { set: jest.fn().mockResolvedValue('OK') };
  return new OpenemrService({} as any, config as any, {} as any, redis as any);
}

describe('OpenemrService.buildAuthorizationUrl', () => {
  it('requests the lowercase Standard REST API scopes needed for /api/* calendar writes', async () => {
    const service = buildService();

    const { authorizationUrl } = await service.buildAuthorizationUrl(
      'https://myvaultplus.com/auth/callback',
    );

    const scope = new URL(authorizationUrl).searchParams.get('scope') ?? '';
    const scopes = scope.split(' ');

    // Base scopes for both API families.
    expect(scopes).toContain('api:oemr');
    expect(scopes).toContain('api:fhir');

    // Lowercase Standard-API scopes — without these OpenEMR returns 401 on
    // POST /api/patient/{uuid}/appointment, GET /api/practitioner and the
    // REST encounter fallback, even when api:oemr is granted.
    expect(scopes).toContain('user/appointment.read');
    expect(scopes).toContain('user/appointment.write');
    expect(scopes).toContain('user/appointment.cruds');
    expect(scopes).toContain('user/practitioner.read');
    expect(scopes).toContain('user/encounter.read');
    expect(scopes).toContain('user/encounter.write');

    // Lab-results pull — GET /fhir/DiagnosticReport 401s without this.
    expect(scopes).toContain('user/DiagnosticReport.read');

    // Standard-API write scopes for the push paths whose FHIR equivalents
    // this OpenEMR build does not support (prescriptions, documents, vitals).
    expect(scopes).toContain('user/medication.cruds');
    expect(scopes).toContain('user/document.crs');
    expect(scopes).toContain('user/vital.crus');

    expect(scopes).toContain('offline_access');
  });

  it('rejects redirect URIs outside the allowlist', async () => {
    const service = buildService();

    await expect(
      service.buildAuthorizationUrl('https://evil.example.com/callback'),
    ).rejects.toThrow('redirect_uri not in allowlist');
  });
});
