import React, { useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { ColorPalette, FONTS, FONT_WEIGHT, RADIUS, SPACING } from '../constants/theme';

interface Coords { latitude: number; longitude: number }

interface Props {
  value: Coords;
  onChange: (coords: Coords, address?: string) => void;
  height?: number;
}

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

export default function LocationPicker({ value, onChange, height = 220 }: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors, height), [colors, height]);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const handleCameraIdle = async (state: any) => {
    const center = state?.properties?.center;
    if (!Array.isArray(center) || center.length < 2) return;
    const [lng, lat] = center;
    if (lat === value.latitude && lng === value.longitude) return;

    const next = { latitude: lat, longitude: lng };
    if (!MAPBOX_TOKEN) {
      onChange(next);
      return;
    }

    setGeocoding(true);
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
      const res = await fetch(url);
      const json = await res.json();
      const place = json?.features?.[0]?.place_name;
      onChange(next, place);
    } catch {
      onChange(next);
    } finally {
      setGeocoding(false);
    }
  };

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Allow location access to use this feature.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      cameraRef.current?.setCamera({
        centerCoordinate: [next.longitude, next.latitude],
        zoomLevel: 15,
        animationDuration: 600,
      });
      onChange(next);
    } catch (err: any) {
      Alert.alert('Location error', err?.message || 'Could not get your location.');
    } finally {
      setLocating(false);
    }
  };

  if (!MAPBOX_TOKEN) {
    return (
      <View style={[s.fallback, { height }]}>
        <Ionicons name="map-outline" size={28} color={colors.textMuted} />
        <Text style={s.fallbackText}>Map unavailable — set EXPO_PUBLIC_MAPBOX_TOKEN in .env</Text>
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <View style={[s.mapWrap, { height }]}>
        <Mapbox.MapView
          style={StyleSheet.absoluteFill}
          styleURL={Mapbox.StyleURL.Street}
          onCameraChanged={handleCameraIdle}
          scaleBarEnabled={false}
          attributionEnabled={false}
          logoEnabled={false}
        >
          <Mapbox.Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: [value.longitude, value.latitude],
              zoomLevel: 14,
            }}
          />
        </Mapbox.MapView>
        <View pointerEvents="none" style={s.pinOverlay}>
          <Ionicons name="location" size={36} color={colors.primary} />
        </View>
        {geocoding && (
          <View style={s.geocodingBadge}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </View>

      <View style={s.actionRow}>
        <TouchableOpacity style={s.useLocBtn} onPress={useMyLocation} disabled={locating} activeOpacity={0.85}>
          {locating
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Ionicons name="locate" size={16} color={colors.primary} />}
          <Text style={s.useLocText}>Use my location</Text>
        </TouchableOpacity>
        <Text style={s.coordsText}>
          {value.latitude.toFixed(4)}, {value.longitude.toFixed(4)}
        </Text>
      </View>
    </View>
  );
}

function makeStyles(colors: ColorPalette, height: number) {
  return StyleSheet.create({
    wrap: { marginBottom: SPACING.md },
    mapWrap: {
      width: '100%',
      borderRadius: RADIUS.md,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    pinOverlay: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      marginLeft: -18,
      marginTop: -36,
    },
    geocodingBadge: {
      position: 'absolute',
      top: SPACING.sm,
      right: SPACING.sm,
      backgroundColor: colors.surface,
      borderRadius: RADIUS.full,
      padding: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: SPACING.sm,
      gap: SPACING.sm,
    },
    useLocBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: SPACING.md,
      paddingVertical: 8,
      borderRadius: RADIUS.full,
      backgroundColor: colors.primaryMuted,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    useLocText: { color: colors.primary, fontSize: FONTS.xs, fontWeight: FONT_WEIGHT.semiBold },
    coordsText: { color: colors.textMuted, fontSize: FONTS.xs, fontVariant: ['tabular-nums'] },
    fallback: {
      width: '100%',
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      marginBottom: SPACING.md,
    },
    fallbackText: {
      color: colors.textMuted,
      fontSize: FONTS.xs,
      textAlign: 'center',
      paddingHorizontal: SPACING.lg,
    },
  });
}
