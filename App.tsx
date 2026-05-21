import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator, Animated, LayoutChangeEvent } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ClerkProvider, ClerkLoaded, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { Ionicons } from '@expo/vector-icons';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import ScheduleScreen from './src/screens/ScheduleScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import StatsScreen from './src/screens/StatsScreen';
import FitnessScreen from './src/screens/FitnessScreen';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { spacing, typography } from './src/styles/theme';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error('Falta EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY en el archivo .env');
}

type Tab = 'home' | 'schedule' | 'stats' | 'fitness' | 'community';
type TabIcon = keyof typeof Ionicons.glyphMap;

const TABS: Array<{ key: Tab; icon: TabIcon; activeIcon: TabIcon; label: string }> = [
  { key: 'home',      icon: 'home-outline',          activeIcon: 'home',          label: 'Inicio' },
  { key: 'schedule',  icon: 'calendar-outline',      activeIcon: 'calendar',      label: 'Horario' },
  { key: 'stats',     icon: 'stats-chart-outline',   activeIcon: 'stats-chart',   label: 'Stats' },
  { key: 'fitness',   icon: 'fitness-outline',       activeIcon: 'fitness',       label: 'Fitness' },
  { key: 'community', icon: 'people-circle-outline', activeIcon: 'people-circle', label: 'Comunidad' },
];

function TabBar({ active, onPress }: { active: Tab; onPress: (t: Tab) => void }) {
  const { theme } = useTheme();
  const [barWidth, setBarWidth] = useState(0);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const activeIndex = TABS.findIndex(tab => tab.key === active);
  const itemWidth = barWidth > 0 ? (barWidth - spacing.sm * 2) / TABS.length : 0;

  useEffect(() => {
    if (!itemWidth || activeIndex < 0) return;
    Animated.spring(indicatorX, {
      toValue: activeIndex * itemWidth,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
      mass: 0.8,
    }).start();
  }, [activeIndex, indicatorX, itemWidth]);

  const handleLayout = (event: LayoutChangeEvent) => {
    setBarWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={[styles.tabBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]} onLayout={handleLayout}>
      {itemWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tabIndicator,
            {
              width: itemWidth,
              backgroundColor: theme.primaryMuted,
              borderColor: theme.primary + '45',
              shadowColor: theme.shadowColor,
              transform: [{ translateX: indicatorX }],
            },
          ]}
        />
      )}
      {TABS.map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={styles.tabItem}
          onPress={() => onPress(tab.key)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={active === tab.key ? tab.activeIcon : tab.icon}
            size={active === tab.key ? 23 : 21}
            color={active === tab.key ? theme.primary : theme.textTertiary}
          />
          <Text style={[
            styles.tabLabel,
            { color: active === tab.key ? theme.primary : theme.textTertiary },
            active === tab.key && styles.tabLabelActive,
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function PlaceholderScreen({ title }: { title: string }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.placeholder, { backgroundColor: theme.bg }]}>
      <Text style={[styles.placeholderTitle, { color: theme.textPrimary }]}>{title}</Text>
      <Text style={[styles.placeholderSub, { color: theme.textTertiary }]}>Próximamente</Text>
    </View>
  );
}

function AppInner() {
  const { theme } = useTheme();
  const { isSignedIn, isLoaded } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const authEntry = useRef(new Animated.Value(0)).current;
  const screenEntry = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isLoaded || isSignedIn) return;
    authEntry.setValue(0);
    Animated.timing(authEntry, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [authEntry, isLoaded, isSignedIn, showRegister]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || showProfile) return;
    screenEntry.setValue(0);
    Animated.timing(screenEntry, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [activeTab, isLoaded, isSignedIn, screenEntry, showProfile]);

  if (!isLoaded) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (!isSignedIn) {
    if (showRegister) {
      return (
        <>
          <StatusBar style="dark" />
          <Animated.View style={[
            styles.animatedScreen,
            {
              opacity: authEntry,
              transform: [{ translateY: authEntry.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
            },
          ]}>
            <RegisterScreen onBack={() => setShowRegister(false)} />
          </Animated.View>
        </>
      );
    }
    return (
      <>
        <StatusBar style="dark" />
        <Animated.View style={[
          styles.animatedScreen,
          {
            opacity: authEntry,
            transform: [{ translateY: authEntry.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
          },
        ]}>
          <LoginScreen onRegister={() => setShowRegister(true)} />
        </Animated.View>
      </>
    );
  }

  if (showProfile) {
    return (
      <>
        <StatusBar style="dark" />
        <ProfileScreen
          onBack={() => setShowProfile(false)}
          onLogout={() => setShowProfile(false)}
        />
      </>
    );
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':      return <HomeScreen onAvatarPress={() => setShowProfile(true)} />;
      case 'schedule':  return <ScheduleScreen />;
      case 'stats':     return <StatsScreen />;
      case 'fitness':   return <FitnessScreen />;
      case 'community': return <PlaceholderScreen title="Comunidad" />;
    }
  };

  return (
    <>
      <StatusBar style="dark" />
      <View style={[styles.root, { backgroundColor: theme.bg }]}>
        <Animated.View
          key={activeTab}
          style={[
            styles.content,
            {
              opacity: screenEntry,
              transform: [{ translateY: screenEntry.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
            },
          ]}
        >
          {renderScreen()}
        </Animated.View>
        <TabBar active={activeTab} onPress={setActiveTab} />
      </View>
    </>
  );
}

export default function App() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <SafeAreaProvider>
          <ThemeProvider>
            <AppInner />
          </ThemeProvider>
        </SafeAreaProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  animatedScreen: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    minHeight: 82,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: spacing.sm,
    bottom: spacing.lg,
    left: spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  tabItem: {
    flex: 1,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    zIndex: 1,
  },
  tabLabel: { fontSize: typography.xs, fontWeight: typography.medium },
  tabLabelActive: { fontWeight: typography.semibold },

  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  placeholderTitle: { fontSize: typography.xl, fontWeight: typography.bold },
  placeholderSub: { fontSize: typography.sm },
});
