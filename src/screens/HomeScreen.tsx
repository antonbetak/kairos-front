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
import { typography, spacing, radii, makeShadows } from '../styles/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskStatus = 'pendiente' | 'en_progreso' | 'completada' | 'abandonada';
type TaskPriority = 'alta' | 'media' | 'baja';

interface Task {
  id: string;
  titulo: string;
  tipo: 'tarea' | 'habito' | 'evento';
  estado: TaskStatus;
  prioridad: TaskPriority;
  fecha_fin?: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_TASKS: Task[] = [
  { id: '1', titulo: 'Revisar arquitectura de microservicios', tipo: 'tarea', estado: 'en_progreso', prioridad: 'alta', fecha_fin: 'Hoy, 18:00' },
  { id: '2', titulo: 'Ejercicio matutino — 30 min', tipo: 'habito', estado: 'completada', prioridad: 'media' },
  { id: '3', titulo: 'Leer documentación de RabbitMQ', tipo: 'tarea', estado: 'pendiente', prioridad: 'media', fecha_fin: 'Mañana' },
  { id: '4', titulo: 'Daily standup con equipo', tipo: 'evento', estado: 'pendiente', prioridad: 'alta', fecha_fin: 'Hoy, 10:00' },
  { id: '5', titulo: 'Meditación 10 min', tipo: 'habito', estado: 'pendiente', prioridad: 'baja' },
  { id: '6', titulo: 'Escribir pruebas del auth_service', tipo: 'tarea', estado: 'pendiente', prioridad: 'alta', fecha_fin: 'Vie, 23:59' },
];

const tipoIcon: Record<string, string> = {
  tarea: '⬜',
  habito: '🔄',
  evento: '📅',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function TaskCard({ task, onPress }: { task: Task; onPress: () => void }) {
  const { theme } = useTheme();

  const statusConfig = {
    pendiente:   { label: 'Pendiente',   color: theme.textSecondary, bg: theme.surfaceElevated },
    en_progreso: { label: 'En progreso', color: theme.primary,       bg: theme.primaryMuted },
    completada:  { label: 'Completada',  color: theme.success,       bg: theme.successMuted },
    abandonada:  { label: 'Abandonada',  color: theme.error,         bg: theme.errorMuted },
  };

  const prioridadDot: Record<TaskPriority, string> = {
    alta:  theme.error,
    media: theme.warning,
    baja:  theme.success,
  };

  const status = statusConfig[task.estado];

  return (
    <TouchableOpacity
      style={[
        styles.taskCard,
        { backgroundColor: theme.surface, borderColor: theme.border },
        task.estado === 'completada' && styles.taskCardDone,
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.taskCardLeft}>
        <View style={[styles.prioDot, { backgroundColor: prioridadDot[task.prioridad] }]} />
        <Text style={styles.taskIcon}>{tipoIcon[task.tipo]}</Text>
        <View style={styles.taskInfo}>
          <Text style={[
            styles.taskTitle,
            { color: theme.textPrimary },
            task.estado === 'completada' && { textDecorationLine: 'line-through', color: theme.textTertiary },
          ]}>
            {task.titulo}
          </Text>
          {task.fecha_fin && (
            <Text style={[styles.taskDate, { color: theme.textTertiary }]}>⏰ {task.fecha_fin}</Text>
          )}
        </View>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
      </View>
    </TouchableOpacity>
  );
}

function MetricCard({ label, value, unit, accentColor, bgColor, borderColor }: {
  label: string;
  value: string | number;
  unit?: string;
  accentColor: string;
  bgColor: string;
  borderColor: string;
}) {
  return (
    <View style={[styles.metricCard, { backgroundColor: bgColor, borderColor }]}>
      <Text style={[styles.metricValue, { color: accentColor }]}>{value}</Text>
      {unit && <Text style={[styles.metricUnit, { color: accentColor + '99' }]}>{unit}</Text>}
      <Text style={[styles.metricLabel, { color: accentColor + 'BB' }]}>{label}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

interface Props {
  onAddTask?: () => void;
  onTaskPress?: (task: Task) => void;
}

export default function HomeScreen({ onAddTask, onTaskPress }: Props) {
  const { theme } = useTheme();
  const shadows = makeShadows(theme.shadowColor);
  const [filter, setFilter] = useState<'todas' | 'pendiente' | 'completada'>('todas');

  const today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const completedToday = MOCK_TASKS.filter(t => t.estado === 'completada').length;
  const totalToday = MOCK_TASKS.length;
  const progressPct = Math.round((completedToday / totalToday) * 100);

  const filtered = filter === 'todas'
    ? MOCK_TASKS
    : MOCK_TASKS.filter(t => t.estado === filter);

  const FILTERS: Array<{ key: typeof filter; label: string }> = [
    { key: 'todas',      label: 'Todas' },
    { key: 'pendiente',  label: 'Pendientes' },
    { key: 'completada', label: 'Completadas' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.textPrimary }]}>Buenos días ☀️</Text>
            <Text style={[styles.dateText, { color: theme.textSecondary }]}>{today}</Text>
          </View>
          <TouchableOpacity style={[styles.avatar, { backgroundColor: theme.primaryMuted, borderColor: theme.primary }]}>
            <Text style={[styles.avatarText, { color: theme.primary }]}>A</Text>
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>Progreso del día</Text>
            <Text style={[styles.progressPct, { color: theme.primary }]}>{progressPct}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: theme.surfaceElevated }]}>
            <View style={[styles.progressFill, { width: `${progressPct}%` as any, backgroundColor: theme.primary }]} />
          </View>
        </View>

        {/* Metrics */}
        <View style={styles.metricsRow}>
          <MetricCard
            label="Completadas"
            value={`${completedToday}/${totalToday}`}
            accentColor={theme.success}
            bgColor={theme.successMuted}
            borderColor={theme.success + '40'}
          />
          <MetricCard
            label="Racha activa"
            value={7}
            unit="días"
            accentColor={theme.primary}
            bgColor={theme.primaryMuted}
            borderColor={theme.primary + '40'}
          />
          <MetricCard
            label="Tiempo hoy"
            value="3.5"
            unit="hrs"
            accentColor={theme.secondary}
            bgColor={theme.secondaryMuted}
            borderColor={theme.secondary + '40'}
          />
        </View>

        {/* Agent suggestion */}
        <TouchableOpacity
          style={[styles.agentCard, { backgroundColor: theme.surface, borderColor: theme.primary + '40' }]}
          activeOpacity={0.85}
        >
          <View style={[styles.agentIcon, { backgroundColor: theme.primaryMuted }]}>
            <Text style={[styles.agentIconText, { color: theme.primary }]}>✦</Text>
          </View>
          <View style={styles.agentText}>
            <Text style={[styles.agentTitle, { color: theme.primary }]}>Sugerencia de Kairos</Text>
            <Text style={[styles.agentBody, { color: theme.textSecondary }]}>
              Tu productividad es más alta entre 9–11 am. Tienes 2 tareas de alta prioridad sin iniciar.
            </Text>
          </View>
        </TouchableOpacity>

        {/* Tasks section */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Actividades</Text>

        {/* Filter tabs */}
        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterTab,
                { backgroundColor: theme.surface, borderColor: theme.border },
                filter === f.key && { backgroundColor: theme.primaryMuted, borderColor: theme.primary + '50' },
              ]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[
                styles.filterText,
                { color: filter === f.key ? theme.primary : theme.textSecondary },
              ]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Task list */}
        <View style={styles.taskList}>
          {filtered.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onPress={() => onTaskPress?.(task)}
            />
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }, shadows.glow]}
        onPress={onAddTask}
        activeOpacity={0.85}
      >
        <Text style={[styles.fabText, { color: theme.textInverse }]}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  greeting: {
    fontSize: typography.xxl,
    fontWeight: typography.bold,
  },
  dateText: {
    fontSize: typography.sm,
    marginTop: spacing.xs,
    textTransform: 'capitalize',
  },
  avatar: {
    width: 40, height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.base,
    fontWeight: typography.bold,
  },

  progressSection: { marginBottom: spacing.xl },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
  },
  progressPct: {
    fontSize: typography.sm,
    fontWeight: typography.bold,
  },
  progressTrack: {
    height: 4,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.full,
  },

  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  metricCard: {
    flex: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
  },
  metricUnit: {
    fontSize: typography.xs,
    marginTop: 1,
  },
  metricLabel: {
    fontSize: typography.xs,
    marginTop: spacing.xs,
    textAlign: 'center',
  },

  agentCard: {
    borderRadius: radii.lg,
    padding: spacing.base,
    borderWidth: 1,
    marginBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  agentIcon: {
    width: 32, height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentIconText: { fontSize: 16 },
  agentText: { flex: 1 },
  agentTitle: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    marginBottom: spacing.xs,
  },
  agentBody: {
    fontSize: typography.sm,
    lineHeight: 18,
  },

  sectionTitle: {
    fontSize: typography.lg,
    fontWeight: typography.bold,
    marginBottom: spacing.md,
  },

  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  filterText: {
    fontSize: typography.xs,
    fontWeight: typography.medium,
  },

  taskList: { gap: spacing.sm },
  taskCard: {
    borderRadius: radii.lg,
    padding: spacing.base,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskCardDone: { opacity: 0.55 },
  taskCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  prioDot: {
    width: 6, height: 6,
    borderRadius: 3,
  },
  taskIcon: { fontSize: 16 },
  taskInfo: { flex: 1 },
  taskTitle: {
    fontSize: typography.base,
    fontWeight: typography.medium,
  },
  taskDate: {
    fontSize: typography.xs,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
    marginLeft: spacing.sm,
  },
  statusText: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
  },

  fab: {
    position: 'absolute',
    bottom: 80,
    right: spacing.xl,
    width: 56, height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: {
    fontSize: 28,
    fontWeight: typography.light,
    lineHeight: 32,
  },
});