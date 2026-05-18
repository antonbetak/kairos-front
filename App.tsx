import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import ScheduleScreen from './src/screens/ScheduleScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { spacing, typography } from './src/styles/theme';

// ─── Tab navigation ───────────────────────────────────────────────────────────

type Tab = 'home' | 'schedule' | 'stats' | 'agent';

const TABS: Array<{ key: Tab; icon: string; label: string }> = [
  { key: 'home',     icon: '⬡', label: 'Inicio' },
  { key: 'schedule', icon: '◷', label: 'Horario' },
  { key: 'stats',    icon: '◈', label: 'Métricas' },
  { key: 'agent',    icon: '✦', label: 'Agente' },
];

function TabBar({ active, onPress }: { active: Tab; onPress: (t: Tab) => void }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.tabBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
      {TABS.map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={styles.tabItem}
          onPress={() => onPress(tab.key)}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabIcon, { color: active === tab.key ? theme.primary : theme.textTertiary }]}>
            {tab.icon}
          </Text>
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
      <Text style={styles.placeholderIcon}>🚧</Text>
      <Text style={[styles.placeholderTitle, { color: theme.textPrimary }]}>{title}</Text>
      <Text style={[styles.placeholderSub, { color: theme.textTertiary }]}>Próximamente</Text>
    </View>
  );
}

// ─── Inner app (needs ThemeProvider above) ────────────────────────────────────

function AppInner() {
  const { theme } = useTheme();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('home');

  if (!isLoggedIn) {
    if (showRegister) {
      return (
        <>
          <StatusBar style="dark" />
          <RegisterScreen
            onRegister={() => { setShowRegister(false); setIsLoggedIn(true); }}
            onBack={() => setShowRegister(false)}
          />
        </>
      );
    }
    return (
      <>
        <StatusBar style="dark" />
        <LoginScreen
          onLogin={() => setIsLoggedIn(true)}
          onRegister={() => setShowRegister(true)}
          onGoogleLogin={() => setIsLoggedIn(true)}
        />
      </>
    );
  }

  if (showProfile) {
    return (
      <>
        <StatusBar style="dark" />
        <ProfileScreen
          onBack={() => setShowProfile(false)}
          onLogout={() => { setShowProfile(false); setIsLoggedIn(false); }}
        />
      </>
    );
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':     return <HomeScreen onAvatarPress={() => setShowProfile(true)} />;
      case 'schedule': return <ScheduleScreen />;
      case 'stats':    return <PlaceholderScreen title="Métricas" />;
      case 'agent':    return <PlaceholderScreen title="Agente Kairos" />;
    }
  };

  return (
    <>
      <StatusBar style="dark" />
      <View style={[styles.root, { backgroundColor: theme.bg }]}>
        <View style={styles.content}>{renderScreen()}</View>
        <TabBar active={activeTab} onPress={setActiveTab} />
      </View>
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },

  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  tabIcon: { fontSize: 20 },
  tabLabel: {
    fontSize: typography.xs,
    fontWeight: typography.medium,
  },
  tabLabelActive: {
    fontWeight: typography.semibold,
  },

  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  placeholderIcon: { fontSize: 40 },
  placeholderTitle: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
  },
  placeholderSub: { fontSize: typography.sm },
});