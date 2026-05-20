import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ClerkProvider, ClerkLoaded, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import ScheduleScreen from './src/screens/ScheduleScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import StatsScreen from './src/screens/StatsScreen';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { spacing, typography } from './src/styles/theme';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error('Falta EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY en el archivo .env');
}


type Tab = 'home' | 'schedule' | 'stats' | 'community';

const TABS: Array<{ key: Tab; icon: string; label: string }> = [
  { key: 'home',     icon: '⬡', label: 'Inicio' },
  { key: 'schedule', icon: '◷', label: 'Horario' },
  { key: 'stats',    icon: '◈', label: 'Métricas' },
  { key: 'community',    icon: '✦', label: 'Comunidad' },
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
      <Text style={[styles.placeholderTitle, { color: theme.textPrimary }]}>{title}</Text>
      <Text style={[styles.placeholderSub, { color: theme.textTertiary }]}>Próximamente</Text>
    </View>
  );
}


function AppInner() {
  const { theme } = useTheme();
  // isSignedIn de Clerk reemplaza el useState(false) de isLoggedIn
  const { isSignedIn, isLoaded } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('home');

  // Clerk cargando la sesión guardada en expo-secure-store
  if (!isLoaded) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  // No autenticado
  if (!isSignedIn) {
    if (showRegister) {
      return (
        <>
          <StatusBar style="dark" />
          <RegisterScreen
            onBack={() => setShowRegister(false)}
          />
        </>
      );
    }
    return (
      <>
        <StatusBar style="dark" />
        <LoginScreen
          onRegister={() => setShowRegister(true)}
        />
      </>
    );
  }

  // Perfil
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

  // App principal
  const renderScreen = () => {
    switch (activeTab) {
      case 'home':     return <HomeScreen onAvatarPress={() => setShowProfile(true)} />;
      case 'schedule': return <ScheduleScreen />;
      case 'stats': return <StatsScreen />;
      case 'community':    return <PlaceholderScreen title="Comunidad" />;
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

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
  placeholderTitle: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
  },
  placeholderSub: { fontSize: typography.sm },
});