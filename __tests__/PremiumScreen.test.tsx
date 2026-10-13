import React from 'react';
import Renderer, {act} from 'react-test-renderer';
import PremiumScreen from '../src/screens/PremiumScreen';
import AppPressable from '../src/components/AppPressable';
const mockNavigate = jest.fn();
let mockLanguage = 'en';
let mockGuest = true;
const mockPremium = {
  plans: [] as any[], active: false, entitlement: null, busy: false, message: '',
  loadPlans: jest.fn(async () => {}), purchase: jest.fn(), restore: jest.fn(),
};
jest.mock('@react-navigation/native', () => ({useNavigation: () => ({navigate: mockNavigate, canGoBack: () => false})}));
jest.mock('../src/context/LanguageContext', () => ({useLanguage: () => ({language: mockLanguage})}));
jest.mock('../src/context/AuthSessionContext', () => ({useAuthSession: () => ({session: {isGuest: mockGuest}})}));
jest.mock('../src/context/PremiumContext', () => ({usePremium: () => mockPremium}));
jest.mock('../src/context/ThemeContext', () => ({useAppTheme: () => ({colors: require('../src/theme/palette').LIGHT_COLORS})}));
jest.mock('../src/components/AppHeader', () => require('react-native').View);
jest.mock('../src/components/AppScreen', () => require('react-native').View);
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => require('react-native').View);
let tree: Renderer.ReactTestRenderer;
const render = async () => { await act(async () => { tree = Renderer.create(<PremiumScreen />); }); };
const buttons = () => tree.root.findAllByType(AppPressable).filter(b => b.props.testID?.startsWith('premium-plan-'));
beforeEach(() => { jest.clearAllMocks(); mockPremium.plans = []; mockPremium.busy = false; mockLanguage = 'en'; mockGuest = true; });
afterEach(async () => { if (tree) await act(() => tree.unmount()); });
test('unavailable store keeps both informational plans visible but cannot start checkout', async () => {
  await render();
  const content = JSON.stringify(tree.toJSON());
  expect(content).toContain('₹199'); expect(content).toContain('₹499');
  expect(buttons()).toHaveLength(2);
  for (const button of buttons()) {
    expect(button.props.disabled).toBe(true);
    await act(() => button.props.onPress?.({} as any));
  }
  expect(mockPremium.purchase).not.toHaveBeenCalled();
  expect(mockNavigate).not.toHaveBeenCalled();
});
test('live checkout uses Play price and offer unchanged, and guest must sign in', async () => {
  const plan = {basePlanId: 'prepaid-quarter', period: 'P3M', price: '₹509.00', productId: 'lekhpal_premium', offerToken: 'store-token'};
  mockPremium.plans = [plan];
  await render();
  expect(JSON.stringify(tree.toJSON())).toContain('₹509.00');
  expect(JSON.stringify(tree.toJSON())).not.toContain('₹499');
  await act(() => buttons()[0].props.onPress?.({} as any));
  expect(mockNavigate).toHaveBeenCalledWith('Login');
  expect(mockPremium.purchase).not.toHaveBeenCalled();
  mockGuest = false;
  await act(() => tree.update(<PremiumScreen />));
  await act(() => buttons()[0].props.onPress?.({} as any));
  expect(mockPremium.purchase).toHaveBeenCalledWith(plan);
  mockPremium.busy = true;
  await act(() => tree.update(<PremiumScreen />));
  expect(buttons()[0].props.disabled).toBe(true);
});
test('Hindi explains benefits, non-renewal and retained free access', async () => {
  mockLanguage = 'hi'; await render();
  const content = JSON.stringify(tree.toJSON());
  expect(content).toContain('अपने आप नवीनीकरण नहीं');
  expect(content).toContain('रोजमर्रा के जरूरी टूल मुफ्त रहेंगे');
  expect(content).toContain('प्लान खत्म होने पर क्या होगा?');
  expect(content).toContain('PDF');
});
