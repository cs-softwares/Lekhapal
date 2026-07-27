import React, {useMemo} from 'react';
import {Alert, StyleSheet, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import AppHeader from '../components/AppHeader';
import AppScreen from '../components/AppScreen';
import SavedRecordsPanel from '../components/workspaces/SavedRecordsPanel';
import {useLanguage} from '../context/LanguageContext';
import {useSavedWorkspaceRecords} from '../hooks/useSavedWorkspaceRecords';
import {RootStackParamList} from '../types/navigation';
import {shareTextSummary} from '../utils/workspaceExport';
import {setPendingMeasurementRecordSelection} from '../utils/measurementRecordBridge';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'MeasurementSavedRecords'
>;

const MeasurementSavedRecordsScreen = ({
  navigation,
  route,
}: Props) => {
  const {language} = useLanguage();
  const {deleteRecord, records} = useSavedWorkspaceRecords(
    route.params.storageToolId,
  );

  const copy = useMemo(
    () => ({
      emptyBody:
        language === 'hi'
          ? 'Saved records yahan dikhengi. Kisi record ko load karke tool me dobara use kar sakte hain.'
          : 'Saved records will appear here. Load any record back into the active tool anytime.',
      emptyTitle:
        language === 'hi'
          ? 'Abhi koi saved record nahi hai'
          : 'No saved record yet',
      exportError:
        language === 'hi'
          ? 'Share complete nahi hua'
          : 'Share could not finish',
      load:
        language === 'hi' ? 'Load' : 'Load',
      savedReports:
        language === 'hi'
          ? 'Saved records'
          : 'Saved records',
      share:
        language === 'hi' ? 'Share' : 'Share',
    }),
    [language],
  );

  return (
    <AppScreen>
      <AppHeader
        leftIconName="arrow-left"
        onLeftPress={() => navigation.goBack()}
        title={route.params.title}
      />

      <View style={styles.content}>
        <SavedRecordsPanel
          emptyBody={copy.emptyBody}
          emptyTitle={copy.emptyTitle}
          loadLabel={copy.load}
          onDelete={deleteRecord}
          onLoad={record => {
            setPendingMeasurementRecordSelection({
              moduleId: route.params.moduleId,
              record,
            });
            navigation.goBack();
          }}
          onShare={record =>
            shareTextSummary({
              summaryLines: record.summaryLines,
              title: record.title,
            }).catch(() => {
              Alert.alert(copy.exportError);
            })
          }
          records={records}
          shareLabel={copy.share}
          title={copy.savedReports}
        />
      </View>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
});

export default MeasurementSavedRecordsScreen;
