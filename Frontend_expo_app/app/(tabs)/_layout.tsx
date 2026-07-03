import { Tabs } from 'expo-router';
import React from 'react';
import { useColorScheme, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, LayoutGrid, Compass, TrendingUp, Brain } from 'lucide-react-native';
import { Colors, Fonts } from '../../constants/theme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme || 'dark'];
  const insets = useSafeAreaInsets();

  // Tính toán paddingBottom và height dựa trên safe area insets
  const bottomInset = insets.bottom;
  const tabBarPaddingBottom = Platform.OS === 'ios' ? bottomInset : Math.max(bottomInset, 8);
  const tabBarHeight = Platform.OS === 'ios' ? 50 + bottomInset : 56 + bottomInset;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          elevation: 10,
          shadowColor: '#000000',
          shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.08,
          shadowOffset: { width: 0, height: -4 },
          shadowRadius: 10,
          height: tabBarHeight,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          fontFamily: Fonts.sans,
        },
        tabBarIconStyle: {
          marginBottom: Platform.OS === 'ios' ? 0 : 2,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="workspaces"
        options={{
          title: 'Workspaces',
          tabBarIcon: ({ color, size }) => <LayoutGrid size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => <Compass size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="trends"
        options={{
          title: 'Trends',
          tabBarIcon: ({ color, size }) => <TrendingUp size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, size }) => <Brain size={size || 22} color={color} />,
        }}
      />
    </Tabs>
  );
}
