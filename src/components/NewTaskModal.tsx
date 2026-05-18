import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, radii, makeShadows } from '../styles/theme';


export interface NuevaTarea {
  titulo: string;
  descripcion?: string;
  due_at?: string;  // ISO string
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (tarea: NuevaTarea) => Promise<void>;
}


const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const HORAS = Array.from({ length: 24 }, (_, i) => `${i < 10 ? '0' : ''}${i}:00`);

function getNextDays(n: number): Date[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
}

function formatDate(date: Date): string {
  return `${DIAS_SEMANA[date.getDay()]} ${date.getDate()} ${MESES[date.getMonth()]}`;
}

function toISO(date: Date, hora: string): string {
  const [h, m] = hora.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}


export default function NewTaskModal({ visible, onClose, onSave }: Props) {
  const { theme } = useTheme();
  const shadows = makeShadows(theme.shadowColor);

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [withDueDate, setWithDueDate] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [selectedHora, setSelectedHora] = useState('18:00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const nextDays = getNextDays(14);

  const handleClose = () => {
    // Reset state
    setTitulo('');
    setDescripcion('');
    setWithDueDate(false);
    setSelectedDay(new Date());
    setSelectedHora('18:00');
    setError('');
    onClose();
  };

  const handleSave = async () => {
    if (!titulo.trim()) {
      setError('El título es requerido');
      return;
    }
    setSaving(true);
    try {
      const nueva: NuevaTarea = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || undefined,
        due_at: withDueDate ? toISO(selectedDay, selectedHora) : undefined,
      };
      await onSave(nueva);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la tarea');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kvWrapper}
      >
        <View style={[styles.sheet, { backgroundColor: theme.bg, borderColor: theme.border }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: theme.border }]} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>Nueva tarea</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={[styles.closeBtnText, { color: theme.textTertiary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Título */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>TÍTULO</Text>
              <TextInput
                style={[
                  styles.titleInput,
                  {
                    color: theme.textPrimary,
                    borderBottomColor: error ? theme.error : titulo ? theme.primary : theme.border,
                  },
                ]}
                placeholder="¿Qué hay que hacer?"
                placeholderTextColor={theme.textTertiary}
                value={titulo}
                onChangeText={t => { setTitulo(t); setError(''); }}
                autoFocus
                returnKeyType="next"
              />
              {error ? (
                <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
              ) : null}
            </View>

            {/* Descripción */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                DESCRIPCIÓN <Text style={[styles.optional, { color: theme.textTertiary }]}>(opcional)</Text>
              </Text>
              <TextInput
                style={[
                  styles.descInput,
                  {
                    color: theme.textPrimary,
                    backgroundColor: theme.surfaceElevated,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Agrega más detalles..."
                placeholderTextColor={theme.textTertiary}
                value={descripcion}
                onChangeText={setDescripcion}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Fecha límite toggle */}
            <View style={styles.fieldGroup}>
              <TouchableOpacity
                style={[
                  styles.dueDateToggle,
                  {
                    backgroundColor: withDueDate ? theme.primaryMuted : theme.surfaceElevated,
                    borderColor: withDueDate ? theme.primary + '50' : theme.border,
                  },
                ]}
                onPress={() => setWithDueDate(!withDueDate)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dueDateToggleText, { color: withDueDate ? theme.primary : theme.textSecondary }]}>
                  {withDueDate ? 'Con fecha límite' : 'Sin fecha límite'}
                </Text>
                <View style={[
                  styles.toggleSwitch,
                  { backgroundColor: withDueDate ? theme.primary : theme.border },
                ]}>
                  <View style={[
                    styles.toggleKnob,
                    { backgroundColor: theme.bg },
                    withDueDate && styles.toggleKnobOn,
                  ]} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Date/hour pickers */}
            {withDueDate && (
              <>
                {/* Día */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>DÍA</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipRow}
                  >
                    {nextDays.map((day, i) => {
                      const isSelected = day.toDateString() === selectedDay.toDateString();
                      return (
                        <TouchableOpacity
                          key={i}
                          style={[
                            styles.dayChip,
                            {
                              backgroundColor: isSelected ? theme.primaryMuted : theme.surfaceElevated,
                              borderColor: isSelected ? theme.primary : theme.border,
                            },
                          ]}
                          onPress={() => setSelectedDay(day)}
                        >
                          <Text style={[styles.dayChipText, { color: isSelected ? theme.primary : theme.textSecondary }]}>
                            {i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : formatDate(day)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Hora */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>HORA</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipRow}
                  >
                    {HORAS.map(h => (
                      <TouchableOpacity
                        key={h}
                        style={[
                          styles.horaChip,
                          {
                            backgroundColor: selectedHora === h ? theme.primaryMuted : theme.surfaceElevated,
                            borderColor: selectedHora === h ? theme.primary : theme.border,
                          },
                        ]}
                        onPress={() => setSelectedHora(h)}
                      >
                        <Text style={[styles.horaChipText, { color: selectedHora === h ? theme.primary : theme.textSecondary }]}>
                          {h}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </>
            )}

            {/* Save button */}
            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: titulo.trim() ? theme.primary : theme.surfaceElevated },
                titulo.trim() && shadows.glow,
              ]}
              onPress={handleSave}
              disabled={saving || !titulo.trim()}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color={titulo.trim() ? theme.textInverse : theme.textTertiary} size="small" />
                : <Text style={[styles.saveBtnText, { color: titulo.trim() ? theme.textInverse : theme.textTertiary }]}>
                    Crear tarea
                  </Text>
              }
            </TouchableOpacity>

            <View style={{ height: spacing.xl }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}


const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000044',
  },
  kvWrapper: {
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: spacing.md,
    maxHeight: '90%',
  },
  handle: {
    width: 36, height: 4,
    borderRadius: radii.full,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },

  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    marginBottom: spacing.lg,
  },
  sheetTitle: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
  },
  closeBtn: { padding: spacing.xs },
  closeBtnText: { fontSize: typography.lg },

  scrollContent: {
    paddingHorizontal: spacing.base,
  },

  fieldGroup: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  optional: {
    fontWeight: typography.regular,
    textTransform: 'none',
    letterSpacing: 0,
  },

  titleInput: {
    fontSize: typography.lg,
    fontWeight: typography.medium,
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
  },
  errorText: {
    fontSize: typography.xs,
    marginTop: spacing.xs,
  },

  descInput: {
    fontSize: typography.base,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    minHeight: 80,
  },

  dueDateToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  dueDateToggleIcon: { fontSize: 18 },
  dueDateToggleText: {
    flex: 1,
    fontSize: typography.base,
    fontWeight: typography.medium,
  },
  toggleSwitch: {
    width: 40, height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleKnob: {
    width: 18, height: 18,
    borderRadius: 9,
  },
  toggleKnobOn: {
    alignSelf: 'flex-end',
  },

  chipRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dayChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  dayChipText: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
  },
  horaChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  horaChipText: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
  },

  saveBtn: {
    height: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  saveBtnText: {
    fontSize: typography.base,
    fontWeight: typography.bold,
    letterSpacing: 0.5,
  },
});