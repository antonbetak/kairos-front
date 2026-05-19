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
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignUp } from '@clerk/expo';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, radii, makeShadows } from '../styles/theme';
import ThemePicker from '../components/ThemePicker';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  onBack?: () => void;
}

export default function RegisterScreen({ onBack }: Props) {
  const { theme } = useTheme();
  const shadows = makeShadows(theme.shadowColor);

  const { signUp, setActive, isLoaded } = useSignUp();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Clerk requiere verificar el correo antes de activar la cuenta
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');


  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!nombre.trim())                       newErrors.nombre = 'El nombre es requerido';
    if (!email.trim())                        newErrors.email = 'El correo es requerido';
    else if (!/\S+@\S+\.\S+/.test(email))    newErrors.email = 'Correo inválido';
    if (!password)                            newErrors.password = 'La contraseña es requerida';
    else if (password.length < 8)            newErrors.password = 'Mínimo 8 caracteres';
    if (password !== confirmPassword)        newErrors.confirmPassword = 'Las contraseñas no coinciden';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const handleRegister = async () => {
    if (!isLoaded || !validate()) return;
    setLoading(true);
    try {
      await signUp.create({
        firstName: nombre.trim(),
        emailAddress: email.trim(),
        password,
      });

      // Clerk manda un código al correo para verificar
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (error: any) {
      const msg =
        error?.errors?.[0]?.longMessage ||
        error?.errors?.[0]?.message ||
        'Intenta con otro correo';
      Alert.alert('Error al registrarse', msg);
    } finally {
      setLoading(false);
    }
  };


  const handleVerify = async () => {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      if (result.status === 'complete') {
        // Clerk activa la sesión → App.tsx detecta isSignedIn automáticamente
        await setActive({ session: result.createdSessionId });
      } else {
        Alert.alert('Error', 'El código no es válido. Intenta de nuevo.');
      }
    } catch (error: any) {
      const msg =
        error?.errors?.[0]?.longMessage ||
        error?.errors?.[0]?.message ||
        'Código incorrecto';
      Alert.alert('Error de verificación', msg);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field: string) => [
    styles.inputWrapper,
    {
      backgroundColor: theme.surfaceElevated,
      borderColor: errors[field]
        ? theme.error
        : focusedField === field
          ? theme.primary
          : theme.border,
    },
  ];


  if (pendingVerification) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />
        <View style={[styles.decorCircle1, { backgroundColor: theme.secondary }]} />
        <View style={[styles.decorCircle2, { backgroundColor: theme.primary }]} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.topRow}>
              <ThemePicker compact />
            </View>

            <View style={styles.logoSection}>
              <View style={styles.logoMark}>
                <View style={[styles.logoRing, { borderColor: theme.primary }]} />
                <View style={[styles.logoDot, { backgroundColor: theme.primary }]} />
              </View>
              <Text style={[styles.logoText, { color: theme.textPrimary }]}>kairos</Text>
            </View>

            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, shadows.md]}>
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Verifica tu correo</Text>
              <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                Te enviamos un código a {email}. Revisa tu bandeja de entrada.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Código de verificación</Text>
                <View style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: theme.surfaceElevated,
                    borderColor: focusedField === 'code' ? theme.primary : theme.border,
                  },
                ]}>
                  <TextInput
                    style={[styles.input, { color: theme.textPrimary, flex: 1, letterSpacing: 4, textAlign: 'center' }]}
                    placeholder="· · · · · ·"
                    placeholderTextColor={theme.textTertiary}
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    onFocus={() => setFocusedField('code')}
                    onBlur={() => setFocusedField(null)}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.registerButton,
                  { backgroundColor: theme.primary },
                  loading && styles.buttonDisabled,
                  shadows.glow,
                ]}
                onPress={handleVerify}
                activeOpacity={0.85}
                disabled={loading || verificationCode.length < 6}
              >
                {loading ? (
                  <ActivityIndicator color={theme.textInverse} size="small" />
                ) : (
                  <Text style={[styles.registerButtonText, { color: theme.textInverse }]}>
                    Verificar
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendRow}
                onPress={() => signUp.prepareEmailAddressVerification({ strategy: 'email_code' })}
              >
                <Text style={[styles.resendText, { color: theme.textTertiary }]}>
                  ¿No recibiste el código?{' '}
                </Text>
                <Text style={[styles.resendLink, { color: theme.primary }]}>Reenviar</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.loginRow}>
              <TouchableOpacity onPress={() => setPendingVerification(false)}>
                <Text style={[styles.loginLink, { color: theme.primary }]}>← Volver</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── Pantalla de registro ─────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />

      <View style={[styles.decorCircle1, { backgroundColor: theme.secondary }]} />
      <View style={[styles.decorCircle2, { backgroundColor: theme.primary }]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          <View style={styles.topRow}>
            <ThemePicker compact />
          </View>

          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.logoMark}>
              <View style={[styles.logoRing, { borderColor: theme.primary }]} />
              <View style={[styles.logoDot, { backgroundColor: theme.primary }]} />
            </View>
            <Text style={[styles.logoText, { color: theme.textPrimary }]}>kairos</Text>
          </View>

          {/* Card */}
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, shadows.md]}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Crear cuenta</Text>
            <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
              Solo lo esencial — el resto lo configuras en tu perfil
            </Text>

            {/* Nombre */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Nombre</Text>
              <View style={inputStyle('nombre')}>
                <TextInput
                  style={[styles.input, { color: theme.textPrimary }]}
                  placeholder="¿Cómo te llamamos?"
                  placeholderTextColor={theme.textTertiary}
                  value={nombre}
                  onChangeText={t => { setNombre(t); setErrors(e => ({ ...e, nombre: '' })); }}
                  onFocus={() => setFocusedField('nombre')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="words"
                />
              </View>
              {errors.nombre && (
                <Text style={[styles.errorText, { color: theme.error }]}>{errors.nombre}</Text>
              )}
            </View>

            {/* Correo */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Correo electrónico</Text>
              <View style={inputStyle('email')}>
                <TextInput
                  style={[styles.input, { color: theme.textPrimary }]}
                  placeholder="tu@correo.com"
                  placeholderTextColor={theme.textTertiary}
                  value={email}
                  onChangeText={t => { setEmail(t); setErrors(e => ({ ...e, email: '' })); }}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {errors.email && (
                <Text style={[styles.errorText, { color: theme.error }]}>{errors.email}</Text>
              )}
            </View>

            {/* Contraseña */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Contraseña</Text>
              <View style={inputStyle('password')}>
                <TextInput
                  style={[styles.input, { flex: 1, color: theme.textPrimary }]}
                  placeholder="Mínimo 8 caracteres"
                  placeholderTextColor={theme.textTertiary}
                  value={password}
                  onChangeText={t => { setPassword(t); setErrors(e => ({ ...e, password: '' })); }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={[styles.errorText, { color: theme.error }]}>{errors.password}</Text>
              )}
            </View>

            {/* Confirmar contraseña */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Confirmar contraseña</Text>
              <View style={inputStyle('confirmPassword')}>
                <TextInput
                  style={[styles.input, { flex: 1, color: theme.textPrimary }]}
                  placeholder="Repite tu contraseña"
                  placeholderTextColor={theme.textTertiary}
                  value={confirmPassword}
                  onChangeText={t => { setConfirmPassword(t); setErrors(e => ({ ...e, confirmPassword: '' })); }}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showConfirm}
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeButton}>
                  <Ionicons
                    name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <Text style={[styles.errorText, { color: theme.error }]}>{errors.confirmPassword}</Text>
              )}
            </View>

            {/* Botón */}
            <TouchableOpacity
              style={[
                styles.registerButton,
                { backgroundColor: theme.primary },
                loading && styles.buttonDisabled,
                shadows.glow,
              ]}
              onPress={handleRegister}
              activeOpacity={0.85}
              disabled={loading || !isLoaded}
            >
              {loading ? (
                <ActivityIndicator color={theme.textInverse} size="small" />
              ) : (
                <Text style={[styles.registerButtonText, { color: theme.textInverse }]}>
                  Crear cuenta
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Login link */}
          <View style={styles.loginRow}>
            <Text style={[styles.loginText, { color: theme.textSecondary }]}>
              ¿Ya tienes cuenta?{' '}
            </Text>
            <TouchableOpacity onPress={onBack}>
              <Text style={[styles.loginLink, { color: theme.primary }]}>Inicia sesión</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },

  decorCircle1: {
    position: 'absolute',
    width: 260, height: 260,
    borderRadius: 130,
    opacity: 0.07,
    top: -60, left: -80,
  },
  decorCircle2: {
    position: 'absolute',
    width: 180, height: 180,
    borderRadius: 90,
    opacity: 0.06,
    bottom: 60, right: -50,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },

  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoMark: {
    width: 48, height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  logoRing: {
    position: 'absolute',
    width: 48, height: 48,
    borderRadius: 24,
    borderWidth: 2,
    opacity: 0.8,
  },
  logoDot: {
    width: 10, height: 10,
    borderRadius: 5,
  },
  logoText: {
    fontSize: typography.xxl,
    fontWeight: typography.extrabold,
    letterSpacing: 6,
    textTransform: 'lowercase',
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
    lineHeight: 18,
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
  errorText: {
    fontSize: typography.xs,
    marginTop: spacing.xs,
  },

  registerButton: {
    height: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  buttonDisabled: { opacity: 0.7 },
  registerButtonText: {
    fontSize: typography.base,
    fontWeight: typography.bold,
    letterSpacing: 0.5,
  },

  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  loginText: { fontSize: typography.sm },
  loginLink: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
  },

  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  resendText: { fontSize: typography.sm },
  resendLink: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
  },
});