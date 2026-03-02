// Help & Support Screen
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, FONT_WEIGHT, SPACING, RADIUS, SHADOWS } from '../../constants/theme';

const CATEGORIES = [
  { id: 'bookings', icon: '📅', label: 'Bookings' },
  { id: 'mpesa', icon: '💳', label: 'M-Pesa' },
  { id: 'account', icon: '👤', label: 'Account' },
  { id: 'refunds', icon: '💰', label: 'Refunds' },
];

const FAQS = [
  { id: 'f1', question: 'How do I cancel a booking?' },
  { id: 'f2', question: 'When will my M-Pesa refund arrive?' },
  { id: 'f3', question: 'How do I change my booking time?' },
  { id: 'f4', question: 'Can I transfer my booking to someone else?' },
];

interface Props {
  navigation: any;
}

export default function HelpSupportScreen({ navigation }: Props) {
  const [searchText, setSearchText] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>How can we help?</Text>
          <Text style={styles.heroSubtitle}>
            Find answers about bookings, M-Pesa, and more.
          </Text>
          {/* Search */}
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search e.g. 'refund', 'location'..."
              placeholderTextColor={COLORS.textMuted}
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
        </View>

        {/* Categories */}
        <View style={styles.categoriesGrid}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat.id} style={styles.categoryCard}>
              <View style={styles.categoryIconBg}>
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
              </View>
              <Text style={styles.categoryLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQs */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>Frequently Asked</Text>
          <View style={styles.faqGroup}>
            {FAQS.map(faq => (
              <TouchableOpacity
                key={faq.id}
                style={styles.faqItem}
                onPress={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
              >
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Text style={styles.faqChevron}>
                  {expandedFaq === faq.id ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Still Need Help */}
        <View style={styles.contactBox}>
          <Text style={styles.contactBoxIcon}>💬</Text>
          <View style={styles.contactBoxContent}>
            <Text style={styles.contactBoxTitle}>Still Need Help?</Text>
            <Text style={styles.contactBoxSubtitle}>
              Our support team is available Mon–Sat, 8am to 8pm.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Contact Actions */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.callBtn}>
          <Text style={styles.callBtnIcon}>📞</Text>
          <Text style={styles.callBtnText}>Call Us</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chatBtn}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.chatBtnGradient}
          >
            <Text style={styles.chatBtnIcon}>💬</Text>
            <Text style={styles.chatBtnText}>Live Chat</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingTop: 56,
    paddingBottom: SPACING.base,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: FONTS.xl, color: COLORS.textPrimary, fontWeight: FONT_WEIGHT.semiBold },
  headerTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  headerRight: { width: 40 },
  content: { paddingHorizontal: SPACING.base, paddingBottom: SPACING['2xl'], gap: SPACING.xl },
  heroSection: {},
  heroTitle: {
    fontSize: FONTS['3xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroSubtitle: { fontSize: FONTS.base, color: COLORS.textSecondary, marginBottom: SPACING.base },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.base,
    height: 56,
    gap: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    ...SHADOWS.xs,
  },
  searchIcon: { fontSize: 18 },
  searchInput: { flex: 1, fontSize: FONTS.base, color: COLORS.textPrimary },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  categoryCard: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    gap: SPACING.md,
    ...SHADOWS.xs,
  },
  categoryIconBg: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIcon: { fontSize: 22 },
  categoryLabel: { fontSize: FONTS.base, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary },
  faqSection: { gap: SPACING.md },
  sectionTitle: { fontSize: FONTS.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, letterSpacing: -0.3 },
  faqGroup: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, overflow: 'hidden', ...SHADOWS.xs },
  faqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  faqQuestion: { fontSize: FONTS.base, fontWeight: FONT_WEIGHT.medium, color: COLORS.textPrimary, flex: 1, marginRight: SPACING.sm },
  faqChevron: { fontSize: 12, color: COLORS.textMuted },
  contactBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.md,
    alignItems: 'flex-start',
    ...SHADOWS.xs,
  },
  contactBoxIcon: { fontSize: 24, marginTop: 2 },
  contactBoxContent: { flex: 1 },
  contactBoxTitle: { fontSize: FONTS.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: 5 },
  contactBoxSubtitle: { fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 18 },
  footer: {
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.base,
    paddingBottom: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: 50,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  callBtnIcon: { fontSize: 18 },
  callBtnText: { fontSize: FONTS.base, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary },
  chatBtn: { flex: 1, borderRadius: RADIUS.full, overflow: 'hidden', ...SHADOWS.green },
  chatBtnGradient: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  chatBtnIcon: { fontSize: 18 },
  chatBtnText: { fontSize: FONTS.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.white },
});