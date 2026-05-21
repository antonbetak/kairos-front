import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, radii, makeShadows } from '../styles/theme';
import ThemePicker from '../components/ThemePicker';
import { useUser } from '@clerk/expo';


interface UserProfile {
  nombre: string;
  email: string;
  fotoUrl?: string;
  authProvider: 'email' | 'google';
  horarioInicio: string;
  horarioFin: string;
  diasLaborales: number[];
  estiloTrabajo: 'bloques_largos' | 'sesiones_cortas' | 'mixto';
}

const DEFAULT_PROFILE: UserProfile = {
  nombre: '',
  email: '',
  authProvider: 'email',
  horarioInicio: '09:00',
  horarioFin: '18:00',
  diasLaborales: [0, 1, 2, 3, 4],
  estiloTrabajo: 'mixto',
};

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const ESTILOS: Array<{ key: UserProfile['estiloTrabajo']; label: string; desc: string }> = [
  { key: 'bloques_largos',  label: 'Bloques largos',  desc: 'Sesiones de 2+ horas sin interrupciones' },
  { key: 'sesiones_cortas', label: 'Sesiones cortas', desc: 'Intervalos de 25–50 min con descansos' },
  { key: 'mixto',           label: 'Mixto',           desc: 'Adapto según la tarea' },
];

const HORAS = Array.from({ length: 24 }, (_, i) => `${i < 10 ? '0' : ''}${i}:00`);


function Avatar({
  fotoUrl,
  nombre,
  onPress,
}: {
  fotoUrl?: string;
  nombre: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const initials = nombre
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <TouchableOpacity style={styles.avatarContainer} onPress={onPress} activeOpacity={0.8}>
      {fotoUrl ? (
        <Image source={{ uri: fotoUrl }} style={[styles.avatarImage, { borderColor: theme.primary }]} />
      ) : (
        <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primaryMuted, borderColor: theme.primary }]}>
          <Text style={[styles.avatarInitials, { color: theme.primary }]}>{initials}</Text>
        </View>
      )}
      <View style={[styles.avatarBadge, { backgroundColor: theme.primary }]}>
        <Text style={[styles.avatarBadgeText, { color: theme.textInverse }]}>✎</Text>
      </View>
    </TouchableOpacity>
  );
}


function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {children}
      </View>
    </View>
  );
}


function RowItem({
  label,
  value,
  onPress,
  danger,
  hideChevron,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  hideChevron?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      style={styles.rowItem}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <Text style={[styles.rowLabel, { color: danger ? theme.error : theme.textPrimary }]}>{label}</Text>
      <View style={styles.rowRight}>
        {value && <Text style={[styles.rowValue, { color: theme.textSecondary }]}>{value}</Text>}
        {!hideChevron && onPress && (
          <Text style={[styles.rowChevron, { color: theme.textTertiary }]}>›</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.rowItem}>
      <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: theme.textTertiary }]}>{value}</Text>
    </View>
  );
}

function RowDivider() {
  const { theme } = useTheme();
  return <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />;
}

function EditableRow({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address';
}) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.editableRow, focused && { borderBottomColor: theme.primary }]}>
      <Text style={[styles.editableLabel, { color: theme.textTertiary }]}>{label}</Text>
      <TextInput
        style={[styles.editableInput, { color: theme.textPrimary }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textTertiary}
        keyboardType={keyboardType}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
      />
    </View>
  );
}

function TimeRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View>
      <TouchableOpacity style={styles.rowItem} onPress={() => setOpen(!open)} activeOpacity={0.7}>
        <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{label}</Text>
        <View style={styles.rowRight}>
          <Text style={[styles.rowValue, { color: theme.textSecondary }]}>{value}</Text>
          <Text style={[styles.rowChevron, { color: theme.textTertiary }]}>{open ? '⌃' : '›'}</Text>
        </View>
      </TouchableOpacity>
      {open && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.timeScroll, { borderTopColor: theme.border }]}
          contentContainerStyle={styles.timeScrollContent}
        >
          {HORAS.map(h => (
            <TouchableOpacity
              key={h}
              style={[
                styles.timeChip,
                { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
                value === h && { backgroundColor: theme.primaryMuted, borderColor: theme.primary },
              ]}
              onPress={() => { onChange(h); setOpen(false); }}
            >
              <Text style={[styles.timeChipText, { color: value === h ? theme.primary : theme.textSecondary }]}>
                {h}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

interface Props {
  onLogout?: () => void | Promise<void>;
  onBack?: () => void;
}

export default function ProfileScreen({ onLogout, onBack }: Props) {
  const { theme } = useTheme();
  const shadows = makeShadows(theme.shadowColor);

  const { user } = useUser();

  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const originalRef = useRef<UserProfile>(DEFAULT_PROFILE);
  const isDirty = JSON.stringify(profile) !== JSON.stringify(originalRef.current);

  const update = (fields: Partial<UserProfile>) =>
    setProfile(p => ({ ...p, ...fields }));

  // ── Cargar usuario desde Clerk ──
  const cargarPerfil = useCallback(async () => {
    try {
      const nombre = user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] ?? '';
      const email = user?.emailAddresses?.[0]?.emailAddress ?? '';
      const fotoUrl = user?.imageUrl ?? undefined;
      const authProvider = user?.externalAccounts?.length ? 'google' : 'email';
      const loaded: UserProfile = {
        ...DEFAULT_PROFILE,
        nombre,
        email,
        fotoUrl,
        authProvider,
      };
      setProfile(loaded);
      originalRef.current = loaded;
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    cargarPerfil();
  }, [cargarPerfil]);

  // ── Avatar ──
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería para cambiar la foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      update({ fotoUrl: result.assets[0].uri });
    }
  };

  // ── Days ──
  const toggleDia = (i: number) => {
    const dias = profile.diasLaborales.includes(i)
      ? profile.diasLaborales.filter(d => d !== i)
      : [...profile.diasLaborales, i].sort();
    update({ diasLaborales: dias });
  };

  // ── Save ──
  const handleSave = async () => {
    setSaving(true);
    // Próximamente: PATCH /auth/me cuando el backend lo implemente
    setTimeout(() => {
      setSaving(false);
      originalRef.current = profile;
      Alert.alert('Guardado', 'Tu perfil fue actualizado.');
    }, 800);
  };

  // ── Back ──
  const handleBack = () => {
    if (isDirty) {
      Alert.alert('Cambios sin guardar', '¿Descartar cambios?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: onBack },
      ]);
    } else {
      onBack?.();
    }
  };

  // ── Password ──
  const handleChangePassword = () => {
    Alert.alert('Cambiar contraseña', 'Te enviaremos un correo para restablecer tu contraseña.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Enviar correo', onPress: () => {} },
    ]);
  };

  // ── Logout ──
  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Segura que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: () => { void onLogout?.(); },
      },
    ]);
  };

  // ── Delete ──
  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      'Esta acción es irreversible. ¿Estás segura?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color={theme.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} activeOpacity={0.7} style={styles.backBtn}>
          <Text style={[styles.backBtnText, { color: theme.textSecondary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Perfil</Text>
        <TouchableOpacity
          style={[
            styles.saveBtn,
            { backgroundColor: isDirty ? theme.primary : theme.surfaceElevated },
            isDirty && shadows.glow,
          ]}
          onPress={handleSave}
          disabled={!isDirty || saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color={isDirty ? theme.textInverse : theme.textTertiary} size="small" />
            : <Text style={[styles.saveBtnText, { color: isDirty ? theme.textInverse : theme.textTertiary }]}>
                Guardar
              </Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <Avatar fotoUrl={profile.fotoUrl} nombre={profile.nombre} onPress={handlePickImage} />
          <Text style={[styles.avatarHint, { color: theme.textTertiary }]}>
            {profile.authProvider === 'google'
              ? 'Foto de tu cuenta Google · toca para cambiar'
              : 'Toca para cambiar tu foto'}
          </Text>
        </View>

        {/* Información personal */}
        <Section title="INFORMACIÓN PERSONAL">
          <EditableRow
            label="Nombre"
            value={profile.nombre}
            onChangeText={t => update({ nombre: t })}
            placeholder="Tu nombre"
          />
          <RowDivider />
          <ReadOnlyRow label="Correo" value={profile.email} />
          {profile.authProvider === 'email' && (
            <>
              <RowDivider />
              <RowItem label="Cambiar contraseña" onPress={handleChangePassword} />
            </>
          )}
        </Section>

        {/* Apariencia */}
        <Section title="APARIENCIA">
          <View style={styles.themePickerRow}>
            <ThemePicker compact />
          </View>
        </Section>

        {/* Productividad */}
        <Section title="PRODUCTIVIDAD">
          <TimeRow
            label="Inicio de jornada"
            value={profile.horarioInicio}
            onChange={v => update({ horarioInicio: v })}
          />
          <RowDivider />
          <TimeRow
            label="Fin de jornada"
            value={profile.horarioFin}
            onChange={v => update({ horarioFin: v })}
          />
          <RowDivider />
          <View style={styles.diasRow}>
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>Días laborales</Text>
            <View style={styles.diasChips}>
              {DIAS.map((d, i) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.diaChip,
                    {
                      backgroundColor: profile.diasLaborales.includes(i)
                        ? theme.primaryMuted
                        : theme.surfaceElevated,
                      borderColor: profile.diasLaborales.includes(i)
                        ? theme.primary + '50'
                        : theme.border,
                    },
                  ]}
                  onPress={() => toggleDia(i)}
                >
                  <Text style={[
                    styles.diaChipText,
                    { color: profile.diasLaborales.includes(i) ? theme.primary : theme.textSecondary },
                  ]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <RowDivider />

          {/* Estilo de trabajo */}
          <View style={styles.estiloSection}>
            <Text style={[styles.rowLabel, { color: theme.textPrimary, marginBottom: spacing.sm }]}>
              Estilo de trabajo
            </Text>
            {ESTILOS.map((e, i) => (
              <TouchableOpacity
                key={e.key}
                style={[
                  styles.estiloOption,
                  {
                    backgroundColor: theme.surfaceElevated,
                    borderColor: profile.estiloTrabajo === e.key ? theme.primary : theme.border,
                  },
                  i < ESTILOS.length - 1 && { marginBottom: spacing.sm },
                ]}
                onPress={() => update({ estiloTrabajo: e.key })}
                activeOpacity={0.8}
              >
                <View style={[
                  styles.estiloRadio,
                  { borderColor: profile.estiloTrabajo === e.key ? theme.primary : theme.border },
                ]}>
                  {profile.estiloTrabajo === e.key && (
                    <View style={[styles.estiloRadioFill, { backgroundColor: theme.primary }]} />
                  )}
                </View>
                <View style={styles.estiloText}>
                  <Text style={[styles.estiloLabel, { color: theme.textPrimary }]}>{e.label}</Text>
                  <Text style={[styles.estiloDesc, { color: theme.textSecondary }]}>{e.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* Cuenta */}
        <Section title="CUENTA">
          <RowItem label="Cerrar sesión" onPress={handleLogout} />
          <RowDivider />
          <RowItem label="Eliminar cuenta" onPress={handleDeleteAccount} danger />
        </Section>

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.base,
  },
  headerTitle: {
    fontSize: typography.xxl,
    fontWeight: typography.bold,
  },
  backBtn: { padding: spacing.xs },
  backBtnText: { fontSize: typography.xl },
  saveBtn: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    minWidth: 80,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
  },

  scrollContent: { paddingHorizontal: spacing.base },

  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  avatarContainer: { position: 'relative', marginBottom: spacing.sm },
  avatarImage: { width: 88, height: 88, borderRadius: 44, borderWidth: 3 },
  avatarPlaceholder: {
    width: 88, height: 88, borderRadius: 44, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontSize: typography.xxl, fontWeight: typography.bold },
  avatarBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarBadgeText: { fontSize: 13 },
  avatarHint: { fontSize: typography.xs, textAlign: 'center' },

  section: { marginBottom: spacing.xl },
  sectionTitle: {
    fontSize: typography.xs, fontWeight: typography.semibold,
    letterSpacing: 1, marginBottom: spacing.sm, marginLeft: spacing.xs,
  },
  sectionCard: { borderRadius: radii.lg, borderWidth: 1, overflow: 'hidden' },

  rowItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
  },
  rowLabel: { fontSize: typography.base },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  rowValue: { fontSize: typography.sm },
  rowChevron: { fontSize: typography.lg },
  rowDivider: { height: 1, marginHorizontal: spacing.base },

  editableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: 'transparent',
  },
  editableLabel: { fontSize: typography.sm, width: 72 },
  editableInput: { flex: 1, fontSize: typography.base },

  themePickerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
  },

  timeScroll: { borderTopWidth: 1, maxHeight: 52 },
  timeScrollContent: {
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm, gap: spacing.sm,
  },
  timeChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radii.full, borderWidth: 1,
  },
  timeChipText: { fontSize: typography.sm, fontWeight: typography.medium },

  diasRow: { paddingHorizontal: spacing.base, paddingVertical: spacing.md, gap: spacing.sm },
  diasChips: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', marginTop: spacing.sm },
  diaChip: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.full, borderWidth: 1 },
  diaChipText: { fontSize: typography.xs, fontWeight: typography.medium },

  estiloSection: { paddingHorizontal: spacing.base, paddingVertical: spacing.md },
  estiloOption: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderRadius: radii.md, borderWidth: 1,
  },
  estiloRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  estiloRadioFill: { width: 10, height: 10, borderRadius: 5 },
  estiloText: { flex: 1 },
  estiloLabel: { fontSize: typography.base, fontWeight: typography.medium },
  estiloDesc: { fontSize: typography.xs, marginTop: 2 },
});