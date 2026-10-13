// Preserve coverage of paid-mode behaviour while the shipping UI is temporarily hidden.
jest.mock('../src/config/releaseFeatures', () => ({
  ...jest.requireActual('../src/config/releaseFeatures'),
  RELEASE_FEATURES: {...jest.requireActual('../src/config/releaseFeatures').RELEASE_FEATURES, premium: true},
}));
jest.mock('../src/services/passwordRecovery',()=>({openPasswordRecovery:jest.fn()}));
import React from 'react';
import Renderer,{act} from 'react-test-renderer';
import {TextInput} from 'react-native';
import LoginScreen from '../src/screens/LoginScreen';
import PremiumStatus from '../src/components/premium/PremiumStatus';
import {setPremiumAccount,setPremiumEntitlement,clearPremiumAccess} from '../src/services/premiumAccess';
jest.mock('../src/context/AuthSessionContext',()=>({useAuthSession:()=>({session:null,signInWithEmail:jest.fn(),signUpWithEmail:jest.fn()})}));
jest.mock('../src/context/LanguageContext',()=>({useLanguage:()=>({language:'en',strings:{appName:'Lekhpal'}})}));
jest.mock('../src/context/ThemeContext',()=>({useAppTheme:()=>({colors:require('../src/theme/palette').LIGHT_COLORS})}));
jest.mock('react-native-safe-area-context',()=>require('react-native-safe-area-context/jest/mock').default);
jest.mock('react-native-vector-icons/MaterialCommunityIcons',()=>require('react-native').View);
let tree:Renderer.ReactTestRenderer;
afterEach(async()=>{if(tree)await act(()=>tree.unmount());clearPremiumAccess();jest.useRealTimers();});
test('password starts hidden, toggles without changing its value and guest entry is absent',async()=>{
 await act(()=>{tree=Renderer.create(<LoginScreen navigation={{replace:jest.fn()} as any} route={{} as any}/>);});
 const input=()=>tree.root.findAllByType(TextInput).find(n=>n.props.accessibilityLabel==='Password')!;
 expect(input().props.secureTextEntry).toBe(true);
 await act(()=>input().props.onChangeText('Example-123'));
 const press=async(label:string)=>act(()=>tree.root.findAll(n=>n.props.accessibilityLabel===label&&!!n.props.onPress)[0].props.onPress());
 await press('Show password');expect(input().props.secureTextEntry).toBe(false);expect(input().props.value).toBe('Example-123');
 await press('Hide password');expect(input().props.secureTextEntry).toBe(true);
 expect(JSON.stringify(tree.toJSON())).not.toMatch(/guest|test mode/i);
});
test('crown follows verified access and disappears on expiry and account change',async()=>{
 jest.useFakeTimers();setPremiumAccount('member');
 await act(()=>{tree=Renderer.create(<PremiumStatus/>);});
 const content=()=>JSON.stringify(tree.toJSON());expect(content()).toContain('Basic account');
 const grant=()=>setPremiumEntitlement({userId:'member',active:true,serverTime:new Date().toISOString(),verifiedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+2000).toISOString(),validUntil:new Date(Date.now()+5000).toISOString(),features:['gps_capture','pdf_reports']});
 await act(grant);expect(content()).toContain('Premium member');expect(content()).toContain('crown');
 await act(()=>jest.advanceTimersByTime(2001));expect(content()).toContain('Basic account');
 await act(grant);await act(async()=>setPremiumAccount('another'));expect(content()).not.toContain('Premium member');
});
