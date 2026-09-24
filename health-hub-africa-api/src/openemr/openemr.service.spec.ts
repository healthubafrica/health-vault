import { OpenemrService } from './openemr.service';

// buildAuthorizationUrl only needs config (client id / base url), redis (state
// storage) and no queue interaction, so the service is constructed directly
// with minimal mocks rather than a Nest TestingModule.
function buildService(prisma: unknown = {}) {
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
  return new OpenemrService(prisma as any, config as any, {} as any, redis as any);
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

    // Numeric pid + facility id resolution for calendar writes.
    expect(scopes).toContain('user/patient.read');
    expect(scopes).toContain('user/facility.read');

    // Lab-order delivery as patient messages (pnotes).
    expect(scopes).toContain('user/message.cud');
    expect(scopes).toContain('user/message.write');

    // Clinical history pulls into PatientMedicalInfo.
    expect(scopes).toContain('user/AllergyIntolerance.read');
    expect(scopes).toContain('user/Condition.read');
    expect(scopes).toContain('user/Immunization.read');

    expect(scopes).toContain('offline_access');
  });

  it('rejects redirect URIs outside the allowlist', async () => {
    const service = buildService();

    await expect(
      service.buildAuthorizationUrl('https://evil.example.com/callback'),
    ).rejects.toThrow('redirect_uri not in allowlist');
  });
});

describe('OpenemrService.getAccessToken (concurrent refresh)', () => {
  // Reproduces the production race: several sync jobs (Encounter, AVS, etc.)
  // call getAccessToken() around the same moment the cached token expires.
  // OpenEMR's refresh token is one-time-use, so a second real HTTP refresh
  // would 401 on the already-rotated token — getAccessToken() must dedupe
  // concurrent callers onto a single in-flight refresh instead.
  it('issues only one token-refresh request for concurrent callers', async () => {
    const service = buildService();
    (service as unknown as { refreshToken: string }).refreshToken = 'stored-refresh-token';

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'new-access-token', expires_in: 3600 }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const [a, b, c] = await Promise.all([
      service.getAccessToken(),
      service.getAccessToken(),
      service.getAccessToken(),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toBe('new-access-token');
    expect(b).toBe('new-access-token');
    expect(c).toBe('new-access-token');
  });
});

describe('OpenemrService.callOpenemr (error recording)', () => {
  function stubFetch(status: number, body: string) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status,
      text: async () => body,
    }) as unknown as typeof fetch;
  }

  it('records an IntegrationError and logs for an unexpected non-2xx', async () => {
    const prisma = { integrationError: { create: jest.fn().mockResolvedValue({}) } };
    const service = buildService(prisma);
    const logError = jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
    stubFetch(500, 'boom');

    await expect(
      (service as any).callOpenemr('token', 'POST', '/api/patient/u/encounter', {}),
    ).rejects.toThrow(/OpenEMR 500 on POST/);

    expect(prisma.integrationError.create).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledTimes(1);
  });

  // The encounter sync deliberately tries POST /fhir/Encounter first and falls
  // back to the REST endpoint when the server answers 404 (this OpenEMR does
  // not expose it). That 404 is the *expected* outcome of a probe, not an
  // integration failure — but it was being written to IntegrationError (the
  // admin System Errors page) and logged at ERROR on every single booking,
  // even though the fallback then succeeded.
  it('does not record an IntegrationError or log ERROR for a status the caller declared expected', async () => {
    const prisma = { integrationError: { create: jest.fn().mockResolvedValue({}) } };
    const service = buildService(prisma);
    const logError = jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
    stubFetch(404, '{"error":"An error occurred","message":"Route not found","code":0}');

    await expect(
      (service as any).callOpenemr('token', 'POST', '/fhir/Encounter', {}, 'p1', 'a1', { expectedStatuses: [404] }),
    ).rejects.toThrow(/OpenEMR 404 on POST \/fhir\/Encounter/);

    expect(prisma.integrationError.create).not.toHaveBeenCalled();
    expect(logError).not.toHaveBeenCalled();
  });

  it('still records a status that was not declared expected, even when others were', async () => {
    const prisma = { integrationError: { create: jest.fn().mockResolvedValue({}) } };
    const service = buildService(prisma);
    jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
    stubFetch(401, 'unauthorized');

    await expect(
      (service as any).callOpenemr('token', 'POST', '/fhir/Encounter', {}, 'p1', 'a1', { expectedStatuses: [404] }),
    ).rejects.toThrow(/OpenEMR 401 on POST/);

    expect(prisma.integrationError.create).toHaveBeenCalledTimes(1);
  });
});

describe('OpenemrService.fetchDocumentBytes', () => {
  it('returns the raw bytes and content-type for a successful fetch, bypassing JSON parsing', async () => {
    const service = buildService();
    jest.spyOn(service, 'getAccessToken').mockResolvedValue('token');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: (name: string) => (name === 'content-type' ? 'application/pdf' : null) },
      arrayBuffer: async () => new TextEncoder().encode('%PDF-1.4 fake').buffer,
    }) as unknown as typeof fetch;

    const { buffer, contentType } = await service.fetchDocumentBytes('/apis/default/fhir/Binary/abc123');

    expect(contentType).toBe('application/pdf');
    expect(buffer.toString()).toContain('%PDF');
  });

  it('records an IntegrationError and throws on a non-2xx response', async () => {
    const prisma = { integrationError: { create: jest.fn().mockResolvedValue({}) } };
    const service = buildService(prisma);
    jest.spyOn(service, 'getAccessToken').mockResolvedValue('token');
    jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'not found',
    }) as unknown as typeof fetch;

    await expect(service.fetchDocumentBytes('/apis/default/fhir/Binary/missing')).rejects.toThrow('OpenEMR 404');
    expect(prisma.integrationError.create).toHaveBeenCalledTimes(1);
  });
});
