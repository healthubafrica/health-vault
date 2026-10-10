import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { AnalyticsController } from './analytics.controller';

describe('AnalyticsController.trackEvent', () => {
  it('is guarded by OptionalJwtAuthGuard so a bearer token attributes the event', () => {
    const guards = Reflect.getMetadata('__guards__', AnalyticsController.prototype.trackEvent) as unknown[];
    expect(guards).toContain(OptionalJwtAuthGuard);
  });

  it('passes the JWT user (never body input) to the service', () => {
    const service = { trackEvent: jest.fn() };
    const controller = new AnalyticsController(service as any);
    const user = { sub: 'user-1' } as any;
    controller.trackEvent({ eventType: 'page_view' } as any, { headers: {}, ip: '1.1.1.1' } as any, user);
    expect(service.trackEvent).toHaveBeenCalledWith(expect.anything(), user, expect.anything());
  });
});
