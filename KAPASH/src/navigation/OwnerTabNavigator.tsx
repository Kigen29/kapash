import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import OwnerDashboardScreen from '../screens/owner/OwnerDashboardScreen';
import ManageScheduleScreen from '../screens/owner/ManageScheduleScreen';
import AnalyticsScreen from '../screens/owner/AnalyticsScreen';
import OwnerAccountScreen from '../screens/owner/OwnerAccountScreen';

const Tab = createBottomTabNavigator();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
const TAB_ICONS: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  Dashboard: { active: 'grid',        inactive: 'grid-outline' },
  Schedule:  { active: 'calendar',    inactive: 'calendar-outline' },
  Analytics: { active: 'stats-chart', inactive: 'stats-chart-outline' },
  Account:   { active: 'person',      inactive: 'person-outline' },
};

export default function OwnerTabNavigator() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const cfg = TAB_ICONS[route.name];
          if (!cfg) return null;
          return <Ionicons name={focused ? cfg.active : cfg.inactive} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={OwnerDashboardScreen} />
      <Tab.Screen name="Schedule"  component={ManageScheduleScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Account"   component={OwnerAccountScreen} />
    </Tab.Navigator>
  );
}
