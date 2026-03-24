/**
 * OwnerDashboardScreen - Real backend data
 * Place at: src/screens/owner/OwnerDashboardScreen.tsx
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOwnerDashboard } from "../../hooks/useData";
import { useAuth } from "../../context/AuthContext";
import { DashboardData } from "../../types/index";

export default function OwnerDashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const { data: dash, isLoading, refetch: refetchDash } = useOwnerDashboard();

  // ✅ FIXED: declare d first, then derive bookings from it
  const d = (dash || {}) as DashboardData;
  const bookings: any[] = d.todayBookingsList || [];

  // ✅ FIXED: onRefresh was missing entirely
  const onRefresh = async () => {
    setRefreshing(true);
    await refetchDash();
    setRefreshing(false);
  };

  return (
    <View style={s.container}>
      <SafeAreaView>
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Owner Dashboard</Text>
            <Text style={s.subGreet}>{user?.name}</Text>
          </View>
          <TouchableOpacity
            style={s.notifBtn}
            onPress={() => navigation.navigate("Notifications")}
          >
            <Text style={s.notifIcon}>🔔</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#22C55E"
          />
        }
      >
        {isLoading ? (
          <ActivityIndicator color="#22C55E" style={{ marginTop: 60 }} />
        ) : (
          <>
            {/* Revenue Hero */}
            <LinearGradient
              colors={["#16A34A", "#22C55E"]}
              style={s.heroCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={s.heroLabel}>This Month's Revenue</Text>
              <Text style={s.heroAmount}>
                KSh {(d.monthlyRevenue || 0).toLocaleString()}
              </Text>
              <View style={s.heroRow}>
                <MiniStat
                  label="Today"
                  value={`KSh ${(d.todayRevenue || 0).toLocaleString()}`}
                />
                <MiniStat label="Bookings" value={d.monthlyBookings || 0} />
                <MiniStat
                  label="Occupancy"
                  value={`${d.occupancyRate || 0}%`}
                />
              </View>
            </LinearGradient>

            {/* Quick Stats */}
            <View style={s.statsGrid}>
              <StatCard
                icon="📅"
                label="Today's Bookings"
                value={d.todayBookings || 0}
                color="#22C55E"
              />
              <StatCard
                icon="⏳"
                label="Pending"
                value={d.pendingBookings || 0}
                color="#F59E0B"
              />
              <StatCard
                icon="⭐"
                label="Avg Rating"
                value={`${Number(d.avgRating || 0).toFixed(1)}★`}
                color="#F59E0B"
              />
              <StatCard
                icon="💰"
                label="Pending Payout"
                value={`KSh ${(d.pendingPayout || 0).toLocaleString()}`}
                color="#22C55E"
              />
            </View>

            {/* Quick Actions */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Quick Actions</Text>
              <View style={s.actionsRow}>
                <ActionBtn
                  icon="📆"
                  label="Schedule"
                  onPress={() => navigation.navigate("Schedule")}
                />
                <ActionBtn
                  icon="📊"
                  label="Analytics"
                  onPress={() => navigation.navigate("Analytics")}
                />
                <ActionBtn
                  icon="🏟️"
                  label="My Pitches"
                  onPress={() => navigation.navigate("Account")}
                />
                <ActionBtn
                  icon="💸"
                  label="Payouts"
                  onPress={() => navigation.navigate("Account")}
                />
              </View>
            </View>

            {/* Today's Bookings */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Today's Bookings</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("Schedule")}
                >
                  <Text style={s.seeAll}>View all</Text>
                </TouchableOpacity>
              </View>
              {bookings.length === 0 ? (
                <View style={s.emptyBox}>
                  <Text style={s.emptyTxt}>No bookings today</Text>
                </View>
              ) : (
                bookings
                  .slice(0, 5)
                  .map((b: any) => <TodayBookingRow key={b.id} booking={b} />)
              )}
            </View>
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function MiniStat({ label, value }: { label: string; value: any }) {
  return (
    <View style={s.miniStat}>
      <Text style={s.miniStatVal}>{value}</Text>
      <Text style={s.miniStatLabel}>{label}</Text>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: any;
  color: string;
}) {
  return (
    <View style={s.statCard}>
      <Text style={s.statIcon}>{icon}</Text>
      <Text style={[s.statVal, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function ActionBtn({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.actionBtn} onPress={onPress} activeOpacity={0.8}>
      <View style={s.actionIconWrap}>
        <Text style={s.actionIcon}>{icon}</Text>
      </View>
      <Text style={s.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function TodayBookingRow({ booking }: { booking: any }) {
  const statusColors: Record<string, string> = {
    CONFIRMED: "#22C55E",
    PENDING: "#F59E0B",
    PENDING_PAYMENT: "#F59E0B",
    CANCELLED: "#EF4444",
    COMPLETED: "#6B7280",
  };
  const color = statusColors[booking.status] || "#6B7280";

  // ✅ FIXED: backend returns startTime/endTime directly on booking,
  // not nested inside a timeSlot object
  const startTime = booking.startTime ?? booking.timeSlot?.startTime ?? "—";
  const endTime = booking.endTime ?? booking.timeSlot?.endTime ?? "—";
  const amount = booking.totalAmount ?? booking.ownerAmount ?? 0;

  return (
    <View style={s.bookingRow}>
      <View style={[s.bookingDot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={s.bookingUser}>{booking.user?.name || "Customer"}</Text>
        <Text style={s.bookingSlot}>
          {startTime} – {endTime}
        </Text>
      </View>
      <Text style={[s.bookingStatus, { color }]}>{booking.status}</Text>
      <Text style={s.bookingAmt}>KSh {amount.toLocaleString()}</Text>
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1923" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 8,
  },
  greeting: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  subGreet: { fontSize: 20, fontWeight: "700", color: "#fff" },
  notifBtn: {
    width: 40,
    height: 40,
    backgroundColor: "#1A2535",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  notifIcon: { fontSize: 18 },

  heroCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  heroLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 8,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 16,
  },
  heroRow: { flexDirection: "row", justifyContent: "space-between" },
  miniStat: { alignItems: "center" },
  miniStatVal: { fontSize: 15, fontWeight: "700", color: "#fff" },
  miniStatLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  statCard: {
    width: "47%",
    backgroundColor: "#1A2535",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  statIcon: { fontSize: 24, marginBottom: 8 },
  statVal: { fontSize: 18, fontWeight: "700", marginBottom: 2 },
  statLabel: { color: "#9CA3AF", fontSize: 11, textAlign: "center" },

  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 12,
  },
  seeAll: { color: "#22C55E", fontSize: 13, fontWeight: "600" },

  actionsRow: { flexDirection: "row", justifyContent: "space-between" },
  actionBtn: { alignItems: "center", flex: 1 },
  actionIconWrap: {
    width: 52,
    height: 52,
    backgroundColor: "#1A2535",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  actionIcon: { fontSize: 24 },
  actionLabel: { color: "#9CA3AF", fontSize: 11, fontWeight: "600" },

  bookingRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A2535",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  bookingDot: { width: 8, height: 8, borderRadius: 4 },
  bookingUser: { color: "#D1D5DB", fontSize: 13, fontWeight: "600" },
  bookingSlot: { color: "#9CA3AF", fontSize: 11, marginTop: 2 },
  bookingStatus: { fontSize: 11, fontWeight: "700", marginRight: 8 },
  bookingAmt: { color: "#22C55E", fontWeight: "700", fontSize: 13 },

  emptyBox: {
    backgroundColor: "#1A2535",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
  },
  emptyTxt: { color: "#6B7280", fontSize: 14 },
});
