import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, radii } from '../styles/theme';
import { listarTareas, type Tarea } from '../services/taskService';
import { useUser } from '@clerk/expo';
import { useKairosToken } from '../hooks/useKairosToken';


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


interface ScheduleBlock {
  id: string;
  titulo: string;
  tipo: 'tarea' | 'habito' | 'evento' | 'libre';
  estado: 'pendiente' | 'completada';
  horaInicio: string;
  horaFin: string;
  durationMin: number;
  razon?: string | null;
  fuente: 'tarea' | 'agente';
}

function tareaToBlock(tarea: Tarea): ScheduleBlock | null {
  if (!tarea.due_at) return null;
  const due = new Date(tarea.due_at);
  const h = due.getHours();
  const m = due.getMinutes();
  if (h < START_HOUR || h >= START_HOUR + 16) return null;

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
    fuente: 'tarea',
  };
}

function bloquesDelDia(tareas: Tarea[], dayIndex: number): ScheduleBlock[] {
  return tareas
    .filter(t => {
      if (!t.due_at) return false;
      const d = new Date(t.due_at);
      const dow = d.getDay();
      const adjusted = dow === 0 ? 6 : dow - 1;
      return adjusted === dayIndex;
    })
    .map(tareaToBlock)
    .filter((b): b is ScheduleBlock => b !== null);
}


function TimelineBlock({ block }: { block: ScheduleBlock }) {
  const { theme } = useTheme();

  const tipoAccent: Record<string, string> = {
    tarea:  theme.secondary,
    habito: theme.success,
    evento: theme.primary,
    libre:  theme.textTertiary,
  };

  const blockColors = {
    pendiente:  { bg: block.fuente === 'agente' ? theme.primaryMuted : theme.surfaceElevated, border: block.fuente === 'agente' ? theme.primary + '40' : theme.border, text: block.fuente === 'agente' ? theme.primary : theme.textSecondary },
    completada: { bg: theme.successMuted, border: theme.success + '50', text: theme.success },
  };

  const top = (timeToMinutes(block.horaInicio) - START_HOUR * 60) * PX_PER_MIN;
  const height = Math.max(block.durationMin * PX_PER_MIN, 36);
  const scheme = blockColors[block.estado];

  return (
    <TouchableOpacity
      style={[styles.block, { top, height, borderColor: scheme.border, backgroundColor: scheme.bg }]}
      activeOpacity={0.8}
      onPress={() => {
        if (block.razon) Alert.alert(block.titulo, block.razon);
      }}
    >
      <View style={[styles.blockAccent, { backgroundColor: tipoAccent[block.tipo] ?? theme.textTertiary }]} />
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
  const { kairosToken } = useKairosToken();
  const { user } = useUser();
  const [selectedDay, setSelectedDay] = useState(adjustedToday);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const HOURS = Array.from({ length: 16 }, (_, i) => i + START_HOUR);

  const cargarTareas = useCallback(async () => {
    try {
      setError(null);
      if (!kairosToken) throw new Error('No hay sesión activa');
      const data = await listarTareas(kairosToken);
      setTareas(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar tareas');
    } finally {
      setLoading(false);
    }
  }, [kairosToken]);

  useEffect(() => { cargarTareas(); }, [cargarTareas]);

  const bloquesDelDiaActual = bloquesDelDia(tareas, selectedDay);
  const todosBloques = bloquesDelDiaActual;

  const completadas = todosBloques.filter(b => b.estado === 'completada').length;
  const pendientes = todosBloques.filter(b => b.estado === 'pendiente').length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Horario</Text>
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
            {todosBloques.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
                Sin actividades para este día
              </Text>
            ) : (
              todosBloques.map(block => <TimelineBlock key={block.id} block={block} />)
            )}

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
  generateBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radii.full, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    minWidth: 100, justifyContent: 'center',
  },
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
  emptyText: { textAlign: 'center', marginTop: spacing.xl, fontSize: typography.sm },
});