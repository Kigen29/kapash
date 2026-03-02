import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, FONT_WEIGHT, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import HomeScreen from '../screens/user/HomeScreen';
import SearchScreen from '../screens/user/FiltersScreen';
import MyBookingsScreen from '../screens/user/MyBookingsScreen';
import ProfileScreen from '../screens/user/ProfileScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, { active: string; inactive: string; label: string }> = {
  Home: { active: '🏠', inactive: '🏠', label: 'Home' },
  Search: { active: '🔍', inactive: '🔍', label: 'Search' },
  Bookings: { active: '📅', inactive: '📅', label: 'Bookings' },
  Profile: { active: '👤', inactive: '👤', label: 'Profile' },
};

function CustomTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={styles.tabBarWrapper}>
      <View style={styles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const tabConfig = TAB_ICONS[route.name];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabItem}
              onPress={onPress}
              activeOpacity={0.7}
            >
              {isFocused ? (
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.activeTabPill}
                >
                  <Text style={styles.tabIcon}>{tabConfig.active}</Text>
                  <Text style={styles.activeTabLabel}>{tabConfig.label}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.inactiveTab}>
                  <Text style={styles.tabIcon}>{tabConfig.inactive}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function UserTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Bookings" component={MyBookingsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    ...SHADOWS.md,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS['2xl'],
    padding: SPACING.xs,
    height: 60,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  activeTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: SPACING.base,
    height: '100%',
    borderRadius: RADIUS.xl,
    ...SHADOWS.green,
  },
  inactiveTab: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: { fontSize: 20 },
  activeTabLabel: {
    fontSize: FONTS.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
});