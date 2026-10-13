import { LIGHT_COLORS } from '../theme/palette';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AppHeader from '../components/AppHeader';
import AppScreen from '../components/AppScreen';
import UpPortalListItem from '../components/UpPortalListItem';
import { useLanguage } from '../context/LanguageContext';
import { KHASRA_OPTIONS } from '../data/khasraOptions';
import { openUpHomeEntry } from '../navigation/upEntryNavigation';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'KhasraOptions'>;

export default function KhasraOptionsScreen({ navigation }: Props) {
  const { language } = useLanguage();
  return (
    <AppScreen scroll={false}>
      <AppHeader
        title={language === 'hi' ? 'खसरा पोर्टल' : 'Khasra Portal'}
        leftIconName="arrow-left"
        onLeftPress={() => navigation.goBack()}
      />
      <View style={styles.options}>
        {KHASRA_OPTIONS.map(option => (
          <UpPortalListItem
            key={option.id}
            title={option.title[language]}
            subtitle={option.subtitle[language]}
            icon={option.icon}
            accentColor={option.accentColor}
            isLast={false}
            onPress={() => openUpHomeEntry(navigation, option, language)}
          />
        ))}
        <UpPortalListItem
          title={language === 'hi' ? 'खसरा फीडिंग' : 'Khasra Feeding'}
          subtitle={
            language === 'hi'
              ? 'फसल प्रविष्टि, सिंचाई और जांचे हुए प्रीसेट।'
              : 'Crop entry, irrigation and reviewed form presets.'
          }
          icon="form-select"
          accentColor={LIGHT_COLORS.primary}
          isLast
          onPress={() => navigation.navigate('KhasraFeeding')}
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({ options: { padding: 20 } });
