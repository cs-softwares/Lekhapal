// Preserve coverage of paid-mode behaviour while the shipping UI is temporarily hidden.
jest.mock('../src/config/releaseFeatures', () => ({
  ...jest.requireActual('../src/config/releaseFeatures'),
  RELEASE_FEATURES: {...jest.requireActual('../src/config/releaseFeatures').RELEASE_FEATURES, premium: true},
}));
import React from 'react';
import {SelectedStateProvider} from '../src/context/SelectedStateContext';
import Renderer, {act} from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {buildReportHtml, boundaryPreview} from '../src/utils/reportHtml';
import {registerReportEditor} from '../src/services/reportEditor';
import {exportSummaryAsPdf} from '../src/utils/workspaceExport';
import {generatePDF} from 'react-native-html-to-pdf';
import {setPremiumAccount,setPremiumEntitlement,clearPremiumAccess} from '../src/services/premiumAccess';
import {useSavedWorkspaceRecords} from '../src/hooks/useSavedWorkspaceRecords';
import {loadWorkspaceRecords} from '../src/utils/workspaceStorage';
const details={owner:'सीता',village:'गांव A',plot:'24',client:'Client',notes:'Note'};
const activate=()=>{setPremiumAccount('report-user');setPremiumEntitlement({userId:'report-user',active:true,expiresAt:new Date(Date.now()+60000).toISOString(),serverTime:new Date().toISOString(),verifiedAt:new Date().toISOString(),validUntil:new Date(Date.now()+60000).toISOString(),features:['gps_capture','pdf_reports']});};
afterEach(()=>{clearPremiumAccess();registerReportEditor(null);jest.clearAllMocks();});
test('reports escape user content and include bilingual metadata and a coordinate-only boundary',()=>{
 const html=buildReportHtml({title:'<script>bad</script>',details:{...details,notes:'<img src=x onerror=bad>'},summaryLines:['Area: 100 m²'],points:[{lat:27,lng:80},{lat:27,lng:80.01},{lat:27.01,lng:80}]});
 expect(html).not.toContain('<script>');expect(html).not.toContain('<img');expect(html).toContain('&lt;script&gt;');expect(html).toContain('Owner / स्वामी');expect(html).toContain('सीता');expect(html).toContain('<polygon');expect(html).toContain('not an official cadastral map');expect(html).not.toContain('https://');
 expect(boundaryPreview([null,{lat:NaN,lng:0}] as any)).toBe('');
});
test('cancel or expiry during report editing cannot generate a paid PDF',async()=>{
 activate();registerReportEditor(async()=>null);
 await exportSummaryAsPdf({title:'A',fileName:'a',summaryLines:[]});expect(generatePDF).not.toHaveBeenCalled();
 registerReportEditor(async()=>{clearPremiumAccess();return {title:'Edited',details};});
 await exportSummaryAsPdf({title:'A',fileName:'a',summaryLines:[]});expect(generatePDF).not.toHaveBeenCalled();
});
test('organisation persists edits only with active Premium and preserves original measurement inputs',async()=>{
 await AsyncStorage.clear();let value!:ReturnType<typeof useSavedWorkspaceRecords>;
 function Read(){value=useSavedWorkspaceRecords('organisation-test');return null;}
 let tree!:Renderer.ReactTestRenderer;await act(async()=>{tree=Renderer.create(<SelectedStateProvider><Read/></SelectedStateProvider>);});
 let id='';await act(async()=>{id=(await value.saveRecord({title:'Original',summaryLines:['Area 100'],values:{length:'10'}})).id;});
 await act(async()=>{await value.organizeRecord(id,details,'Edited');});expect((await loadWorkspaceRecords('organisation-test'))[0].organization).toBeUndefined();
 activate();await act(async()=>{await value.organizeRecord(id,details,'Edited');});
 const [saved]=await loadWorkspaceRecords('organisation-test');expect(saved.title).toBe('Edited');expect(saved.organization).toEqual(details);expect(saved.values).toEqual({length:'10'});
 clearPremiumAccess();expect((await loadWorkspaceRecords('organisation-test'))[0].organization).toEqual(details);
 await act(()=>tree.unmount());
});
