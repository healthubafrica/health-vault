import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import { EmptyState } from './EmptyState';
import { EmptyAnimation } from './EmptyAnimation';
import { EMPTY_ANIMATIONS } from '@/lib/emptyAnimations';

jest.setTimeout(30000);

describe('EmptyAnimation / EmptyState', () => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  });
  afterEach(() => jest.restoreAllMocks());

  it('shows the artwork instead of the icon when an animation is given, with the text still present', async () => {
    const { findByTestId, getByText } = render(
      <EmptyState animation="vital" title="No vitals recorded yet" description="Tap + to log your first reading." />,
    );
    expect(await findByTestId('empty-animation-vital', { includeHiddenElements: true })).toBeTruthy();
    expect(getByText('No vitals recorded yet')).toBeTruthy();
  });

  it('keeps the icon when no animation is given', () => {
    const { queryByTestId } = render(<EmptyState title="Nothing here" />);
    expect(queryByTestId(/empty-animation-/, { includeHiddenElements: true })).toBeNull();
  });

  it('is hidden from screen readers', async () => {
    const { findByTestId } = render(<EmptyAnimation name="lab" />);
    const node = await findByTestId('empty-animation-lab', { includeHiddenElements: true });
    expect(node.props.accessibilityElementsHidden).toBe(true);
  });

  it('renders both artwork kinds (WebP and Lottie) without crashing and respects reduce motion', async () => {
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(true);
    const a = render(<EmptyAnimation name="notification" />);
    const b = render(<EmptyAnimation name="calendar" />);
    await waitFor(() => expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled());
    expect(a.getByTestId('empty-animation-notification', { includeHiddenElements: true })).toBeTruthy();
    expect(b.getByTestId('empty-animation-calendar', { includeHiddenElements: true })).toBeTruthy();
  });

  it('registers every animation key with a source', () => {
    for (const [key, art] of Object.entries(EMPTY_ANIMATIONS)) {
      expect(art.source).toBeTruthy();
      expect(['webp', 'lottie']).toContain(art.kind);
      expect(key.length).toBeGreaterThan(0);
    }
  });
});
