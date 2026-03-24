/**
 * PitchDetailsScreen - Connected to real backend
 * Place at: src/screens/user/PitchDetailsScreen.tsx
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Image,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePitch, usePitchSlots } from "../../hooks/useData";

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

function getDates(count = 7): { label: string; day: string; value: string }[] {
  const result = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    result.push({
      label:
        i === 0 ? "Today" : d.toLocaleDateString("en-KE", { weekday: "short" }),
      day: d.getDate().toString(),
      value: formatDate(d),
    });
  }
  return result;
}

const DATES = getDates(7);

export default function PitchDetailsScreen({ route, navigation }: any) {
  const { pitchId } = route.params;
  const [selectedDate, setSelectedDate] = useState(DATES[0].value);
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const [imgIndex, setImgIndex] = useState(0);

  const { data: pitch, isLoading, error, refetch } = usePitch(pitchId);
  const {
    data: slots,
    isLoading: slotsLoading,
    refetch: refetchSlots,
  } = usePitchSlots(pitchId, selectedDate);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedSlotKey(null);
  };

  const handleBook = useCallback(() => {
    if (!selectedSlotKey) {
      Alert.alert(
        "Select a slot",
        "Please choose an available time slot first.",
      );
      return;
    }
    const slot = (slots as any[])?.find(
      (s: any) => s.startTime === selectedSlotKey,
    );
    if (!slot) return;

    navigation.navigate("Checkout", {
      pitchId,
      pitchName: pitch?.name,
      pitchAddress: pitch?.address,
      date: selectedDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
      price: slot.price || pitch?.pricePerHour,
      pitchImage: (pitch as any)?.images?.[0]?.url,
    });
  }, [selectedSlotKey, slots, pitch, selectedDate]);

  if (isLoading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator color="#22C55E" size="large" />
      </View>
    );
  }

  if (error || !pitch) {
    return (
      <View style={s.loadingWrap}>
        <Text style={{ color: "#9CA3AF", fontSize: 16 }}>
          {error || "Pitch not found"}
        </Text>
        <TouchableOpacity style={s.retryBtn} onPress={refetch}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const images = pitch.images?.length
    ? pitch.images.map((i: any) => i.url)
    : ["https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=800"];
  const amenities: any[] = pitch.amenities || [];
  const slotList: any[] = slots || [];

  return (
    <View style={s.container}>
      {/* Image Carousel */}
      <View style={s.imgWrap}>
        <FlatList
          horizontal
          pagingEnabled
          data={images}
          keyExtractor={(_, i) => String(i)}
          showsHorizontalScrollIndicator={false}
          onScroll={(e) =>
            setImgIndex(
              Math.round(
                e.nativeEvent.contentOffset.x /
                  e.nativeEvent.layoutMeasurement.width,
              ),
            )
          }
          renderItem={({ item }) => (
            <Image source={{ uri: item }} style={s.heroImg} />
          )}
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.5)", "transparent"]}
          style={s.imgTopGrad}
        />
        <LinearGradient
          colors={["transparent", "rgba(15,25,35,0.95)"]}
          style={s.imgBotGrad}
        />

        {/* Back */}
        <SafeAreaView style={s.backWrap}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={s.backTxt}>←</Text>
          </TouchableOpacity>
        </SafeAreaView>

        {/* Dots */}
        <View style={s.dots}>
          {images.map((_: any, i: number) => (
            <View key={i} style={[s.dot, imgIndex === i && s.dotActive]} />
          ))}
        </View>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Title & Price */}
        <View style={s.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.pitchName}>{pitch.name}</Text>
            <Text style={s.pitchLoc}>📍 {pitch.location}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.price}>
              KSh {pitch.pricePerHour?.toLocaleString()}
            </Text>
            <Text style={s.perHr}>/hour</Text>
          </View>
        </View>

        {/* Badges */}
        <View style={s.badgeRow}>
          {pitch.rating && (
            <View style={s.badge}>
              <Text style={s.badgeTxt}>
                ⭐ {pitch.rating.toFixed(1)} ({pitch._count?.reviews || 0})
              </Text>
            </View>
          )}
          <View style={s.badge}>
            <Text style={s.badgeTxt}>👥 {pitch.capacity || 22} players</Text>
          </View>
          {pitch.instantBook && (
            <View style={[s.badge, s.greenBadge]}>
              <Text style={[s.badgeTxt, { color: "#22C55E" }]}>
                ⚡ Instant Book
              </Text>
            </View>
          )}
        </View>

        {/* Description */}
        {pitch.description && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>About</Text>
            <Text style={s.desc}>{pitch.description}</Text>
          </View>
        )}

        {/* Amenities */}
        {amenities.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Amenities</Text>
            <View style={s.amenitiesWrap}>
              {amenities.map((a: any) => (
                <View key={a.id} style={s.amenityChip}>
                  <Text style={s.amenityTxt}>
                    {a.icon || "✓"} {a.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Date Picker */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Select Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {DATES.map((d) => (
              <TouchableOpacity
                key={d.value}
                style={[s.dateBtn, selectedDate === d.value && s.dateBtnActive]}
                onPress={() => handleDateChange(d.value)}
              >
                <Text
                  style={[
                    s.dateLbl,
                    selectedDate === d.value && s.dateLblActive,
                  ]}
                >
                  {d.label}
                </Text>
                <Text
                  style={[
                    s.dateDay,
                    selectedDate === d.value && s.dateDayActive,
                  ]}
                >
                  {d.day}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Time Slots */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Available Slots</Text>
          {slotsLoading ? (
            <ActivityIndicator color="#22C55E" style={{ marginTop: 20 }} />
          ) : slotList.length === 0 ? (
            <Text style={s.noSlots}>No slots available for this date</Text>
          ) : (
            <View style={s.slotsGrid}>
              {slotList.map((slot: any) => {
                const booked =
                  slot.status === "UNAVAILABLE" ||
                  slot.status === "BOOKED" ||
                  slot.status === "BLOCKED";
                const selected = selectedSlotKey === slot.startTime; // ✅ FIXED: use startTime not id
                return (
                  <TouchableOpacity
                    key={slot.startTime} // ✅ FIXED: key on startTime
                    style={[
                      s.slot,
                      booked && s.slotBooked,
                      selected && s.slotSelected,
                    ]}
                    onPress={() =>
                      !booked && setSelectedSlotKey(slot.startTime)
                    } // ✅ FIXED
                    disabled={booked}
                  >
                    <Text
                      style={[
                        s.slotTime,
                        booked && s.slotTimeBooked,
                        selected && s.slotTimeSelected,
                      ]}
                    >
                      {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                    </Text>
                    {slot.price && (
                      <Text
                        style={[s.slotPrice, selected && { color: "#fff" }]}
                      >
                        KSh {slot.price?.toLocaleString()}
                      </Text>
                    )}
                    {booked && <Text style={s.slotBookedTxt}>Booked</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Sticky Footer */}
      <View style={s.footer}>
        <View>
          <Text style={s.footerLabel}>Price per hour</Text>
          <Text style={s.footerPrice}>
            KSh {pitch.pricePerHour?.toLocaleString()}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleBook}
          style={s.bookBtnWrap}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#22C55E", "#16A34A"]}
            style={s.bookBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={s.bookBtnTxt}>Book Now</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function formatTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  return `${hour > 12 ? hour - 12 : hour}:${m || "00"} ${hour >= 12 ? "PM" : "AM"}`;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1923" },
  loadingWrap: {
    flex: 1,
    backgroundColor: "#0F1923",
    justifyContent: "center",
    alignItems: "center",
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: "#22C55E",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: "#fff", fontWeight: "600" },

  imgWrap: { height: 280, position: "relative" },
  heroImg: { width: 380, height: 280 }, // approximated
  imgTopGrad: { position: "absolute", top: 0, left: 0, right: 0, height: 100 },
  imgBotGrad: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  backWrap: { position: "absolute", top: 0, left: 0 },
  backBtn: {
    margin: 16,
    width: 36,
    height: 36,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  backTxt: { color: "#fff", fontSize: 18 },
  dots: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    flexDirection: "row",
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  dotActive: { backgroundColor: "#22C55E", width: 16 },

  scroll: { flex: 1 },
  titleRow: { flexDirection: "row", padding: 16, paddingBottom: 8 },
  pitchName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  pitchLoc: { fontSize: 13, color: "#9CA3AF" },
  price: { fontSize: 22, fontWeight: "800", color: "#22C55E" },
  perHr: { fontSize: 12, color: "#6B7280" },

  badgeRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  badge: {
    backgroundColor: "#1A2535",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  greenBadge: { backgroundColor: "rgba(34,197,94,0.1)" },
  badgeTxt: { color: "#D1D5DB", fontSize: 12, fontWeight: "600" },

  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 12,
  },
  desc: { color: "#9CA3AF", fontSize: 14, lineHeight: 22 },
  amenitiesWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  amenityChip: {
    backgroundColor: "#1A2535",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  amenityTxt: { color: "#D1D5DB", fontSize: 12, fontWeight: "600" },

  dateBtn: {
    width: 60,
    height: 70,
    backgroundColor: "#1A2535",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#374151",
  },
  dateBtnActive: {
    borderColor: "#22C55E",
    backgroundColor: "rgba(34,197,94,0.1)",
  },
  dateLbl: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 4,
  },
  dateLblActive: { color: "#22C55E" },
  dateDay: { fontSize: 20, fontWeight: "700", color: "#D1D5DB" },
  dateDayActive: { color: "#22C55E" },

  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slot: {
    width: "47%",
    backgroundColor: "#1A2535",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#374151",
  },
  slotBooked: { opacity: 0.4 },
  slotSelected: { borderColor: "#22C55E", backgroundColor: "#22C55E" },
  slotTime: { color: "#D1D5DB", fontSize: 12, fontWeight: "600" },
  slotTimeBooked: { color: "#6B7280" },
  slotTimeSelected: { color: "#fff" },
  slotPrice: { color: "#22C55E", fontSize: 11, marginTop: 2 },
  slotBookedTxt: { color: "#6B7280", fontSize: 10, marginTop: 2 },
  noSlots: {
    color: "#6B7280",
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 24,
  },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1A2535",
    borderTopWidth: 1,
    borderTopColor: "#374151",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 28,
  },
  footerLabel: { color: "#6B7280", fontSize: 12 },
  footerPrice: { color: "#fff", fontSize: 18, fontWeight: "700" },
  bookBtnWrap: { flex: 0 },
  bookBtn: {
    paddingHorizontal: 32,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  bookBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
