import { RELEASE_FEATURES } from '../config/releaseFeatures';
import React from 'react';
import {Alert, Image, Linking, ScrollView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../components/AppHeader';
import AppPressable from '../components/AppPressable';
import AppScreen from '../components/AppScreen';
import {useAppTheme} from '../context/ThemeContext';
import {useLanguage} from '../context/LanguageContext';
import {APP_INFO} from '../config/appInfo';
import {DEVELOPER_INFO as developer} from '../config/developerInfo';
import {installedAppDetails, openSupportEmail} from '../native/appDetails';
import {openAppStore, shareApp} from '../utils/appActions';

const AboutScreen = () => {
  const {colors} = useAppTheme();
  const {language} = useLanguage();
  const navigation = useNavigation<any>();
  const focused = useIsFocused();
  const t = (en: string, hi: string) => language === 'hi' ? hi : en;
  const app = installedAppDetails();
  const styles = React.useMemo(() => StyleSheet.create({
    content: {padding: 20, paddingBottom: 32, gap: 24},
    introduction: {gap: 12},
    appIcon: {height: 48, width: 48, borderRadius: 12},
    name: {color: colors.text, fontSize: 24, lineHeight: 32, fontWeight: '800'},
    description: {color: colors.textMuted, fontSize: 14, lineHeight: 22},
    section: {gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 20},
    heading: {color: colors.text, fontSize: 20, lineHeight: 28, fontWeight: '800'},
    row: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, minHeight: 76},
    separator: {height: StyleSheet.hairlineWidth, backgroundColor: colors.border},
    icon: {width: 26, alignItems: 'center'},
    grow: {flex: 1, gap: 4},
    label: {color: colors.textMuted, fontSize: 12, lineHeight: 18},
    value: {color: colors.text, fontSize: 15, lineHeight: 23, fontWeight: '700'},
    hint: {color: colors.primary, fontSize: 12, lineHeight: 18},
    inline: {flexDirection: 'row', alignItems: 'center', gap: 12},
    button: {minHeight: 48, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10},
    buttonText: {color: colors.primary, fontSize: 14, lineHeight: 22, fontWeight: '700'},
    infoRow: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, paddingVertical: 14},
    note: {color: colors.textMuted, fontSize: 12, lineHeight: 20},
    footer: {alignItems: 'center', paddingVertical: 14, gap: 5},
    footerLink: {color: colors.primary, fontSize: 17, lineHeight: 25, fontWeight: '800', textAlign: 'center'},
    footerIntro: {color: colors.textMuted, fontSize: 13, lineHeight: 22, textAlign: 'center'},
    heart: {color: colors.danger},
  }), [colors]);
  const run = async (action: () => Promise<unknown>, fallback?: string) => {
    try { await action(); } catch {
      Alert.alert(t('Could not open', 'खुल नहीं पाया'), fallback || t('Please try again.', 'कृपया फिर कोशिश करें।'));
    }
  };
  const website = () => Linking.openURL(developer.website);
  const linkedin = () => Linking.openURL(developer.linkedin);
  const contacts = [
    {id: 'email', icon: 'gmail', label: t('Email us', 'हमें ईमेल करें'), value: developer.email,
      hint: t('Open Gmail', 'Gmail खोलें'), action: openSupportEmail,
      error: t(`Please install an email app, or write to ${developer.email}.`, `ईमेल ऐप इंस्टॉल करें या ${developer.email} पर लिखें।`)},
    {id: 'phone', icon: 'phone-outline', label: t('Call the developer', 'डेवलपर से बात करें'), value: developer.phone,
      hint: t('Open phone dialer', 'फोन डायलर खोलें'), action: () => Linking.openURL(developer.dialUrl),
      error: t(`Please dial +91 ${developer.phone} on your phone.`, `अपने फोन से +91 ${developer.phone} डायल करें।`)},
    {id: 'company', icon: 'web', label: t('Company website', 'कंपनी की वेबसाइट'), value: developer.company,
      hint: t('Explore our work', 'हमारा काम देखें'), action: website},
  ];
  return <AppScreen scroll={false}>
    {focused && <StatusBar barStyle="light-content" />}
    <AppHeader title={t('About Lekhpal', 'लेखपाल के बारे में')} leftIconName="arrow-left"
      onLeftPress={() => navigation.navigate('GovernmentPortals', {screen: 'Home'})} />
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.introduction}>
        <View style={styles.inline}>
          <Image source={require('../../assets/branding/play-store-icon-le-land-512.png')} style={styles.appIcon} accessibilityLabel="Lekhpal" />
          <View style={styles.grow}>
            <Text style={styles.name}>Lekhpal</Text>
            <Text style={styles.label}>Creative Softwares</Text>
          </View>
        </View>
        <Text style={styles.description}>{t(
          'Lekhpal brings everyday land and revenue work into one practical workspace. Built for Lekhpals and people working with land records, it brings government service links, measurement tools, calculations and saved results together on your phone.',
          'लेखपाल भूमि और राजस्व से जुड़े रोजमर्रा के काम के लिए एक उपयोगी कार्यक्षेत्र है। लेखपालों और भूमि अभिलेखों से जुड़े लोगों के लिए बनाया गया यह ऐप सरकारी सेवाओं के लिंक, माप के टूल, गणनाएं और सहेजे गए परिणाम एक ही जगह उपलब्ध कराता है।',
        )}</Text>
        <Text style={styles.description}>{t(
          'Whether you are checking a record, measuring a plot or preparing figures for office work, the aim is to make useful tools easier to find and your work easier to revisit.',
          'रिकॉर्ड देखना हो, भूखंड का क्षेत्रफल निकालना हो या कार्यालय के काम के लिए गणना करनी हो — हमारा उद्देश्य जरूरी टूल तक पहुंच आसान बनाना और पुराने काम को दोबारा खोलने की सुविधा देना है।',
        )}</Text>
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.heading}>{t('How Lekhpal helps', 'लेखपाल आपके काम कैसे आता है')}</Text>
        {[
          [t('Government services in one place', 'सरकारी सेवाओं तक एक जगह से पहुंच'), t(
            'Open services such as Bhulekh, Khatauni, Khasra, Bhu Naksha and eDistrict from the app. Each service keeps its own official website and required login or verification steps.',
            'ऐप से भूलेख, खतौनी, खसरा, भू-नक्शा और ई-डिस्ट्रिक्ट जैसी सेवाएं खोलें। हर सेवा अपनी आधिकारिक वेबसाइट पर चलती है और उसमें जरूरी लॉगिन या सत्यापन की प्रक्रिया बनी रहती है।',
          )],
          [t('Tools for land measurement', 'भूमि माप के उपयोगी टूल'), t(
            'Calculate field area from dimensions, work with irregular plots, convert area units and use map scales to find ground distances. These tools help you organise measurements for your fieldwork.',
            'लंबाई-चौड़ाई से क्षेत्रफल निकालें, अनियमित भूखंड की गणना करें, क्षेत्रफल की इकाइयां बदलें और नक्शे के पैमाने से जमीन की दूरी निकालें। ये टूल फील्ड कार्य के माप व्यवस्थित करने में मदद करते हैं।',
          )],
          [t('Calculations for everyday revenue work', 'रोजमर्रा के राजस्व कार्य की गणनाएं'), t(
            'Work out Khatauni shares and fractions, estimate land value and fees using your entered rates, compare rates, and calculate crop-loss estimates or demand-and-recovery balances.',
            'खतौनी के अंश और हिस्से निकालें, अपनी दर्ज दरों से भूमि मूल्य व शुल्क का अनुमान लगाएं, दरों की तुलना करें और फसल हानि या मांग-वसूली की शेष राशि की गणना करें।',
          )],
          [t('Save results and continue your work', 'परिणाम सहेजें और काम आगे बढ़ाएं'), t(
            'Save supported measurements and calculations with their details, reopen them later, and share results as text or images. Hindi and English options let you work in the language you prefer.',
            'माप और गणना के उपलब्ध परिणाम उनके विवरण के साथ सहेजें, बाद में फिर खोलें और टेक्स्ट या चित्र के रूप में साझा करें। हिंदी और अंग्रेजी के विकल्प से अपनी पसंद की भाषा में काम करें।',
          )],
          ...(RELEASE_FEATURES.premium ? [[t('Extra tools with Premium', 'प्रीमियम के साथ अतिरिक्त सुविधाएं'), t(
            'Premium adds advanced revenue worksheets, GPS boundary capture and editing, editable PDF reports with boundary previews, organisation by village, plot or client, and an ad-free app while your plan is active. Government portal access and basic tools remain free. View the Premium screen for plan availability and details.',
            'प्रीमियम में उन्नत राजस्व गणनाएं, GPS सीमा माप, संपादन योग्य PDF रिपोर्ट, गांव/भूखंड/ग्राहक के अनुसार नोट और सक्रिय प्लान में विज्ञापन-मुक्त ऐप मिलता है। सरकारी पोर्टल तक पहुंच और सामान्य टूल मुफ्त रहते हैं। प्लान की उपलब्धता और विवरण प्रीमियम स्क्रीन पर देखें।',
          )],
          ] : []),
        ].map(([title, body]) => <View key={title} style={styles.introduction}>
          <Text accessibilityRole="header" style={styles.value}>{title}</Text>
          <Text style={styles.description}>{body}</Text>
        </View>)}
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.heading}>{t('Meet the developer', 'डेवलपर से मिलें')}</Text>
        <AppPressable testID="about-developer" accessibilityRole="link" accessibilityLabel="Sneha Shankhwar, LinkedIn"
          accessibilityHint={t('Opens the developer’s LinkedIn profile', 'डेवलपर की LinkedIn प्रोफाइल खोलें')}
          onPress={() => run(linkedin)} style={styles.row}>
          <View style={styles.icon}><Icon name="linkedin" size={23} color={colors.primary} /></View>
          <View style={styles.grow}>
            <Text style={styles.value}>{developer.name}</Text>
            <Text style={styles.hint}>{t('Connect on LinkedIn', 'LinkedIn पर जुड़ें')}</Text>
          </View>
          <Icon name="arrow-top-right" color={colors.primary} size={21} />
        </AppPressable>
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.heading}>{t('Let’s connect', 'हमसे संपर्क करें')}</Text>
        <View>{contacts.map((item, index) => <React.Fragment key={item.id}>
          {index > 0 && <View style={styles.separator} />}
          <AppPressable testID={`about-${item.id}`} accessibilityRole="link" accessibilityLabel={`${item.label}: ${item.value}`} accessibilityHint={item.hint}
            onPress={() => run(item.action, item.error)} style={styles.row}>
            <View style={styles.icon}><Icon name={item.icon} color={colors.primary} size={23} /></View>
            <View style={styles.grow}><Text style={styles.label}>{item.label}</Text><Text style={styles.value}>{item.value}</Text><Text style={styles.hint}>{item.hint}</Text></View>
            <Icon name="chevron-right" size={21} color={colors.textMuted} />
          </AppPressable>
        </React.Fragment>)}</View>
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.heading}>{t('App details', 'ऐप की जानकारी')}</Text>
        <View>{[
          [t('App name', 'ऐप का नाम'), APP_INFO.name],
          [t('Version name', 'वर्ज़न नाम'), app.version],
          [t('Version code / build', 'वर्ज़न कोड / बिल्ड'), app.build],
          [t('Package ID', 'पैकेज ID'), app.packageId],
        ].map(([label, value], index) => <React.Fragment key={label}>
          {index > 0 && <View style={styles.separator} />}
          <View style={styles.infoRow}><Text style={styles.label}>{label}</Text><Text selectable style={styles.value}>{value}</Text></View>
        </React.Fragment>)}</View>
        <AppPressable accessibilityRole="button" accessibilityLabel={t('Share app', 'ऐप साझा करें')} onPress={() => run(() => shareApp(language))} style={styles.button}>
          <Icon name="share-variant-outline" size={20} color={colors.primary} /><Text style={styles.buttonText}>{t('Share Lekhpal', 'लेखपाल साझा करें')}</Text>
        </AppPressable>
        <AppPressable accessibilityRole="link" accessibilityLabel={t('View on Google Play', 'Google Play पर देखें')} onPress={() => run(openAppStore)} style={styles.button}>
          <Icon name="google-play" size={20} color={colors.primary} /><Text style={styles.buttonText}>{t('View on Google Play', 'Google Play पर देखें')}</Text>
        </AppPressable>
        <Text style={styles.note}>{t('Lekhpal is an independent utility app. Government services open on their official websites. Calculations depend on the values you enter.', 'लेखपाल एक स्वतंत्र उपयोगिता ऐप है। सरकारी सेवाएं उनकी आधिकारिक वेबसाइट पर खुलती हैं। गणनाएं आपके दर्ज मानों पर निर्भर करती हैं।')}</Text>
      </View>
      <AppPressable testID="about-footer" accessibilityRole="link" accessibilityLabel="Made with love by Creative Softwares"
        accessibilityHint={t('Opens the Creative Softwares website', 'Creative Softwares की वेबसाइट खोलें')}
        onPress={() => run(website)} style={styles.footer}>
        <Text style={styles.footerIntro}>Made with <Text style={styles.heart}>♥</Text> by</Text>
        <Text style={styles.footerLink}>Creative Softwares ↗</Text>
      </AppPressable>
    </ScrollView>
  </AppScreen>;
};
export default AboutScreen;
