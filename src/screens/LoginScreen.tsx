import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, radii, makeShadows } from '../styles/theme';
import ThemePicker from '../components/ThemePicker';
import { login } from '../src/services/authService';
import { saveSession } from '../src/store/authStore';

interface Props {
  onLogin?: () => void;
  onRegister?: () => void;
  onGoogleLogin?: () => void;
}

export default function LoginScreen({ onLogin, onRegister, onGoogleLogin }: Props) {
  const { theme } = useTheme();
  const shadows = makeShadows(theme.shadowColor);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu correo y contraseña');
      return;
    }

    setLoading(true);
    try {
      const response = await login(email.trim(), password);

      await saveSession(
        response.access_token,
        response.refresh_token,
        // El token tiene el usuario, pero no lo decodificamos aquí —
        // lo cargamos desde /auth/me después del login si se necesita
        { id_usuario: '', nombre: '', email: email.trim() }
      );

      onLogin?.();
    } catch (error: any) {
      Alert.alert('Error al iniciar sesión', error.message || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />

      {/* Decorative circles */}
      <View style={[styles.decorCircle1, { backgroundColor: theme.primary }]} />
      <View style={[styles.decorCircle2, { backgroundColor: theme.secondary }]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Theme picker — top right */}
        <View style={styles.themePickerRow}>
          <ThemePicker compact />
        </View>

        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoMark}>
            <View style={[styles.logoRing, { borderColor: theme.primary }]} />
            <View style={[styles.logoDot, { backgroundColor: theme.primary }]} />
          </View>
          <Text style={[styles.logoText, { color: theme.textPrimary }]}>kairos</Text>
          <Text style={[styles.logoTagline, { color: theme.textTertiary }]}>
            el momento oportuno
          </Text>
        </View>

        {/* Form card */}
        <View style={[
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.border },
          shadows.md,
        ]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Bienvenido</Text>
          <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
            Inicia sesión para continuar
          </Text>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
              Correo electrónico
            </Text>
            <View style={[
              styles.inputWrapper,
              { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
              focusedField === 'email' && { borderColor: theme.primary },
            ]}>
              <TextInput
                style={[styles.input, { color: theme.textPrimary }]}
                placeholder="tu@correo.com"
                placeholderTextColor={theme.textTertiary}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
              Contraseña
            </Text>
            <View style={[
              styles.inputWrapper,
              { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
              focusedField === 'password' && { borderColor: theme.primary },
            ]}>
              <TextInput
                style={[styles.input, { flex: 1, color: theme.textPrimary }]}
                placeholder="••••••••"
                placeholderTextColor={theme.textTertiary}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Login button */}
          <TouchableOpacity
            style={[
              styles.loginButton,
              { backgroundColor: theme.primary },
              loading && styles.loginButtonDisabled,
              shadows.glow,
            ]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.textInverse} size="small" />
            ) : (
              <Text style={[styles.loginButtonText, { color: theme.textInverse }]}>
                Iniciar sesión
              </Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            <Text style={[styles.dividerText, { color: theme.textTertiary }]}>
              o continúa con
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          </View>

          {/* Google button */}
          <TouchableOpacity
            style={[
              styles.googleButton,
              { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
            ]}
            onPress={onGoogleLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={[styles.googleButtonText, { color: theme.textPrimary }]}>
              Iniciar con Google
            </Text>
          </TouchableOpacity>
        </View>

        {/* Register */}
        <View style={styles.registerRow}>
          <Text style={[styles.registerText, { color: theme.textSecondary }]}>
            ¿No tienes cuenta?{' '}
          </Text>
          <TouchableOpacity onPress={onRegister}>
            <Text style={[styles.registerLink, { color: theme.primary }]}>
              Regístrate
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },

  decorCircle1: {
    position: 'absolute',
    width: 280, height: 280,
    borderRadius: 140,
    opacity: 0.08,
    top: -80, right: -80,
  },
  decorCircle2: {
    position: 'absolute',
    width: 200, height: 200,
    borderRadius: 100,
    opacity: 0.07,
    bottom: 40, left: -60,
  },

  themePickerRow: {
    alignItems: 'flex-end',
    marginBottom: spacing.lg,
  },

  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoMark: {
    width: 56, height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoRing: {
    position: 'absolute',
    width: 56, height: 56,
    borderRadius: 28,
    borderWidth: 2,
    opacity: 0.8,
  },
  logoDot: {
    width: 12, height: 12,
    borderRadius: 6,
  },
  logoText: {
    fontSize: typography.xxxl,
    fontWeight: typography.extrabold,
    letterSpacing: 6,
    textTransform: 'lowercase',
  },
  logoTagline: {
    fontSize: typography.xs,
    fontWeight: typography.light,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: spacing.xs,
  },

  card: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    fontSize: typography.sm,
    marginBottom: spacing.xl,
  },

  inputGroup: { marginBottom: spacing.base },
  inputLabel: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
  },
  input: {
    height: 48,
    fontSize: typography.base,
  },
  eyeButton: { padding: spacing.xs },
  eyeText: { fontSize: 16 },

  loginButton: {
    height: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonText: {
    fontSize: typography.base,
    fontWeight: typography.bold,
    letterSpacing: 0.5,
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: {
    fontSize: typography.xs,
    marginHorizontal: spacing.md,
    letterSpacing: 0.5,
  },

  googleButton: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  googleIcon: {
    fontSize: typography.md,
    fontWeight: typography.bold,
    color: '#4285F4',
  },
  googleButtonText: {
    fontSize: typography.base,
    fontWeight: typography.medium,
  },

  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  registerText: { fontSize: typography.sm },
  registerLink: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
  },
});