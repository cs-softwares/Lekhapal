import {DrawerActions} from '@react-navigation/native';

export const DRAWER_NAVIGATION_ID = 'main-drawer';

export type DrawerSection =
  | 'Workspace'
  | 'Notifications'
  | 'Premium'
  | 'Settings'
  | 'Help'
  | 'About';

type NavigationLike = {
  dispatch?: (action: unknown) => void;
  getParent?: (id?: string) => NavigationLike | undefined;
  getState?: () => {type?: string} | undefined;
  openDrawer?: () => void;
};

type DrawerController = {
  closeDrawer: () => void;
  openDrawer: () => void;
  selectSection: (section: DrawerSection) => void;
};

let activeDrawerController: DrawerController | null = null;

export const registerDrawerController = (
  controller: DrawerController,
) => {
  activeDrawerController = controller;
};

export const unregisterDrawerController = () => {
  activeDrawerController = null;
};

export const selectDrawerSection = (
  section: DrawerSection,
) => {
  activeDrawerController?.selectSection(section);
};

const findDrawerNavigation = (
  navigation: NavigationLike,
): NavigationLike | undefined => {
  let current: NavigationLike | undefined = navigation;

  while (current) {
    if (current.getState?.()?.type === 'drawer') {
      return current;
    }

    current = current.getParent?.();
  }

  return undefined;
};

export const openDrawerFromNavigation = (
  navigation: NavigationLike,
) => {
  if (activeDrawerController) {
    activeDrawerController.openDrawer();
    return;
  }

  const drawerNavigation =
    navigation.openDrawer
      ? navigation
      : navigation.getParent?.(DRAWER_NAVIGATION_ID) ??
        findDrawerNavigation(navigation);

  if (!drawerNavigation) {
    return;
  }

  if (drawerNavigation.openDrawer) {
    drawerNavigation.openDrawer();
    return;
  }

  drawerNavigation.dispatch?.(DrawerActions.openDrawer());
};
