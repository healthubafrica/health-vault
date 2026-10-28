import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import PillTabBar from './PillTabBar';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/components/useColorScheme', () => ({ useColorScheme: () => 'light' }));

function props(): BottomTabBarProps {
  const routes = ['index', 'vitals', 'services', 'records', 'telecare', 'profile'].map(name => ({ key: name, name }));
  return {
    state: { index: 0, key: 'tabs', type: 'tab', stale: false, routeNames: routes.map(route => route.name), routes, history: [] },
    descriptors: Object.fromEntries(routes.map(route => [route.key, { options: {} }])),
    navigation: { emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() },
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  } as unknown as BottomTabBarProps;
}

describe('Pill tab navigation', () => {
  it('exposes every destination and identifies the selected tab', () => {
    const screen = render(<PillTabBar {...props()} />);
    expect(screen.getAllByRole('tab')).toHaveLength(6);
    expect(screen.getByRole('tab', { name: 'Home' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'TeleCare' })).not.toBeSelected();
  });

  it('emits the navigation event and preserves destination parameters', () => {
    const input = props();
    Object.assign(input.state.routes[4], { params: { source: 'home' } });
    const screen = render(<PillTabBar {...input} />);
    fireEvent.press(screen.getByRole('tab', { name: 'TeleCare' }));
    expect(input.navigation.emit).toHaveBeenCalledWith({ type: 'tabPress', target: 'telecare', canPreventDefault: true });
    expect(input.navigation.navigate).toHaveBeenCalledWith('telecare', { source: 'home' });
  });

  it('honors prevented presses and does not navigate again for the current tab', () => {
    const input = props();
    (input.navigation.emit as jest.Mock).mockReturnValue({ defaultPrevented: true });
    const screen = render(<PillTabBar {...input} />);
    fireEvent.press(screen.getByRole('tab', { name: 'Records' }));
    (input.navigation.emit as jest.Mock).mockReturnValue({ defaultPrevented: false });
    fireEvent.press(screen.getByRole('tab', { name: 'Home' }));
    expect(input.navigation.navigate).not.toHaveBeenCalled();
    fireEvent(screen.getByRole('tab', { name: 'Profile' }), 'longPress');
    expect(input.navigation.emit).toHaveBeenLastCalledWith({ type: 'tabLongPress', target: 'profile' });
  });

  it('respects custom accessible labels and hidden destinations', () => {
    const input = props();
    input.descriptors.profile.options.tabBarAccessibilityLabel = 'My profile';
    Object.assign(input.descriptors.vitals.options, { href: null });
    const screen = render(<PillTabBar {...input} />);
    expect(screen.getAllByRole('tab')).toHaveLength(5);
    expect(screen.getByRole('tab', { name: 'My profile' })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'Vitals' })).toBeNull();
  });
});
