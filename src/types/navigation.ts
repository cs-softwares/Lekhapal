import type { BhulekhService } from '../data/bhulekhOptions';
import { UpBhulekhLaunchAction } from './upBhulekh';

export type RootStackParamList = {
  Splash: undefined;
  Premium: undefined;
  Login: undefined;
  Otp: {
    channel: 'email' | 'phone';
    displayName: string;
    email?: string;
    phoneNumber?: string;
  };
  MainDrawer: undefined;
  StateSelection: { change?: boolean } | undefined;
  BiharBhumiOfficer: undefined;
  KhasraOptions: undefined;
  KhasraSearch: undefined;
  KhasraFeeding: undefined;
  MapExport: undefined;
  Echawadi: undefined;
  EroPdf: undefined;
  DocumentAutomation: { stateCode: string };
  OfficialWork: {
    module: import('../domain/officialWork').OfficialWorkModule;
    workspaceState?: string;
  };
  RevenueFeeding: { module: import('../domain/revenueFeeding').RevenueModule };
  KhatauniCopy: undefined;
  PlotSaleStatus: undefined;
  PlotDisputeStatus: undefined;
  BhulekhOptions: undefined;
  UpBhulekhAssistant:
    | {
        launchAction?: UpBhulekhLaunchAction;
      }
    | undefined;
  RecordWorkspace: {
    toolId: string;
  };
  MeasurementSavedRecords: {
    kind?: 'calculator';
    moduleId: string;
    storageToolId: string;
    title: string;
  };
  ToolDetails: {
    toolId: string;
  };
  WebViewPortal: {
    title: string;
    toolId?: string;
    url: string;
    bhulekhService?: BhulekhService;
    /** Public help pages return directly to their originating app screen. */
    returnToApp?: boolean;
  };
};

export type DrawerParamList = {
  Workspace: undefined;
  Notifications: undefined;
  Premium: undefined;
  Settings: undefined;
  Help: undefined;
};

export type BottomTabParamList = {
  Home: undefined;
  Services: undefined;
  Measurement:
    | {
        focusToolId?: string;
      }
    | undefined;
  Calculator:
    | {
        focusToolId?: string;
      }
    | undefined;
  Profile: undefined;
};
