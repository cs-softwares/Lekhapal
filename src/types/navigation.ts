import {UpBhulekhLaunchAction} from './upBhulekh';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Otp: {
    displayName: string;
    phoneNumber: string;
  };
  MainDrawer: undefined;
  BiharBhumiOfficer: undefined;
  UpBhulekhAssistant:
    | {
        launchAction?: UpBhulekhLaunchAction;
      }
    | undefined;
  RecordWorkspace: {
    toolId: string;
  };
  MeasurementSavedRecords: {
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
