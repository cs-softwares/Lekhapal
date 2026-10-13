import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import BhulekhRecordScreen from './BhulekhRecordScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'PlotSaleStatus'>;

export default function PlotSaleStatusScreen({ navigation }: Props) {
  return <BhulekhRecordScreen navigation={navigation} service="sale" />;
}
