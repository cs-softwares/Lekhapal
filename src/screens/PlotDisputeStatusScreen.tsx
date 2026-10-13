import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import BhulekhRecordScreen from './BhulekhRecordScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'PlotDisputeStatus'>;

export default function PlotDisputeStatusScreen({ navigation }: Props) {
  return <BhulekhRecordScreen navigation={navigation} service="dispute" />;
}
