import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, FONT_WEIGHT, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import OwnerDashboardScreen from '../screens/owner/OwnerDashboardScreen';
import ManageScheduleScreen from '../screens/owner/ManageScheduleScreen';
import AnalyticsScreen from '../screens/owner/AnalyticsScreen';
import OwnerAccountScreen from '../screens/owner/OwnerAccountScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, { label: string; icon: string }> = {
  Dashboard: { label: 'Dashboard', icon: '📊' },
  Schedule: { label: 'Schedule', icon: '📅' },
  Analytics: { label: 'Analytics', icon: '📈' },
  Account: { label: 'Account', icon: '👤' },
};

function OwnerTabBar({ state, navigation }: any) {
  return (
    <View style={styles.tabBarWrapper}>
      <View style={styles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const tabConfig = TAB_ICONS[route.name];

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabItem}
              onPress={() => navigation.navigate(route.name)}
              activeOpacity={0.7}
            >
              {isFocused ? (
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.activeTabPill}
                >
                  <Text style={styles.tabIcon}>{tabConfig.icon}</Text>
                  <Text style={styles.activeTabLabel}>{tabConfig.label}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.inactiveTab}>
                  <Text style={styles.tabIcon}>{tabConfig.icon}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function OwnerTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <OwnerTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard" component={OwnerDashboardScreen} />
      <Tab.Screen name="Schedule" component={ManageScheduleScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Account" component={OwnerAccountScreen} />
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
    paddingHorizontal: SPACING.md,
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