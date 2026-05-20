import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, radii } from '../styles/theme';
import { listarTareas, type Tarea } from '../services/taskService';
import { generarHorario, type BloqueAgente } from '../services/agentService';
import { useAuth, useUser } from '@clerk/expo';


const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const todayIndex = new Date().getDay();
const adjustedToday = todayIndex === 0 ? 6 : todayIndex - 1;

const PX_PER_MIN = 1.1;
const HOUR_HEIGHT = 60 * PX_PER_MIN;
const START_HOUR = 6;
const HOUR_COL = 52;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// Convierte una tarea con due_at a un bloque del timeline
// Asume duración de 30 min por defecto si no hay hora de inicio
interface ScheduleBlock {
  id: string;
  titulo: string;
  tipo: 'tarea';
  estado: 'pendiente' | 'completada';
  horaInicio: string;
  horaFin: string;
  durationMin: number;
}

function tareaToBlock(tarea: Tarea): ScheduleBlock | null {
  if (!tarea.due_at) return null;
  const due = new Date(tarea.due_at);
  const h = due.getHours();
  const m = due.getMinutes();
  if (h < START_HOUR || h >= START_HOUR + 16) return null; // fuera del rango visible

  const horaInicio = `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`;
  const endMin = h * 60 + m + 30;
  const endH = Math.floor(endMin / 60);
  const endM = endMin % 60;
  const horaFin = `${endH < 10 ? '0' : ''}${endH}:${endM < 10 ? '0' : ''}${endM}`;

  return {
    id: tarea.id_tarea,
    titulo: tarea.titulo,
    tipo: 'tarea',
    estado: tarea.completada ? 'completada' : 'pendiente',
    horaInicio,
    horaFin,
    durationMin: 30,
  };
}

// Filtra bloques que caen en un día de la semana (0=Lun...6=Dom)
function bloquesDelDia(tareas: Tarea[], dayIndex: number): ScheduleBlock[] {
  return tareas
    .filter(t => {
      if (!t.due_at) return false;
      const d = new Date(t.due_at);
      const dow = d.getDay(); // 0=Dom...6=Sáb
      const adjusted = dow === 0 ? 6 : dow - 1; // 0=Lun...6=Dom
      return adjusted === dayIndex;
    })
    .map(tareaToBlock)
    .filter((b): b is ScheduleBlock => b !== null);
}


function TimelineBlock({ block }: { block: ScheduleBlock }) {
  const { theme } = useTheme();

  const blockColors = {
    pendiente:  { bg: theme.surfaceElevated, border: theme.border,         text: theme.textSecondary },
    completada: { bg: theme.successMuted,    border: theme.success + '50', text: theme.success },
  };

  const tipoAccent = { tarea: theme.secondary };

  const top = (timeToMinutes(block.horaInicio) - START_HOUR * 60) * PX_PER_MIN;
  const height = Math.max(block.durationMin * PX_PER_MIN, 36);
  const scheme = blockColors[block.estado];

  return (
    <TouchableOpacity
      style={[styles.block, { top, height, borderColor: scheme.border, backgroundColor: scheme.bg }]}
      activeOpacity={0.8}
    >
      <View style={[styles.blockAccent, { backgroundColor: tipoAccent[block.tipo] }]} />
      <View style={styles.blockContent}>
        <Text style={[styles.blockTitle, { color: scheme.text }, height < 48 && styles.blockTitleSm]} numberOfLines={1}>
          {block.titulo}
        </Text>
        {height >= 48 && (
          <Text style={[styles.blockTime, { color: theme.textTertiary }]}>
            {block.horaInicio} – {block.horaFin}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}


export default function ScheduleScreen() {
  const { theme } = useTheme();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [selectedDay, setSelectedDay] = useState(adjustedToday);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const HOURS = Array.from({ length: 16 }, (_, i) => i + START_HOUR);

  const cargarTareas = useCallback(async () => {
    try {
      setError(null);
      const token = await getToken();
      if (!token) throw new Error('No hay sesión activa');
      const data = await listarTareas(token);
      setTareas(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar tareas');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { cargarTareas(); }, [cargarTareas]);

  const handleGenerar = async () => {
    setGenerating(true);
    try {
      const token = await getToken();
      const userId = user?.id;
      if (!token || !userId) throw new Error('No hay sesión activa');

      const hoy = new Date();
      const dow = hoy.getDay();
      const adjustedDow = dow === 0 ? 6 : dow - 1;
      const diff = selectedDay - adjustedDow;
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() + diff);

      const response = await generarHorario(token, userId, fecha, tareas);

      if (response.bloques.length === 0) {
        Alert.alert(
          'Sin bloques generados',
          'El agente necesita más historial de uso para generar un horario personalizado. Completa algunas tareas primero.',
        );
        return;
      }

      const bloques = response.bloques.map((b, i) => agenteToBlock(b, i));
      setBloquesAgente(bloques);

      if (response.es_fallback) {
        Alert.alert('Horario generado', 'Usamos un horario base porque aún no hay suficiente historial. Con el uso se irá personalizando.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo generar el horario');
    } finally {
      setGenerating(false);
    }
  };

  const bloquesDelDiaActual = bloquesDelDia(tareas, selectedDay);
  const todosBloques = [...bloquesDelDiaActual, ...bloquesAgente.filter(b => {
    // Solo mostrar bloques del agente que correspondan al día seleccionado
    return true; // ya filtramos por fecha al generar
  })];

  const completadas = todosBloques.filter(b => b.estado === 'completada').length;
  const pendientes = todosBloques.filter(b => b.estado === 'pendiente').length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Horario</Text>
        <TouchableOpacity
          style={[styles.generateBtn, { backgroundColor: theme.primaryMuted, borderColor: theme.primary + '50' }]}
          onPress={cargarTareas}
        >
          <Text style={[styles.generateBtnText, { color: theme.primary }]}>↻ Actualizar</Text>
        </TouchableOpacity>
      </View>

      {/* Day selector */}
      <View style={styles.daySelector}>
        {DAYS.map((d, i) => (
          <TouchableOpacity
            key={d}
            style={[
              styles.dayTab,
              { backgroundColor: theme.surface, borderColor: theme.border },
              selectedDay === i && { backgroundColor: theme.primaryMuted, borderColor: theme.primary + '50' },
            ]}
            onPress={() => setSelectedDay(i)}
          >
            <Text style={[
              styles.dayLabel,
              { color: selectedDay === i ? theme.primary : theme.textSecondary },
              selectedDay === i && styles.dayLabelActive,
            ]}>
              {d}
            </Text>
            {i === adjustedToday && (
              <View style={[styles.todayDot, { backgroundColor: theme.primary }]} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary strip */}
      <View style={styles.summaryStrip}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: theme.success }]} />
          <Text style={[styles.summaryText, { color: theme.textTertiary }]}>{completadas} completada{completadas !== 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: theme.textTertiary }]} />
          <Text style={[styles.summaryText, { color: theme.textTertiary }]}>{pendientes} pendiente{pendientes !== 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: theme.secondary }]} />
          <Text style={[styles.summaryText, { color: theme.textTertiary }]}>{bloques.length} total</Text>
        </View>
      </View>

      {/* Timeline */}
      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: spacing.xl }} />
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          <TouchableOpacity onPress={cargarTareas}>
            <Text style={[styles.retryText, { color: theme.primary }]}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.timeline} showsVerticalScrollIndicator={false} contentContainerStyle={styles.timelineContent}>
          {HOURS.map(h => (
            <View key={h} style={[styles.hourRow, { top: (h - START_HOUR) * HOUR_HEIGHT }]}>
              <Text style={[styles.hourLabel, { color: theme.textTertiary }]}>
                {h < 10 ? `0${h}` : h}:00
              </Text>
              <View style={[styles.hourLine, { backgroundColor: theme.borderSubtle }]} />
            </View>
          ))}

          <View style={[styles.blocksColumn, { height: HOURS.length * HOUR_HEIGHT }]}>
            {bloques.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
                Sin tareas con fecha para este día
              </Text>
            ) : (
              bloques.map(block => <TimelineBlock key={block.id} block={block} />)
            )}

            {/* Current time indicator — solo en el día de hoy */}
            {selectedDay === adjustedToday && (
              <View style={[styles.nowLine, {
                top: (new Date().getHours() * 60 + new Date().getMinutes() - START_HOUR * 60) * PX_PER_MIN,
              }]}>
                <View style={[styles.nowDot, { backgroundColor: theme.error }]} />
                <View style={[styles.nowBar, { backgroundColor: theme.error }]} />
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.base, paddingTop: spacing.md, paddingBottom: spacing.base,
  },
  headerTitle: { fontSize: typography.xxl, fontWeight: typography.bold },
  generateBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.full, borderWidth: 1 },
  generateBtnText: { fontSize: typography.sm, fontWeight: typography.semibold, letterSpacing: 0.3 },

  daySelector: { flexDirection: 'row', paddingHorizontal: spacing.base, gap: spacing.xs, marginBottom: spacing.base },
  dayTab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radii.md, borderWidth: 1 },
  dayLabel: { fontSize: typography.xs, fontWeight: typography.medium },
  dayLabelActive: { fontWeight: typography.bold },
  todayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },

  summaryStrip: { flexDirection: 'row', gap: spacing.base, paddingHorizontal: spacing.base, marginBottom: spacing.base },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  summaryDot: { width: 6, height: 6, borderRadius: 3 },
  summaryText: { fontSize: typography.xs },

  timeline: { flex: 1 },
  timelineContent: { position: 'relative', paddingBottom: spacing.xxl },

  hourRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', height: HOUR_HEIGHT },
  hourLabel: { width: HOUR_COL, fontSize: typography.xs, textAlign: 'right', paddingRight: spacing.md },
  hourLine: { flex: 1, height: 1, marginRight: spacing.base },

  blocksColumn: { position: 'relative', marginLeft: HOUR_COL + spacing.md, marginRight: spacing.base },
  block: { position: 'absolute', left: 0, right: 0, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', overflow: 'hidden' },
  blockAccent: { width: 3 },
  blockContent: { flex: 1, padding: spacing.sm, justifyContent: 'center' },
  blockTitle: { fontSize: typography.sm, fontWeight: typography.semibold },
  blockTitleSm: { fontSize: typography.xs },
  blockTime: { fontSize: typography.xs, marginTop: 2 },

  nowLine: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
  nowDot: { width: 8, height: 8, borderRadius: 4 },
  nowBar: { flex: 1, height: 1, opacity: 0.6 },

  errorBox: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.sm },
  errorText: { fontSize: typography.sm, textAlign: 'center' },
  retryText: { fontSize: typography.sm, fontWeight: typography.semibold },
  emptyText: { textAlign: 'center', marginTop: spacing.xl, fontSize: typography.sm, position: 'relative' },
});