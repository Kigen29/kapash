import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { ColorPalette, FONTS, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const CATEGORIES: { id: string; icon: IoniconName; label: string }[] = [
  { id: 'bookings', icon: 'calendar-outline',     label: 'Bookings' },
  { id: 'mpesa',    icon: 'card-outline',         label: 'M-Pesa' },
  { id: 'account',  icon: 'person-outline',       label: 'Account' },
  { id: 'refunds',  icon: 'cash-outline',         label: 'Refunds' },
];

const FAQS: { id: string; question: string; answer: string }[] = [
  { id: 'f1', question: 'How do I cancel a booking?', answer: 'Go to My Bookings, open the booking, and tap Cancel. Refunds depend on how close to the slot you cancel.' },
  { id: 'f2', question: 'When will my M-Pesa refund arrive?', answer: 'Eligible refunds are processed within 24 hours back to the M-Pesa number used to pay.' },
  { id: 'f3', question: 'How do I change my booking time?', answer: 'Cancel the existing booking and create a new one at your preferred time — this avoids double-booking issues.' },
  { id: 'f4', question: 'Can I transfer my booking to someone else?', answer: 'Yes — share the booking ticket QR with them; the QR is what the pitch staff scans for entry.' },
];

interface Props { navigation: any; }

export default function HelpSupportScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [searchText, setSearchText] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const filteredFaqs = searchText
    ? FAQS.filter(f => (f.question + ' ' + f.answer).toLowerCase().includes(searchText.toLowerCase()))
    : FAQS;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View>
          <Text style={styles.heroTitle}>How can we help?</Text>
          <Text style={styles.heroSubtitle}>Find answers about bookings, M-Pesa, and more.</Text>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search e.g. 'refund', 'cancel'..."
              placeholderTextColor={colors.textMuted}
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')} hitSlop={6}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.categoriesGrid}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat.id} style={styles.categoryCard} activeOpacity={0.85}>
              <View style={styles.categoryIconBg}>
                <Ionicons name={cat.icon} size={20} color={colors.primary} />
              </View>
              <Text style={styles.categoryLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ gap: SPACING.md }}>
          <Text style={styles.sectionTitle}>Frequently Asked</Text>
          <View style={styles.faqGroup}>
            {filteredFaqs.map((faq, i) => {
              const expanded = expandedFaq === faq.id;
              return (
                <View key={faq.id} style={[styles.faqWrap, i < filteredFaqs.length - 1 && styles.faqWrapBorder]}>
                  <TouchableOpacity
                    style={styles.faqItem}
                    onPress={() => setExpandedFaq(expanded ? null : faq.id)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.faqQuestion}>{faq.question}</Text>
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                  {expanded && <Text style={styles.faqAnswer}>{faq.answer}</Text>}
                </View>
              );
            })}
            {filteredFaqs.length === 0 && (
              <Text style={{ color: colors.textMuted, fontSize: FONTS.sm, textAlign: 'center', padding: SPACING.lg }}>
                No FAQs matched your search.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.contactBox}>
          <View style={styles.contactIconBg}>
            <Ionicons name="chatbubbles-outline" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.contactBoxTitle}>Still Need Help?</Text>
            <Text style={styles.contactBoxSubtitle}>
              Our support team is available Mon–Sat, 8am to 8pm.
            </Text>
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <TouchableOpacity
          style={styles.callBtn}
          onPress={() => Linking.openURL('tel:+254700000000').catch(() => {})}
          activeOpacity={0.85}
        >
          <Ionicons name="call-outline" size={18} color={colors.textPrimary} />
          <Text style={styles.callBtnText}>Call Us</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() => Linking.openURL('mailto:support@kapash.app').catch(() => {})}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.chatBtnGradient}
          >
            <Ionicons name="mail-outline" size={18} color="#fff" />
            <Text style={styles.chatBtnText}>Email Support</Text>
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerSafe: { backgroundColor: colors.background },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.base,
      paddingVertical: SPACING.md,
    },
    iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: FONTS.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },

    content: { paddingHorizontal: SPACING.base, paddingBottom: 120, gap: SPACING.lg },

    heroTitle: {
      fontSize: FONTS['2xl'],
      fontWeight: FONT_WEIGHT.bold,
      color: colors.textPrimary,
      letterSpacing: -0.3,
      marginBottom: 6,
    },
    heroSubtitle: { fontSize: FONTS.sm, color: colors.textMuted, marginBottom: SPACING.base },

    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: RADIUS.md,
      paddingHorizontal: SPACING.md,
      height: 52,
      gap: SPACING.sm,
      borderWidth: 1, borderColor: colors.border,
    },
    searchInput: { flex: 1, fontSize: FONTS.base, color: colors.textPrimary },

    categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
    categoryCard: {
      flexBasis: '48%',
      backgroundColor: colors.surface,
      borderRadius: RADIUS.lg,
      padding: SPACING.base,
      gap: SPACING.md,
      borderWidth: 1, borderColor: colors.border,
    },
    categoryIconBg: {
      width: 40, height: 40, borderRadius: RADIUS.sm,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center', justifyContent: 'center',
    },
    categoryLabel: { fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold, color: colors.textPrimary },

    sectionTitle: {
      fontSize: FONTS.lg,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.textPrimary,
    },
    faqGroup: {
      backgroundColor: colors.surface,
      borderRadius: RADIUS.lg,
      overflow: 'hidden',
      borderWidth: 1, borderColor: colors.border,
    },
    faqWrap: { paddingHorizontal: SPACING.base },
    faqWrapBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    faqItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: SPACING.base,
    },
    faqQuestion: {
      fontSize: FONTS.sm,
      fontWeight: FONT_WEIGHT.semiBold,
      color: colors.textPrimary,
      flex: 1,
      marginRight: SPACING.sm,
    },
    faqAnswer: {
      fontSize: FONTS.sm,
      color: colors.textSecondary,
      lineHeight: 20,
      paddingBottom: SPACING.base,
    },

    contactBox: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: RADIUS.lg,
      padding: SPACING.lg,
      gap: SPACING.md,
      alignItems: 'flex-start',
      borderWidth: 1, borderColor: colors.border,
    },
    contactIconBg: {
      width: 40, height: 40, borderRadius: RADIUS.sm,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center', justifyContent: 'center',
    },
    contactBoxTitle: { fontSize: FONTS.base, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, marginBottom: 4 },
    contactBoxSubtitle: { fontSize: FONTS.sm, color: colors.textMuted, lineHeight: 20 },

    footer: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      flexDirection: 'row',
      gap: SPACING.md,
      paddingHorizontal: SPACING.base,
      paddingTop: SPACING.md,
      backgroundColor: colors.surface,
      borderTopWidth: 1, borderTopColor: colors.border,
    },
    callBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      height: 50,
      paddingHorizontal: SPACING.lg,
      borderRadius: RADIUS.md,
      borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.background,
    },
    callBtnText: { fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold, color: colors.textPrimary },
    chatBtn: { flex: 1, borderRadius: RADIUS.md, overflow: 'hidden' },
    chatBtnGradient: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
    chatBtnText: { fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
  });
}
