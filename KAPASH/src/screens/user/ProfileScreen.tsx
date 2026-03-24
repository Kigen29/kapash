/**
 * ProfileScreen - Real user data
 * Place at: src/screens/user/ProfileScreen.tsx
 */

import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useUserStats } from "../../hooks/useData";

const MENU_ITEMS = [
  { icon: "📅", label: "My Bookings", screen: "MyBookings" },
  { icon: "⭐", label: "Reviews", screen: "Reviews" },
  { icon: "🎁", label: "Referrals", screen: "Referral" },
  { icon: "🔔", label: "Notifications", screen: "Notifications" },
  { icon: "❓", label: "Help & Support", screen: "HelpSupport" },
];

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { data: stats, isLoading: statsLoading } = useUserStats();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          setLoggingOut(true);
          await logout();
        },
      },
    ]);
  };

  return (
    <View style={s.container}>
      <SafeAreaView>
        <View style={s.header}>
          <Text style={s.headerTitle}>Profile</Text>
          <TouchableOpacity onPress={() => navigation.navigate("EditProfile")}>
            <Text style={s.editTxt}>Edit</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar & Name */}
        <View style={s.avatarSection}>
          <View style={s.avatarWrap}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={s.avatar} />
            ) : (
              <LinearGradient colors={["#22C55E", "#16A34A"]} style={s.avatar}>
                <Text style={s.avatarTxt}>
                  {(user?.name || "U")[0].toUpperCase()}
                </Text>
              </LinearGradient>
            )}
          </View>
          <Text style={s.userName}>{user?.name}</Text>
          <Text style={s.userPhone}>{user?.phone}</Text>
          {user?.isVerified ? (
            <View style={s.verifiedBadge}>
              <Text style={s.verifiedTxt}>✓ Verified</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={s.unverifiedBadge}
              onPress={() => navigation.navigate("VerifyPhone")}
            >
              <Text style={s.unverifiedTxt}>⚠️ Verify phone</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          {statsLoading ? (
            <ActivityIndicator color="#22C55E" />
          ) : (
            <>
              <StatBox label="Bookings"  value={stats?.totalBookings    ?? 0} />
              <View style={s.statDivider} />
              <StatBox label="Completed" value={stats?.completedBookings ?? 0} />
              <View style={s.statDivider} />
              <StatBox label="Referrals" value={stats?.referralCount ?? 0} />
            </>
          )}
        </View>

        {/* Wallet */}
        {(user?.walletBalance || 0) > 0 && (
          <View style={s.walletCard}>
            <Text style={s.walletLabel}>Wallet Balance</Text>
            <Text style={s.walletAmount}>
              KSh {user?.walletBalance?.toLocaleString()}
            </Text>
          </View>
        )}

        {/* Menu */}
        <View style={s.menuCard}>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.screen}
              style={[
                s.menuItem,
                i < MENU_ITEMS.length - 1 && s.menuItemBorder,
              ]}
              onPress={() => navigation.navigate(item.screen)}
            >
              <Text style={s.menuIcon}>{item.icon}</Text>
              <Text style={s.menuLabel}>{item.label}</Text>
              <Text style={s.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={s.logoutBtn}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator color="#EF4444" />
          ) : (
            <Text style={s.logoutTxt}>Log out</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <View style={s.statBox}>
      <Text style={s.statVal}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1923" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#fff" },
  editTxt: { color: "#22C55E", fontWeight: "600", fontSize: 14 },

  avatarSection: { alignItems: "center", paddingVertical: 24 },
  avatarWrap: { marginBottom: 12 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarTxt: { fontSize: 36, fontWeight: "700", color: "#fff" },
  userName: { fontSize: 20, fontWeight: "700", color: "#fff", marginBottom: 4 },
  userPhone: { fontSize: 14, color: "#9CA3AF", marginBottom: 10 },
  verifiedBadge: {
    backgroundColor: "rgba(34,197,94,0.1)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.3)",
  },
  verifiedTxt: { color: "#22C55E", fontSize: 12, fontWeight: "700" },
  unverifiedBadge: {
    backgroundColor: "rgba(245,158,11,0.1)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
  },
  unverifiedTxt: { color: "#F59E0B", fontSize: 12, fontWeight: "600" },

  statsRow: {
    flexDirection: "row",
    backgroundColor: "#1A2535",
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  statBox: { flex: 1, alignItems: "center" },
  statVal: { fontSize: 22, fontWeight: "800", color: "#22C55E" },
  statLabel: { fontSize: 11, color: "#9CA3AF", marginTop: 4 },
  statDivider: { width: 1, backgroundColor: "#374151", marginVertical: 4 },

  walletCard: {
    backgroundColor: "#1A2535",
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  walletLabel: { color: "#9CA3AF", fontSize: 14 },
  walletAmount: { color: "#22C55E", fontWeight: "700", fontSize: 16 },

  menuCard: {
    backgroundColor: "#1A2535",
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: "hidden",
  },
  menuItem: { flexDirection: "row", alignItems: "center", padding: 16 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: "#374151" },
  menuIcon: { fontSize: 20, marginRight: 14 },
  menuLabel: { flex: 1, color: "#D1D5DB", fontSize: 14, fontWeight: "500" },
  menuArrow: { color: "#6B7280", fontSize: 20 },

  logoutBtn: {
    marginHorizontal: 16,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
  },
  logoutTxt: { color: "#EF4444", fontWeight: "700", fontSize: 15 },
});
