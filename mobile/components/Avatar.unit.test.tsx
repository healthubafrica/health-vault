import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Avatar from './Avatar';

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return { Image: (props: Record<string, unknown>) => <View testID="photo" {...props} /> };
});
jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  const Stub = (props: Record<string, unknown>) => <View {...props} />;
  return {
    __esModule: true,
    default: (p: Record<string, unknown>) => <View testID="art" {...p} />,
    Circle: Stub,
    ClipPath: Stub,
    Defs: Stub,
    G: Stub,
    Path: Stub,
    Rect: Stub,
  };
});
jest.mock('@/components/useColorScheme', () => ({ useColorScheme: () => 'light' }));

describe('Avatar', () => {
  it('renders the photo when a uri is given', () => {
    const { getByTestId, queryByTestId } = render(
      <Avatar uri="https://x/a.jpg" name="Ada Obi" gender="Female" />,
    );
    expect(getByTestId('photo').props.accessibilityLabel).toBe('Ada Obi profile photo');
    expect(queryByTestId('art')).toBeNull();
  });

  it('falls back to gender art on image error and notifies the owner', () => {
    const onImageError = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <Avatar uri="https://x/a.jpg" name="Ada Obi" gender="Female" onImageError={onImageError} />,
    );
    fireEvent(getByTestId('photo'), 'error');
    expect(onImageError).toHaveBeenCalledTimes(1);
    expect(queryByTestId('photo')).toBeNull();
    expect(getByTestId('art', { includeHiddenElements: true })).toBeTruthy();
  });

  it('retries the photo when the uri changes after an error', () => {
    const { getByTestId, rerender } = render(<Avatar uri="https://x/old.jpg" gender="Male" />);
    fireEvent(getByTestId('photo'), 'error');
    rerender(<Avatar uri="https://x/new.jpg" gender="Male" />);
    expect(getByTestId('photo').props.source).toEqual({ uri: 'https://x/new.jpg' });
  });

  it('shows art for a known gender without a photo', () => {
    const { getByTestId } = render(<Avatar name="Sam" gender="Prefer_not_to_say" />);
    expect(getByTestId('art', { includeHiddenElements: true })).toBeTruthy();
  });

  it('shows initials when gender is unknown', () => {
    const { getByText, queryByTestId } = render(<Avatar name="Ada Obi" />);
    expect(getByText('AO')).toBeTruthy();
    expect(queryByTestId('art')).toBeNull();
  });

  it('is safe with no name', () => {
    const { getByText } = render(<Avatar />);
    expect(getByText('?')).toBeTruthy();
  });
});
