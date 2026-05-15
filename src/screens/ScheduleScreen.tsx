import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, radii } from '../styles/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScheduleBlock {
  id: string;
  titulo: string;
  tipo: 'tarea' | 'habito' | 'evento' | 'libre';
  estado: 'pendiente' | 'en_progreso' | 'completada' | 'abandonada';
  horaInicio: string;
  horaFin: string;
  durationMin: number;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_BLOCKS: ScheduleBlock[] = [
  { id: '1', titulo: 'Meditación',            tipo: 'habito', estado: 'completada',   horaInicio: '07:00', horaFin: '07:15', durationMin: 15 },
  { id: '2', titulo: 'Ejercicio matutino',    tipo: 'habito', estado: 'completada',   horaInicio: '07:30', horaFin: '08:15', durationMin: 45 },
  { id: '3', titulo: 'Daily standup',         tipo: 'evento', estado: 'en_progreso',  horaInicio: '10:00', horaFin: '10:30', durationMin: 30 },
  { id: '4', titulo: 'Revisar arquitectura',  tipo: 'tarea',  estado: 'en_progreso',  horaInicio: '11:00', horaFin: '13:00', durationMin: 120 },
  { id: '5', titulo: 'Almuerzo',              tipo: 'libre',  estado: 'pendiente',    horaInicio: '14:00', horaFin: '15:00', durationMin: 60 },
  { id: '6', titulo: 'Implementar auth_service', tipo: 'tarea', estado: 'pendiente', horaInicio: '15:00', horaFin: '17:30', durationMin: 150 },
  { id: '7', titulo: 'Leer RabbitMQ docs',    tipo: 'tarea',  estado: 'pendiente',    horaInicio: '18:00', horaFin: '19:00', durationMin: 60 },
];

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

// ─── Timeline Block ───────────────────────────────────────────────────────────

function TimelineBlock({ block }: { block: ScheduleBlock }) {
  const { theme } = useTheme();

  const blockColors = {
    pendiente:   { bg: theme.surfaceElevated, border: theme.border,            text: theme.textSecondary },
    en_progreso: { bg: theme.primaryMuted,    border: theme.primary + '60',    text: theme.primary },
    completada:  { bg: theme.successMuted,    border: theme.success + '50',    text: theme.success },
    abandonada:  { bg: theme.errorMuted,      border: theme.error + '40',      text: theme.error },
  };

  const tipoAccent: Record<string, string> = {
    tarea:  theme.secondary,
    habito: theme.success,
    evento: theme.primary,
    libre:  theme.textTertiary,
  };

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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ScheduleScreen() {
  const { theme } = useTheme();
  const [selectedDay, setSelectedDay] = useState(adjustedToday);
  const HOURS = Array.from({ length: 16 }, (_, i) => i + START_HOUR);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Horario</Text>
        <TouchableOpacity style={[styles.generateBtn, { backgroundColor: theme.primaryMuted, borderColor: theme.primary + '50' }]}>
          <Text style={[styles.generateBtnText, { color: theme.primary }]}>✦ Generar</Text>
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
          <Text style={[styles.summaryText, { color: theme.textTertiary }]}>2 completadas</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: theme.primary }]} />
          <Text style={[styles.summaryText, { color: theme.textTertiary }]}>1 en progreso</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: theme.textTertiary }]} />
          <Text style={[styles.summaryText, { color: theme.textTertiary }]}>4 pendientes</Text>
        </View>
      </View>

      {/* Timeline */}
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
          {MOCK_BLOCKS.map(block => (
            <TimelineBlock key={block.id} block={block} />
          ))}

          {/* Current time indicator */}
          <View style={[styles.nowLine, {
            top: (new Date().getHours() * 60 + new Date().getMinutes() - START_HOUR * 60) * PX_PER_MIN,
          }]}>
            <View style={[styles.nowDot, { backgroundColor: theme.error }]} />
            <View style={[styles.nowBar, { backgroundColor: theme.error }]} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  generateBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  generateBtnText: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    letterSpacing: 0.3,
  },

  daySelector: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    gap: spacing.xs,
    marginBottom: spacing.base,
  },
  dayTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  dayLabel: {
    fontSize: typography.xs,
    fontWeight: typography.medium,
  },
  dayLabelActive: {
    fontWeight: typography.bold,
  },
  todayDot: {
    width: 4, height: 4,
    borderRadius: 2,
    marginTop: 2,
  },

  summaryStrip: {
    flexDirection: 'row',
    gap: spacing.base,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.base,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryDot: {
    width: 6, height: 6,
    borderRadius: 3,
  },
  summaryText: { fontSize: typography.xs },

  timeline: { flex: 1 },
  timelineContent: {
    position: 'relative',
    paddingBottom: spacing.xxl,
  },
  hourRow: {
    position: 'absolute',
    left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    height: HOUR_HEIGHT,
  },
  hourLabel: {
    width: HOUR_COL,
    fontSize: typography.xs,
    textAlign: 'right',
    paddingRight: spacing.md,
  },
  hourLine: {
    flex: 1,
    height: 1,
    marginRight: spacing.base,
  },

  blocksColumn: {
    position: 'relative',
    marginLeft: HOUR_COL + spacing.md,
    marginRight: spacing.base,
  },
  block: {
    position: 'absolute',
    left: 0, right: 0,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  blockAccent: { width: 3 },
  blockContent: {
    flex: 1,
    padding: spacing.sm,
    justifyContent: 'center',
  },
  blockTitle: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
  },
  blockTitleSm: { fontSize: typography.xs },
  blockTime: {
    fontSize: typography.xs,
    marginTop: 2,
  },

  nowLine: {
    position: 'absolute',
    left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  nowDot: {
    width: 8, height: 8,
    borderRadius: 4,
  },
  nowBar: {
    flex: 1,
    height: 1,
    opacity: 0.6,
  },
});