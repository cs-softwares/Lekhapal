import React, {useEffect, useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import {ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../components/AppHeader';
import AppPressable from '../components/AppPressable';
import AppScreen from '../components/AppScreen';
import {useAppTheme} from '../context/ThemeContext';
import {useAuthSession} from '../context/AuthSessionContext';
import {useLanguage} from '../context/LanguageContext';
import {usePremium} from '../context/PremiumContext';
import {formatPlanPeriod} from '../domain/premium';
import type {PremiumPlan} from '../services/playBilling';

// Informational previews of the approved India offer, never checkout inputs.
// Purchases always use the full plan and localized price returned by Play.
const previews = [
  {basePlanId: 'prepaid-month', period: 'P1M', price: '₹199'},
  {basePlanId: 'prepaid-quarter', period: 'P3M', price: '₹499'},
];

const PremiumScreen = () => {
  const navigation = useNavigation<any>();
  const {language} = useLanguage();
  const {colors} = useAppTheme();
  const {session} = useAuthSession();
  const premium = usePremium();
  const [loading, setLoading] = useState(true);
  const hi = language === 'hi';
  const t = (en: string, hindi: string) => hi ? hindi : en;
  const signedIn = Boolean(session && !session.isGuest);
  const {loadPlans} = premium;
  useEffect(() => {
    let alive = true;
    loadPlans().finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [loadPlans]);
  const reload = async () => {
    if (loading || premium.busy) return;
    setLoading(true);
    try { await loadPlans(); } finally { setLoading(false); }
  };
  const purchase = (plan?: PremiumPlan) => {
    if (!plan || loading || premium.busy) return;
    if (!signedIn) navigation.navigate('Login');
    else void premium.purchase(plan);
  };
  const styles = React.useMemo(() => StyleSheet.create({
    content: {padding: 20, paddingBottom: 32, gap: 22},
    body: {color: colors.textMuted, fontSize: 14, lineHeight: 22},
    grow: {flex: 1},
    title: {color: colors.text, fontSize: 20, fontWeight: '800', lineHeight: 28},
    label: {color: colors.text, fontSize: 15, fontWeight: '700', lineHeight: 23},
    small: {color: colors.textMuted, fontSize: 12, lineHeight: 19},
    trust: {color: colors.primary, fontSize: 12, fontWeight: '700', lineHeight: 20},
    section: {borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 20, gap: 14},
    plan: {borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 18, gap: 10},
    planHeader: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12},
    price: {color: colors.text, fontSize: 28, fontWeight: '800', lineHeight: 36},
    feature: {flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8},
    icon: {paddingTop: 2},
    button: {backgroundColor: colors.primary, borderRadius: 14, minHeight: 52, paddingHorizontal: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center'},
    buttonText: {color: colors.white, fontSize: 15, lineHeight: 23, fontWeight: '800', textAlign: 'center'},
    disabled: {opacity: 0.5},
    textAction: {minHeight: 48, paddingVertical: 12, justifyContent: 'center'},
    link: {color: colors.primary, fontSize: 14, fontWeight: '700', lineHeight: 22, textAlign: 'center'},
    status: {borderLeftColor: colors.success, borderLeftWidth: 3, paddingLeft: 12, gap: 6},
    group: {gap: 10},
  }), [colors]);

  const benefits = [
    {icon: 'calculator-variant-outline', title: t('Advanced revenue worksheets', 'उन्नत राजस्व गणनाएं'), body: t('Multi-owner shares, valuation and fees, rate comparison, crop-loss estimates and demand–recovery balances. Basic fractions, single-share calculations and land-rate checks stay free.', 'कई सहखातेदारों के अंश, मूल्यांकन व शुल्क, दर तुलना, फसल हानि और मांग-वसूली की गणना। सामान्य भिन्न, एक अंश की गणना और भूमि दर जांच मुफ्त हैं।')},
    {icon: 'folder-search-outline', title: t('Organise work by village, plot or client', 'गांव, भूखंड या ग्राहक के अनुसार कार्य व्यवस्थित करें'), body: t('Add owner and client details to saved measurement and calculation notes, then group them for quick follow-up. Your notes stay on this device.', 'सेव किए माप और गणना में स्वामी व ग्राहक का विवरण जोड़ें और समूह बनाकर जल्दी खोजें। नोट इसी डिवाइस पर रहते हैं।')},
    {icon: 'advertisements-off', title: t('Work without app ads', 'ऐप के विज्ञापन बिना काम करें'), body: t('Premium removes Lekhpal’s in-app ads while your plan is active. Content on official websites is outside our control.', 'सक्रिय प्रीमियम में लेखपाल ऐप के विज्ञापन नहीं दिखते। आधिकारिक वेबसाइट की सामग्री हमारे नियंत्रण में नहीं है।')},
    {icon: 'map-marker-path', title: t('Capture the boundary in the field', 'मैदान में ही खेत की सीमा दर्ज करें'),
      body: t('Mark GPS corners or walk along the boundary to create a plot outline. Edit your captured boundary when needed.', 'GPS से कोने दर्ज करें या सीमा पर चलते हुए खेत की रूपरेखा बनाएं। जरूरत होने पर दर्ज सीमा में बदलाव करें।')},
    {icon: 'file-pdf-box', title: t('Turn your work into a PDF report', 'अपने काम की PDF रिपोर्ट बनाएं'),
      body: t('Preview and edit owner, village, plot and client details before exporting a PDF. GPS reports add a coordinate-based boundary diagram, area, perimeter and corners. English and Hindi labels make reports easy to share.', 'PDF से पहले स्वामी, गांव, भूखंड और ग्राहक का विवरण संपादित करें और पूर्वावलोकन देखें। GPS रिपोर्ट में सीमा की रूपरेखा, क्षेत्रफल, परिमाप और कोने मिलते हैं। रिपोर्ट में हिंदी और अंग्रेजी लेबल हैं।')},
  ];
  // Keep store offers authoritative, including future duration/price changes.
  const plans = premium.plans.length ? [...premium.plans].sort((a, b) =>
    (a.period === 'P1M' ? 0 : a.period === 'P3M' ? 1 : 2) -
    (b.period === 'P1M' ? 0 : b.period === 'P3M' ? 1 : 2)) : previews;
  const preview = premium.plans.length === 0;
  return (
    <AppScreen scroll={false}>
      <AppHeader leftIconName="arrow-left"
        onLeftPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainDrawer')}
        title={t('Lekhpal Premium', 'लेखपाल प्रीमियम')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.group}>
          <Text style={styles.body}>{t('GPS boundary tools and PDF reports for your fieldwork.', 'आपके फील्ड कार्य के लिए GPS सीमा माप और PDF रिपोर्ट।')}</Text>
          <Text style={styles.trust}>{t('One payment • No automatic renewal', 'एक बार भुगतान • अपने आप नवीनीकरण नहीं')}</Text>
        </View>

        {premium.active ? <View style={styles.status}>
          <Text style={styles.label}>{t('Your Premium is active', 'आपका प्रीमियम सक्रिय है')}</Text>
          {premium.entitlement?.expiresAt ? <Text style={styles.body}>{t('Valid until ', 'इस समय तक मान्य: ')}{new Date(premium.entitlement.expiresAt).toLocaleString(hi ? 'hi-IN' : 'en-IN')}</Text> : null}
        </View> : premium.entitlement?.expiresAt ? <Text style={styles.small}>{t('Last purchased validity: ', 'पिछली खरीद की वैधता: ')}{new Date(premium.entitlement.expiresAt).toLocaleString(hi ? 'hi-IN' : 'en-IN')}</Text> : null}

        <View style={styles.group}>
          <Text accessibilityRole="header" style={styles.title}>{t('What Premium adds to your work', 'प्रीमियम से आपके काम में क्या जुड़ता है')}</Text>
          {benefits.map(item => <View key={item.icon} style={styles.feature}>
            <View style={styles.icon}><Icon name={item.icon} size={25} color={colors.primary} /></View>
            <View style={[styles.grow, styles.group]}><Text style={styles.label}>{item.title}</Text><Text style={styles.body}>{item.body}</Text></View>
          </View>)}
        </View>

        <View style={styles.group}>
          <Text accessibilityRole="header" style={styles.title}>{t('Choose the time you need', 'अपनी जरूरत के हिसाब से अवधि चुनें')}</Text>
          <Text style={styles.body}>{t('Both plans include the same Premium features. Only the access period changes.', 'दोनों प्लान में एक जैसी प्रीमियम सुविधाएं हैं। सिर्फ उपयोग की अवधि अलग है।')}</Text>
          {preview ? <Text style={styles.small}>{loading
            ? t('Checking Google Play availability…', 'Google Play पर उपलब्धता जांच रहे हैं…')
            : t('India plan preview. Checkout is currently unavailable; reload to check availability and the final Google Play price.', 'भारत के प्लान की जानकारी। अभी खरीद उपलब्ध नहीं है; उपलब्धता और Google Play की अंतिम कीमत के लिए दोबारा लोड करें।')}</Text> : null}
        </View>
        {plans.map(plan => {
          const live = premium.plans.find(item => item.basePlanId === plan.basePlanId);
          const quarter = plan.period === 'P3M';
          const disabled = !live || loading || premium.busy;
          const duration = formatPlanPeriod(plan.period, hi);
          return <View key={plan.basePlanId} style={styles.plan}>
            <View style={styles.planHeader}>
              <View style={styles.grow}>
                <Text style={styles.title}>{duration} {t('Premium', 'प्रीमियम')}</Text>
                {quarter ? <Text style={styles.trust}>{t('For ongoing fieldwork', 'नियमित फील्ड कार्य के लिए')}</Text> : null}
              </View>
              <Text style={styles.price}>{plan.price}</Text>
            </View>
            <Text style={styles.body}>{t(`One payment for ${duration} of access.`, `${duration} के उपयोग के लिए एक बार भुगतान।`)}</Text>
            <AppPressable testID={`premium-plan-${plan.basePlanId}`} accessibilityRole="button"
              accessibilityState={{disabled, busy: premium.busy}} disabled={disabled}
              onPress={() => purchase(live)} style={[styles.button, disabled && styles.disabled]}>
              <Text style={styles.buttonText}>{loading ? t('Checking availability…', 'उपलब्धता जांच रहे हैं…')
                : !live ? t('Checkout unavailable', 'अभी खरीद उपलब्ध नहीं')
                : premium.busy ? t('Please wait…', 'कृपया प्रतीक्षा करें…')
                : !signedIn ? t('Sign in to choose this plan', 'यह प्लान चुनने के लिए साइन इन करें')
                : t(`Continue with ${duration}`, `${duration} का प्लान चुनें`)}</Text>
            </AppPressable>
          </View>;
        })}
        {!preview && <Text style={styles.small}>{t('Review and confirm your purchase securely in Google Play.', 'Google Play में खरीद का विवरण देखकर भुगतान की पुष्टि करें।')}</Text>}
        {loading ? <ActivityIndicator color={colors.primary} accessibilityLabel={t('Loading plans', 'प्लान लोड हो रहे हैं')} /> : null}
        {premium.message ? <Text accessibilityLiveRegion="polite" style={styles.body}>{premium.message}</Text> : null}
        <AppPressable accessibilityRole="button" disabled={loading || premium.busy} onPress={() => { void reload(); }} style={styles.textAction}>
          <Text style={styles.link}>{t('Refresh Google Play plans', 'Google Play के प्लान फिर लोड करें')}</Text>
        </AppPressable>

        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.title}>{t('Your everyday tools stay free', 'रोजमर्रा के जरूरी टूल मुफ्त रहेंगे')}</Text>
          <Text style={styles.body}>{t('Government portal access, basic calculators, area conversion, manual measurements, saved-record viewing and text/image sharing remain available without Premium.', 'सरकारी पोर्टल, सामान्य कैलकुलेटर, क्षेत्रफल परिवर्तन, मैनुअल माप, सहेजे गए रिकॉर्ड देखना और टेक्स्ट/चित्र साझा करना बिना प्रीमियम के उपलब्ध रहेंगे।')}</Text>
        </View>
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.title}>{t('Know before you choose', 'प्लान चुनने से पहले जानें')}</Text>
          {[
            [t('What happens when my plan ends?', 'प्लान खत्म होने पर क्या होगा?'), t('Advanced worksheets, GPS capture/editing, PDF export and record organisation will lock, and app ads may return. Your saved records remain viewable and free tools keep working. Buy another prepaid plan whenever you need it.', 'उन्नत गणनाएं, GPS माप, सीमा में बदलाव, PDF और रिकॉर्ड व्यवस्थित करना बंद हो जाएंगे और ऐप विज्ञापन फिर दिख सकते हैं। सहेजे गए रिकॉर्ड देख सकेंगे और मुफ्त टूल चलते रहेंगे। जरूरत होने पर फिर प्रीपेड प्लान खरीदें।')],
            [t('Can I restore after reinstalling?', 'दोबारा ऐप इंस्टॉल करने पर प्रीमियम मिलेगा?'), t('Use the same Lekhpal account and Google Play account, then tap Restore access. An unexpired, verified purchase can be restored without paying again.', 'वही लेखपाल और Google Play खाता इस्तेमाल करें, फिर “प्रीमियम बहाल करें” दबाएं। मान्य और सत्यापित खरीद को अवधि के अंदर बिना दोबारा भुगतान बहाल कर सकते हैं।')],
            [t('Does Premium need internet?', 'क्या प्रीमियम के लिए इंटरनेट चाहिए?'), t('Internet is needed to purchase, restore and periodically verify Premium access.', 'खरीद, प्रीमियम बहाल करने और समय-समय पर उसकी पुष्टि के लिए इंटरनेट जरूरी है।')],
          ].map(([question, answer]) => <View key={question} style={styles.group}><Text style={styles.label}>{question}</Text><Text style={styles.body}>{answer}</Text></View>)}
        </View>
        <AppPressable accessibilityRole="button" disabled={premium.busy} onPress={() => {
          if (!signedIn) navigation.navigate('Login'); else void premium.restore();
        }} style={styles.textAction}><Text style={styles.link}>{t('Already purchased? Restore access', 'पहले खरीद चुके हैं? प्रीमियम बहाल करें')}</Text></AppPressable>
        <AppPressable accessibilityRole="link" onPress={() => { void Linking.openURL('https://play.google.com/store/account/subscriptions?package=com.lekhpal').catch(() => {}); }} style={styles.textAction}>
          <Text style={styles.link}>{t('View purchases in Google Play', 'Google Play में खरीद देखें')}</Text>
        </AppPressable>
      </ScrollView>
    </AppScreen>
  );
};
export default PremiumScreen;
