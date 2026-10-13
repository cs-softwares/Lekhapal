import React from 'react';
import Renderer,{act} from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AuthSessionProvider,useAuthSession} from '../src/context/AuthSessionContext';
const mockSession=jest.fn(async():Promise<any>=>({data:{session:null},error:null}));
jest.mock('../src/services/supabase',()=>({isSupabaseConfigured:true,supabase:{auth:{getSession:()=>mockSession()}}}));
let value:ReturnType<typeof useAuthSession>;let tree:Renderer.ReactTestRenderer;
function Read(){value=useAuthSession();return null;}
const mount=async()=>act(async()=>{tree=Renderer.create(<AuthSessionProvider><Read/></AuthSessionProvider>);});
beforeEach(async()=>{await AsyncStorage.clear();mockSession.mockClear();});
afterEach(async()=>{if(tree)await act(()=>tree.unmount());});
test('cached guest accounts cannot bypass sign-in and saved fieldwork is retained',async()=>{
 await AsyncStorage.setItem('lekhpal-smart-work-session',JSON.stringify({isGuest:true,plan:'guest'}));
 await AsyncStorage.setItem('smart-work-records-UP-example','saved work');await mount();
 expect(value.session).toBeNull();expect(value.isHydrated).toBe(true);expect((value as any).continueAsGuest).toBeUndefined();
 expect(await AsyncStorage.getItem('lekhpal-smart-work-session')).toBeNull();expect(await AsyncStorage.getItem('smart-work-records-UP-example')).toBe('saved work');expect(mockSession).not.toHaveBeenCalled();
});
test('authenticated users still restore using the existing Supabase session',async()=>{
 await AsyncStorage.setItem('lekhpal-smart-work-session',JSON.stringify({isGuest:false}));
 mockSession.mockResolvedValueOnce({data:{session:{user:{id:'user',email:'test@example.com',user_metadata:{display_name:'User'}}}},error:null});await mount();
 expect(value.session).toMatchObject({userId:'user',isGuest:false,plan:'free'});
});
