import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { TrackImpression } from './TrackImpression';

jest.mock('@/lib/api', () => ({
  analytics: { track: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { analytics } = require('@/lib/api');

describe('TrackImpression', () => {
  beforeEach(() => {
    analytics.track.mockClear();
  });

  it('fires cta_impression once on mount, with the element/feature/type fields mapped to snake_case', () => {
    render(
      <TrackImpression elementId="quick_action_telecare" featureArea="dashboard" elementType="card">
        <Text>TeleCare</Text>
      </TrackImpression>,
    );

    expect(analytics.track).toHaveBeenCalledTimes(1);
    expect(analytics.track).toHaveBeenCalledWith('cta_impression', {
      element_id: 'quick_action_telecare',
      feature_area: 'dashboard',
      element_type: 'card',
    });
  });

  it('renders its children', () => {
    const { getByText } = render(
      <TrackImpression elementId="service_telecare_cta">
        <Text>Book TeleCare</Text>
      </TrackImpression>,
    );

    expect(getByText('Book TeleCare')).toBeTruthy();
  });

  it('does not fire a second impression on re-render with the same props', () => {
    const { rerender } = render(
      <TrackImpression elementId="quick_action_telecare">
        <Text>TeleCare</Text>
      </TrackImpression>,
    );
    rerender(
      <TrackImpression elementId="quick_action_telecare">
        <Text>TeleCare (updated label)</Text>
      </TrackImpression>,
    );

    expect(analytics.track).toHaveBeenCalledTimes(1);
  });

  it('fires independently for two separately-mounted instances with different elementIds', () => {
    render(
      <>
        <TrackImpression elementId="service_telecare_cta">
          <Text>TeleCare</Text>
        </TrackImpression>
        <TrackImpression elementId="service_caretest_cta">
          <Text>CareTest</Text>
        </TrackImpression>
      </>,
    );

    expect(analytics.track).toHaveBeenCalledTimes(2);
    expect(analytics.track).toHaveBeenCalledWith('cta_impression', expect.objectContaining({ element_id: 'service_telecare_cta' }));
    expect(analytics.track).toHaveBeenCalledWith('cta_impression', expect.objectContaining({ element_id: 'service_caretest_cta' }));
  });
});
