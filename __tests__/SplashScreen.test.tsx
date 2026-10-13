import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import SplashScreen from '../src/screens/SplashScreen';
let mockHydrated = false;
let mockStateReady = false;
let mockSession: object | null = {};
let mockState: string | null = 'UP';
jest.mock('../src/context/AuthSessionContext', () => ({
  useAuthSession: () => ({ isHydrated: mockHydrated, session: mockSession }),
}));
jest.mock('../src/context/SelectedStateContext', () => ({
  useSelectedState: () => ({ ready: mockStateReady, stateCode: mockState }),
}));
jest.mock('../src/context/LanguageContext', () => ({
  useLanguage: () => ({ strings: { appName: 'Lekhpal' } }),
}));
jest.mock('../src/components/AppScreen', () => 'AppScreen');
jest.mock('react-native-linear-gradient', () => 'LinearGradient');

test.each([
  ['UP', {}, 'MainDrawer'],
  [null, {}, 'StateSelection'],
  ['UP', null, 'Login'],
])(
  'starts immediately when hydration finishes (%s, %s)',
  async (state, session, destination) => {
    jest.useFakeTimers();
    mockHydrated = false;
    mockStateReady = false;
    mockState = state as string | null;
    mockSession = session as object | null;
    const navigation = { replace: jest.fn() } as any;
    let tree!: Renderer.ReactTestRenderer;
    const screen = () => (
      <SplashScreen
        navigation={navigation}
        route={{ name: 'Splash', key: 'splash' }}
      />
    );
    await act(() => {
      tree = Renderer.create(screen());
    });
    expect(navigation.replace).not.toHaveBeenCalled();
    mockHydrated = true;
    await act(() => tree.update(screen()));
    expect(navigation.replace).not.toHaveBeenCalled();
    mockStateReady = true;
    await act(() => tree.update(screen()));
    expect(navigation.replace).toHaveBeenCalledWith(destination);
    await act(() => tree.unmount());
    jest.useRealTimers();
  },
);
