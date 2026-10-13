import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { DeskDrawer } from '../../navigation/deskTypes';
import { Screen, Empty, Button } from './Kit';
export default function NoLandRecords({ title }: { title: string }) {
  const navigation = useNavigation<DrawerNavigationProp<DeskDrawer>>();
  return (
    <Screen title={title} subtitle="No local land records yet">
      <Empty
        title="Open your state's official portal"
        body="Use the government website for land records and official submissions. No sample records are prefilled."
      />
      <Button
        title="Government websites"
        icon="web"
        onPress={() => navigation.navigate('GovernmentPortals')}
      />
    </Screen>
  );
}
