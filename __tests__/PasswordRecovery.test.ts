const mockSend=jest.fn(async()=>({error:null}));
const mockSet=jest.fn(async():Promise<any>=>({data:{session:{user:{id:'reset-user'}}},error:null}));
const mockUser=jest.fn(async():Promise<any>=>({data:{user:{id:'reset-user',email:'reset@example.com'}},error:null}));
const mockUpdate=jest.fn(async():Promise<any>=>({data:{user:{id:'reset-user'}},error:null}));
const mockOut=jest.fn(async()=>({error:null}));
const mockCreate=jest.fn(()=>({auth:{resetPasswordForEmail:mockSend,setSession:mockSet,getUser:mockUser,updateUser:mockUpdate,signOut:mockOut}}));
jest.mock('@supabase/supabase-js',()=>({createClient:(...args:any[])=>(mockCreate as any)(...args)}));
jest.mock('../src/services/supabase',()=>({SUPABASE_URL:'https://edzpqmcjsweddavklitb.supabase.co',SUPABASE_ANON_KEY:'test-public-key'}));
jest.mock('../src/native/appDetails',()=>({installedAppDetails:()=>({packageId:'com.lekhpal'})}));
import {acceptRecoveryUrl,discardRecovery,isRecoveryUrl,requestRecoveryEmail,updateRecoveredPassword} from '../src/services/passwordRecovery';
const link='com.lekhpal://auth/reset-password#type=recovery&access_token=test-access&refresh_token=test-refresh';
beforeEach(async()=>{await discardRecovery();jest.clearAllMocks();});
afterEach(()=>jest.restoreAllMocks());
test('reset emails use only the Lekhpal callback and never the signed-in client',async()=>{
 await requestRecoveryEmail('  RESET@example.com ');expect(mockSend).toHaveBeenCalledWith('reset@example.com',{redirectTo:'com.lekhpal://auth/reset-password'});
 expect(mockSet).not.toHaveBeenCalled();expect(mockUpdate).not.toHaveBeenCalled();
 await expect(requestRecoveryEmail('not-an-email')).rejects.toThrow();
});
test('wrong destinations and non-recovery links never establish a session',async()=>{
 expect(isRecoveryUrl('com.lekhpal://auth.evil/reset-password')).toBe(false);expect(isRecoveryUrl('https://example.com/reset-password')).toBe(false);
 await expect(acceptRecoveryUrl(link.replace('type=recovery','type=signup'))).rejects.toThrow();expect(mockSet).not.toHaveBeenCalled();
 await expect(updateRecoveredPassword('New-example-123')).rejects.toThrow(/expired/);expect(mockUpdate).not.toHaveBeenCalled();
});
test('only verified recovery can update a password, and the temporary session is discarded',async()=>{
 expect(await acceptRecoveryUrl(link)).toBe('reset@example.com');await expect(updateRecoveredPassword('short')).rejects.toThrow(/8/);
 await updateRecoveredPassword('New-example-123');expect(mockUpdate).toHaveBeenCalledWith({password:'New-example-123'});expect(mockOut).toHaveBeenCalledWith({scope:'local'});
 await expect(updateRecoveredPassword('Again-example-123')).rejects.toThrow(/expired/);
});
test('expired links, identity changes and elapsed reset sessions cannot change a password',async()=>{
 mockSet.mockResolvedValueOnce({data:{session:null},error:{message:'expired'}});await expect(acceptRecoveryUrl(link)).rejects.toThrow(/expired/);
 await acceptRecoveryUrl(link);mockUser.mockResolvedValueOnce({data:{user:{id:'different'}},error:null});await expect(updateRecoveredPassword('New-example-123')).rejects.toThrow(/expired/);expect(mockUpdate).not.toHaveBeenCalled();
 await acceptRecoveryUrl(link);jest.spyOn(Date,'now').mockReturnValue(Date.now()+601000);await expect(updateRecoveredPassword('New-example-123')).rejects.toThrow(/expired/);
});
