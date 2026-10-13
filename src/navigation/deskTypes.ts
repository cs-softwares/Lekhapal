import { NavigatorScreenParams } from '@react-navigation/native';
import { MutationStatus } from '../types';
export type DeskTabs = {
  Dashboard: undefined;
  LandSearch: { query?: string } | undefined;
  FieldMap: { landId?: string } | undefined;
  Mutations:
    | { status?: MutationStatus; landId?: string; create?: boolean }
    | undefined;
  CropSurvey: { landId?: string } | undefined;
};
export type DeskDrawer = {
  FieldDesk: NavigatorScreenParams<DeskTabs> | undefined;
  GovernmentPortals: undefined;
  Certificates: undefined;
  Encroachment: undefined;
  SyncCenter: undefined;
  DeskSettings: undefined;
  Officer: undefined;
  SavedWork: undefined;
  DeskHelp: undefined;
  DeskAbout: undefined;
  LegacyTools: undefined;
};
