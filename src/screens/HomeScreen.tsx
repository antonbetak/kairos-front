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
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/expo';
import { useKairosToken } from '../hooks/useKairosToken';
import { Image } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, radii, makeShadows } from '../styles/theme';
import { listarTareas, actualizarTarea, eliminarTarea, crearTarea, type Tarea } from '../services/taskService';
import { listarNotificaciones } from '../services/notificationsService';
import NewTaskModal, { NuevaTarea } from '../components/NewTaskModal';
import NotificationsModal from '../components/NotificationsModal';


function TaskCard({ task, onToggle, onDelete }: {
  task: Tarea;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { theme } = useTheme();
  const statusConfig = {
    false: { label: 'Pendiente', color: theme.textSecondary, bg: theme.surfaceElevated },
    true:  { label: 'Completada', color: theme.success, bg: theme.successMuted },
  };
  const status = statusConfig[String(task.completada) as 'false' | 'true'];

  return (
    <TouchableOpacity
      style={[styles.taskCard, { backgroundColor: theme.surface, borderColor: theme.border }, task.completada && styles.taskCardDone]}
      onPress={onToggle}
      onLongPress={() => Alert.alert('Eliminar tarea', `¿Eliminar "${task.titulo}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: onDelete },
      ])}
      activeOpacity={0.75}
    >
      <View style={styles.taskCardLeft}>
        <View style={[styles.prioDot, { backgroundColor: task.completada ? theme.success : theme.warning }]} />
        <Ionicons
          name={task.completada ? 'checkmark-circle' : 'square-outline'}
          size={18}
          color={task.completada ? theme.success : theme.textSecondary}
          style={styles.taskIcon}
        />
        <View style={styles.taskInfo}>
          <Text style={[styles.taskTitle, { color: theme.textPrimary }, task.completada && { textDecorationLine: 'line-through', color: theme.textTertiary }]}>
            {task.titulo}
          </Text>
          {task.descripcion && (
            <Text style={[styles.taskDate, { color: theme.textTertiary }]} numberOfLines={1}>
              {task.descripcion}
            </Text>
          )}
          {task.due_at && (
            <Text style={[styles.taskDate, { color: theme.textTertiary }]}>
              {new Date(task.due_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
      </View>
    </TouchableOpacity>
  );
}


function StatCard({ value, label, sublabel, accentColor, bgColor, borderColor }: {
  value: string; label: string; sublabel?: string;
  accentColor: string; bgColor: string; borderColor: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: bgColor, borderColor }]}>
      <Text style={[styles.statValue, { color: accentColor }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: accentColor }]}>{label}</Text>
      {sublabel && <Text style={[styles.statSublabel, { color: accentColor + '99' }]}>{sublabel}</Text>}
    </View>
  );
}


interface Props {
  onAvatarPress?: () => void;
}

export default function HomeScreen({ onAvatarPress }: Props) {
  const { theme } = useTheme();
  const shadows = makeShadows(theme.shadowColor);

  const { kairosToken } = useKairosToken();
  const { user } = useUser();

  // Nombre e inicial vienen directamente de Clerk (no del authStore)
  const nombre = user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] ?? '';
  const inicial = nombre[0]?.toUpperCase() ?? '?';

  const [filter, setFilter] = useState<'todas' | 'pendiente' | 'completada'>('todas');
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notificaciones, setNotificaciones] = useState(0);

  const today = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });


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

  const cargarNotificacionesSinLeer = useCallback(async () => {
    try {
      if (!kairosToken) return;
      const data = await listarNotificaciones(kairosToken);
      setNotificaciones(data.filter(n => !n.leida).length);
    } catch {
      setNotificaciones(0);
    }
  }, [kairosToken]);

  useEffect(() => {
    cargarTareas();
    cargarNotificacionesSinLeer();
  }, [cargarTareas, cargarNotificacionesSinLeer]);

  useEffect(() => {
    if (showNotifs) {
      cargarNotificacionesSinLeer();
    }
  }, [showNotifs, cargarNotificacionesSinLeer]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        cargarNotificacionesSinLeer();
      }
    });
    return () => subscription.remove();
  }, [cargarNotificacionesSinLeer]);

  useEffect(() => {
    const intervalId = setInterval(cargarNotificacionesSinLeer, 1000);
    return () => clearInterval(intervalId);
  }, [cargarNotificacionesSinLeer]);

  const handleToggle = async (tarea: Tarea) => {
    try {
      if (!kairosToken) return;
      const actualizada = await actualizarTarea(kairosToken, tarea.id_tarea, { completada: !tarea.completada });
      setTareas(prev => prev.map(t => t.id_tarea === actualizada.id_tarea ? actualizada : t));
    } catch (err: any) { Alert.alert('Error', err.message); }
  };

  const handleDelete = async (id: string) => {
    try {
      if (!kairosToken) return;
      await eliminarTarea(kairosToken, id);
      setTareas(prev => prev.filter(t => t.id_tarea !== id));
    } catch (err: any) { Alert.alert('Error', err.message); }
  };

  const completadas = tareas.filter(t => t.completada).length;
  const total = tareas.length;
  const pendientes = total - completadas;
  const progressPct = total > 0 ? Math.round((completadas / total) * 100) : 0;
  const hoy = new Date().toDateString();
  const completadasHoy = tareas.filter(t =>
    t.completada && t.updated_at && new Date(t.updated_at).toDateString() === hoy
  ).length;

  const filtered = filter === 'todas'
    ? tareas
    : filter === 'completada'
    ? tareas.filter(t => t.completada)
    : tareas.filter(t => !t.completada);

  const FILTERS: Array<{ key: typeof filter; label: string }> = [
    { key: 'todas',      label: 'Todas' },
    { key: 'pendiente',  label: 'Pendientes' },
    { key: 'completada', label: 'Completadas' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: theme.textPrimary }]}>Hola, {nombre || '…'}</Text>
            <Text style={[styles.dateText, { color: theme.textSecondary }]}>{today}</Text>
          </View>
          <View style={styles.headerButtons}>
            {/* Notificaciones */}
            <TouchableOpacity
              style={[styles.headerBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
              onPress={() => setShowNotifs(true)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={notificaciones > 0 ? 'notifications' : 'notifications-outline'}
                size={20}
                color={theme.textSecondary}
              />
              {notificaciones > 0 && (
                <View style={[styles.notifBadge, { backgroundColor: theme.error }]}>
                  <Text style={[styles.notifBadgeText, { color: theme.textInverse }]}>
                    {notificaciones > 9 ? '9+' : notificaciones}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Avatar */}
            <TouchableOpacity
              style={[styles.avatar, { backgroundColor: theme.primaryMuted, borderColor: theme.primary }]}
              onPress={onAvatarPress}
              activeOpacity={0.8}
            >
              <Text style={[styles.avatarText, { color: theme.primary }]}>{inicial}</Text>
            </TouchableOpacity>
          </View>
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

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard
            value={`${completadasHoy}`}
            label={completadasHoy === 1 ? 'tarea hoy' : 'tareas hoy'}
            sublabel={completadasHoy > 0 ? '¡sigue así!' : 'empieza el día'}
            accentColor={theme.warning}
            bgColor={theme.primaryMuted}
            borderColor={theme.warning + '40'}
          />
          <StatCard
            value={`${progressPct}%`}
            label="completado"
            sublabel={`${pendientes} pendiente${pendientes !== 1 ? 's' : ''}`}
            accentColor={theme.primary}
            bgColor={theme.primaryMuted}
            borderColor={theme.primary + '40'}
          />
        </View>

        {/* Tasks section */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Tareas</Text>

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
              <Text style={[styles.filterText, { color: filter === f.key ? theme.primary : theme.textSecondary }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Task list */}
        {loading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: spacing.xl }} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
            <TouchableOpacity onPress={cargarTareas}>
              <Text style={[styles.retryText, { color: theme.primary }]}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
            {filter === 'todas' ? 'No tienes tareas aún' : 'Sin tareas en esta categoría'}
          </Text>
        ) : (
          <View style={styles.taskList}>
            {filtered.map(task => (
              <TaskCard
                key={task.id_tarea}
                task={task}
                onToggle={() => handleToggle(task)}
                onDelete={() => handleDelete(task.id_tarea)}
              />
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }, shadows.glow]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={theme.textInverse} />
      </TouchableOpacity>

      {/* Modals */}
      <NewTaskModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={async (nueva: NuevaTarea) => {
          if (!kairosToken) throw new Error('No hay sesión activa');
          const creada = await crearTarea(kairosToken, nueva);
          setTareas(prev => [creada, ...prev]);
          setModalVisible(false);
        }}
      />

      <NotificationsModal
        visible={showNotifs}
        onClose={() => {
          setShowNotifs(false);
          cargarNotificacionesSinLeer();
        }}
      />

    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.base, paddingTop: spacing.md },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xl },
  greeting: { fontSize: typography.xxl, fontWeight: typography.bold },
  dateText: { fontSize: typography.sm, marginTop: spacing.xs, textTransform: 'capitalize' },

  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerBtn: {
    width: 42, height: 42,
    borderRadius: 21,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: -2, right: -2,
    minWidth: 16, height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: { fontSize: 9, fontWeight: typography.bold },

  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: typography.lg, fontWeight: typography.bold },

  progressSection: { marginBottom: spacing.xl },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  progressLabel: { fontSize: typography.sm, fontWeight: typography.medium },
  progressPct: { fontSize: typography.sm, fontWeight: typography.bold },
  progressTrack: { height: 6, borderRadius: radii.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radii.full },

  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  statCard: { flex: 1, borderRadius: radii.xl, padding: spacing.lg, borderWidth: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: typography.xxxl, fontWeight: typography.extrabold, lineHeight: typography.xxxl + 4 },
  statLabel: { fontSize: typography.sm, fontWeight: typography.semibold, textAlign: 'center' },
  statSublabel: { fontSize: typography.xs, textAlign: 'center', marginTop: 2 },

  sectionTitle: { fontSize: typography.lg, fontWeight: typography.bold, marginBottom: spacing.md },

  filterRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base },
  filterTab: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.full, borderWidth: 1 },
  filterText: { fontSize: typography.xs, fontWeight: typography.medium },

  taskList: { gap: spacing.sm },
  taskCard: { borderRadius: radii.lg, padding: spacing.base, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  taskCardDone: { opacity: 0.55 },
  taskCardLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  prioDot: { width: 6, height: 6, borderRadius: 3 },
  taskIcon: { fontSize: 16 },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: typography.base, fontWeight: typography.medium },
  taskDate: { fontSize: typography.xs, marginTop: 2 },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radii.full, marginLeft: spacing.sm },
  statusText: { fontSize: typography.xs, fontWeight: typography.semibold },

  errorBox: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.sm },
  errorText: { fontSize: typography.sm, textAlign: 'center' },
  retryText: { fontSize: typography.sm, fontWeight: typography.semibold },
  emptyText: { textAlign: 'center', marginTop: spacing.xl, fontSize: typography.sm },

  fab: { position: 'absolute', bottom: 80, right: spacing.xl, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  fabText: { fontSize: 28, fontWeight: typography.light, lineHeight: 32 },
});