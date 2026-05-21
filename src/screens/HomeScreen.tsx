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
  Image,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/expo';
import { useKairosToken } from '../hooks/useKairosToken';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, radii, makeShadows } from '../styles/theme';
import { listarTareas, actualizarTarea, crearTarea, type EstadoTarea, type PrioridadTarea, type Tarea, type TipoTarea } from '../services/taskService';
import { listarNotificaciones } from '../services/notificationsService';
import NewTaskModal, { NuevaTarea } from '../components/NewTaskModal';
import NotificationsModal from '../components/NotificationsModal';
import UserManualModal from '../components/UserManualModal';

const TIPO_LABELS: Record<TipoTarea, string> = {
  tarea: 'Tarea',
  habito: 'Hábito',
  evento: 'Evento',
  libre: 'Libre',
};

const PRIORIDAD_LABELS: Record<PrioridadTarea, string> = {
  0: 'Baja',
  1: 'Media',
  2: 'Alta',
};

function getTaskEstado(task: Tarea): EstadoTarea {
  return task.estado ?? (task.completada ? 'completada' : 'pendiente');
}

function isTaskCompleted(task: Tarea) {
  return getTaskEstado(task) === 'completada';
}

function isTaskAbandoned(task: Tarea) {
  return getTaskEstado(task) === 'abandonada';
}

function formatTimeInput(date: Date) {
  const h = date.getHours();
  const m = date.getMinutes();
  return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`;
}

function parseTimeToISO(time: string, baseDate = new Date()) {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

function formatTaskTimeRange(task: Tarea) {
  const completedAt = task.completed_at ?? (isTaskCompleted(task) ? task.updated_at : null);
  if (!completedAt) return null;
  const end = new Date(completedAt);
  if (Number.isNaN(end.getTime())) return null;
  const start = task.started_at ? new Date(task.started_at) : new Date(end.getTime() - 30 * 60000);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return `${formatTimeInput(start)} – ${formatTimeInput(end)}`;
}

function showTaskDetails(task: Tarea) {
  const estado = getTaskEstado(task);
  if (estado === 'completada') {
    const completedAt = task.completed_at ?? task.updated_at;
    const end = completedAt ? new Date(completedAt) : null;
    const start = task.started_at
      ? new Date(task.started_at)
      : end && !Number.isNaN(end.getTime())
      ? new Date(end.getTime() - 30 * 60000)
      : null;
    Alert.alert(
      task.titulo,
      start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())
        ? `Inicio: ${formatTimeInput(start)}\nFin: ${formatTimeInput(end)}`
        : 'No hay horario registrado para esta tarea.'
    );
    return;
  }
  if (estado === 'abandonada') {
    Alert.alert(
      task.titulo,
      task.abandon_reason ? `Razón de abandono:\n${task.abandon_reason}` : 'No hay razón registrada para esta tarea.'
    );
  }
}


function TaskCard({ task, onEdit, onComplete, onAbandon }: {
  task: Tarea;
  onEdit: () => void;
  onComplete: () => void;
  onAbandon: () => void;
}) {
  const { theme } = useTheme();
  const estado = getTaskEstado(task);
  const completada = estado === 'completada';
  const abandonada = estado === 'abandonada';
  const tipo = task.tipo ?? 'libre';
  const prioridad = task.prioridad ?? 0;
  const statusConfig = {
    pendiente:  { label: 'Pendiente',  color: theme.warning, bg: theme.surfaceElevated },
    completada: { label: 'Completada', color: theme.success, bg: theme.successMuted },
    abandonada: { label: 'Abandonada', color: theme.error,   bg: theme.errorMuted },
  };
  const priorityColor = prioridad === 2 ? theme.error : prioridad === 1 ? theme.warning : theme.textSecondary;
  const status = statusConfig[estado];

  return (
    <View style={[styles.taskCard, { backgroundColor: theme.surface, borderColor: theme.border }, (completada || abandonada) && styles.taskCardDone]}>
      <TouchableOpacity
        style={styles.taskCardMain}
        onPress={() => showTaskDetails(task)}
        disabled={!completada && !abandonada}
        activeOpacity={0.75}
      >
        <View style={styles.taskCardHeader}>
          <View style={styles.taskCardLeft}>
            <View style={[styles.prioDot, { backgroundColor: completada ? theme.success : abandonada ? theme.error : priorityColor }]} />
            <Ionicons
              name={completada ? 'checkmark-circle' : abandonada ? 'close-circle' : 'square-outline'}
              size={18}
              color={completada ? theme.success : abandonada ? theme.error : theme.textSecondary}
              style={styles.taskIconStyle}
            />
            <View style={styles.taskInfo}>
              <Text style={[styles.taskTitle, { color: theme.textPrimary }, (completada || abandonada) && { textDecorationLine: 'line-through', color: theme.textTertiary }]}>
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
        </View>

        <View style={styles.taskMetaRow}>
          <View style={[styles.metaBadge, { backgroundColor: theme.primaryMuted, borderColor: theme.primary + '40' }]}>
            <Text style={[styles.metaText, { color: theme.primary }]}>{TIPO_LABELS[tipo]}</Text>
          </View>
          <View style={[styles.metaBadge, { backgroundColor: `${priorityColor}18`, borderColor: `${priorityColor}55` }]}>
            <Text style={[styles.metaText, { color: priorityColor }]}>Prioridad {PRIORIDAD_LABELS[prioridad]}</Text>
          </View>
          {formatTaskTimeRange(task) && (
            <View style={[styles.metaBadge, { backgroundColor: theme.successMuted, borderColor: theme.success + '55' }]}>
              <Text style={[styles.metaText, { color: theme.success }]}>Hecha {formatTaskTimeRange(task)}</Text>
            </View>
          )}
          {task.abandon_reason && (
            <View style={[styles.metaBadge, { backgroundColor: theme.errorMuted, borderColor: theme.error + '55' }]}>
              <Text style={[styles.metaText, { color: theme.error }]} numberOfLines={1}>
                {task.abandon_reason}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.taskActions}>
        <TouchableOpacity
          style={[styles.taskActionBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
          onPress={onEdit}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={15} color={theme.textSecondary} />
          <Text style={[styles.taskActionText, { color: theme.textSecondary }]}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.taskActionBtn, { backgroundColor: completada ? theme.surfaceElevated : theme.successMuted, borderColor: completada ? theme.border : theme.success + '50' }]}
          onPress={onComplete}
          disabled={completada}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle-outline" size={15} color={completada ? theme.textTertiary : theme.success} />
          <Text style={[styles.taskActionText, { color: completada ? theme.textTertiary : theme.success }]}>
            {completada ? 'Completada' : 'Completar'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.taskActionBtn, { backgroundColor: abandonada ? theme.errorMuted : theme.surfaceElevated, borderColor: theme.error + '40' }]}
          onPress={onAbandon}
          disabled={abandonada}
          activeOpacity={0.8}
        >
          <Ionicons name="close-circle-outline" size={15} color={theme.error} />
          <Text style={[styles.taskActionText, { color: theme.error }]}>{abandonada ? 'Abandonada' : 'Abandonar'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


function CompletionModal({ visible, task, startTime, endTime, error, onChangeStart, onChangeEnd, onClose, onSave }: {
  visible: boolean; task: Tarea | null; startTime: string; endTime: string; error: string;
  onChangeStart: (v: string) => void; onChangeEnd: (v: string) => void;
  onClose: () => void; onSave: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.centerModalWrapper}>
        <View style={[styles.actionModal, { backgroundColor: theme.bg, borderColor: theme.border }]}>
          <Text style={[styles.actionModalTitle, { color: theme.textPrimary }]}>Completar tarea</Text>
          <Text style={[styles.actionModalSub, { color: theme.textSecondary }]} numberOfLines={2}>{task?.titulo}</Text>
          <View style={styles.timeInputsRow}>
            <View style={styles.timeField}>
              <Text style={[styles.actionLabel, { color: theme.textSecondary }]}>Inicio aprox.</Text>
              <TextInput
                style={[styles.timeInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surfaceElevated }]}
                value={startTime} onChangeText={onChangeStart}
                placeholder="09:30" placeholderTextColor={theme.textTertiary}
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={styles.timeField}>
              <Text style={[styles.actionLabel, { color: theme.textSecondary }]}>Fin aprox.</Text>
              <TextInput
                style={[styles.timeInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surfaceElevated }]}
                value={endTime} onChangeText={onChangeEnd}
                placeholder="10:30" placeholderTextColor={theme.textTertiary}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>
          {error ? <Text style={[styles.actionError, { color: theme.error }]}>{error}</Text> : null}
          <View style={styles.actionModalButtons}>
            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: theme.border }]} onPress={onClose}>
              <Text style={[styles.secondaryBtnText, { color: theme.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.success }]} onPress={onSave}>
              <Text style={[styles.primaryBtnText, { color: theme.textInverse }]}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}


function AbandonModal({ visible, task, reason, error, onChangeReason, onClose, onSave }: {
  visible: boolean; task: Tarea | null; reason: string; error: string;
  onChangeReason: (v: string) => void; onClose: () => void; onSave: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.centerModalWrapper}>
        <View style={[styles.actionModal, { backgroundColor: theme.bg, borderColor: theme.border }]}>
          <Text style={[styles.actionModalTitle, { color: theme.textPrimary }]}>Abandonar tarea</Text>
          <Text style={[styles.actionModalSub, { color: theme.textSecondary }]} numberOfLines={2}>{task?.titulo}</Text>
          <Text style={[styles.actionLabel, { color: theme.textSecondary }]}>Razón</Text>
          <TextInput
            style={[styles.reasonInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surfaceElevated }]}
            value={reason} onChangeText={onChangeReason}
            placeholder="¿Por qué la abandonaste?" placeholderTextColor={theme.textTertiary}
            multiline textAlignVertical="top"
          />
          {error ? <Text style={[styles.actionError, { color: theme.error }]}>{error}</Text> : null}
          <View style={styles.actionModalButtons}>
            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: theme.border }]} onPress={onClose}>
              <Text style={[styles.secondaryBtnText, { color: theme.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.error }]} onPress={onSave}>
              <Text style={[styles.primaryBtnText, { color: theme.textInverse }]}>Abandonar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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

  const nombre = user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] ?? '';
  const inicial = nombre[0]?.toUpperCase() ?? '?';
  const fotoUrl = user?.imageUrl ?? null;

  const [filter, setFilter] = useState<'todas' | 'pendiente' | 'completada' | 'abandonada'>('todas');
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Tarea | null>(null);
  const [completingTask, setCompletingTask] = useState<Tarea | null>(null);
  const [completionStart, setCompletionStart] = useState('');
  const [completionEnd, setCompletionEnd] = useState('');
  const [completionError, setCompletionError] = useState('');
  const [abandoningTask, setAbandoningTask] = useState<Tarea | null>(null);
  const [abandonReason, setAbandonReason] = useState('');
  const [abandonError, setAbandonError] = useState('');
  const [showNotifs, setShowNotifs] = useState(false);
  const [notificaciones, setNotificaciones] = useState(0);
  const [showManual, setShowManual] = useState(false);

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
    if (showNotifs) cargarNotificacionesSinLeer();
  }, [showNotifs, cargarNotificacionesSinLeer]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') cargarNotificacionesSinLeer();
    });
    return () => subscription.remove();
  }, [cargarNotificacionesSinLeer]);

  useEffect(() => {
    const intervalId = setInterval(cargarNotificacionesSinLeer, 1000);
    return () => clearInterval(intervalId);
  }, [cargarNotificacionesSinLeer]);

  const openCompleteModal = (tarea: Tarea) => {
    const end = new Date();
    const start = new Date(end);
    start.setMinutes(start.getMinutes() - 30);
    setCompletingTask(tarea);
    setCompletionStart(formatTimeInput(start));
    setCompletionEnd(formatTimeInput(end));
    setCompletionError('');
  };

  const closeCompleteModal = () => {
    setCompletingTask(null);
    setCompletionStart('');
    setCompletionEnd('');
    setCompletionError('');
  };

  const handleComplete = async () => {
    try {
      if (!kairosToken || !completingTask) return;
      const startedAt = parseTimeToISO(completionStart);
      const completedAt = parseTimeToISO(completionEnd);
      if (!startedAt || !completedAt) {
        setCompletionError('Usa formato HH:MM, por ejemplo 09:30');
        return;
      }
      if (new Date(startedAt).getTime() > new Date(completedAt).getTime()) {
        setCompletionError('La hora de inicio debe ser antes que la de fin');
        return;
      }
      const actualizada = await actualizarTarea(kairosToken, completingTask.id_tarea, {
        completada: true, estado: 'completada', started_at: startedAt, completed_at: completedAt,
      });
      setTareas(prev => prev.map(t => t.id_tarea === actualizada.id_tarea ? {
        ...t, ...actualizada,
        started_at: actualizada.started_at ?? startedAt,
        completed_at: actualizada.completed_at ?? completedAt,
      } : t));
      closeCompleteModal();
    } catch (err: any) { Alert.alert('Error', err.message); }
  };

  const openAbandonModal = (tarea: Tarea) => {
    setAbandoningTask(tarea);
    setAbandonReason('');
    setAbandonError('');
  };

  const closeAbandonModal = () => {
    setAbandoningTask(null);
    setAbandonReason('');
    setAbandonError('');
  };

  const handleAbandon = async () => {
    try {
      if (!kairosToken || !abandoningTask) return;
      if (!abandonReason.trim()) {
        setAbandonError('Cuéntanos la razón para que el agente aprenda de esto');
        return;
      }
      const abandonedAt = new Date().toISOString();
      const reason = abandonReason.trim();
      const actualizada = await actualizarTarea(kairosToken, abandoningTask.id_tarea, {
        completada: false, estado: 'abandonada', abandoned_at: abandonedAt, abandon_reason: reason,
      });
      setTareas(prev => prev.map(t => t.id_tarea === actualizada.id_tarea ? {
        ...t, ...actualizada,
        abandoned_at: actualizada.abandoned_at ?? abandonedAt,
        abandon_reason: actualizada.abandon_reason ?? reason,
      } : t));
      closeAbandonModal();
    } catch (err: any) { Alert.alert('Error', err.message); }
  };

  const handleEdit = async (tarea: Tarea, cambios: NuevaTarea) => {
    try {
      if (!kairosToken) return;
      const actualizada = await actualizarTarea(kairosToken, tarea.id_tarea, cambios);
      setTareas(prev => prev.map(t => t.id_tarea === actualizada.id_tarea ? actualizada : t));
      setEditingTask(null);
    } catch (err: any) { throw err; }
  };

  const completadas = tareas.filter(isTaskCompleted).length;
  const total = tareas.length;
  const pendientes = tareas.filter(t => getTaskEstado(t) === 'pendiente').length;
  const progressPct = total > 0 ? Math.round((completadas / total) * 100) : 0;
  const hoy = new Date().toDateString();
  const completadasHoy = tareas.filter(t =>
    isTaskCompleted(t) && t.updated_at && new Date(t.updated_at).toDateString() === hoy
  ).length;

  const filtered = filter === 'todas'
    ? tareas
    : filter === 'completada' ? tareas.filter(isTaskCompleted)
    : filter === 'abandonada' ? tareas.filter(isTaskAbandoned)
    : tareas.filter(t => getTaskEstado(t) === 'pendiente');

  const FILTERS: Array<{ key: typeof filter; label: string }> = [
    { key: 'todas',      label: 'Todas' },
    { key: 'pendiente',  label: 'Pendientes' },
    { key: 'completada', label: 'Completadas' },
    { key: 'abandonada', label: 'Abandonadas' },
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
            {/* Manual */}
            <TouchableOpacity
              style={[styles.headerBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
              onPress={() => setShowManual(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="help-circle-outline" size={20} color={theme.textSecondary} />
            </TouchableOpacity>

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
              style={[styles.avatar, { borderColor: theme.primary }]}
              onPress={onAvatarPress}
              activeOpacity={0.8}
            >
              {fotoUrl ? (
                <Image source={{ uri: fotoUrl }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarInner, { backgroundColor: theme.primaryMuted }]}>
                  <Text style={[styles.avatarText, { color: theme.primary }]}>{inicial}</Text>
                </View>
              )}
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
                onEdit={() => setEditingTask(task)}
                onComplete={() => openCompleteModal(task)}
                onAbandon={() => openAbandonModal(task)}
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

      <NewTaskModal
        visible={!!editingTask}
        mode="edit"
        initialTask={editingTask}
        onClose={() => setEditingTask(null)}
        onSave={async (cambios: NuevaTarea) => {
          if (!editingTask) return;
          await handleEdit(editingTask, cambios);
        }}
      />

      <CompletionModal
        visible={!!completingTask}
        task={completingTask}
        startTime={completionStart}
        endTime={completionEnd}
        error={completionError}
        onChangeStart={v => { setCompletionStart(v); setCompletionError(''); }}
        onChangeEnd={v => { setCompletionEnd(v); setCompletionError(''); }}
        onClose={closeCompleteModal}
        onSave={handleComplete}
      />

      <AbandonModal
        visible={!!abandoningTask}
        task={abandoningTask}
        reason={abandonReason}
        error={abandonError}
        onChangeReason={v => { setAbandonReason(v); setAbandonError(''); }}
        onClose={closeAbandonModal}
        onSave={handleAbandon}
      />

      <NotificationsModal
        visible={showNotifs}
        onClose={() => {
          setShowNotifs(false);
          cargarNotificacionesSinLeer();
        }}
      />

      <UserManualModal
        visible={showManual}
        onClose={() => setShowManual(false)}
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

  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarInner: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
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

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.base },
  filterTab: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.full, borderWidth: 1 },
  filterText: { fontSize: typography.xs, fontWeight: typography.medium },

  taskList: { gap: spacing.sm },
  taskCard: { borderRadius: radii.lg, padding: spacing.base, borderWidth: 1, gap: spacing.md },
  taskCardDone: { opacity: 0.55 },
  taskCardMain: { gap: spacing.md },
  taskCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  taskCardLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  prioDot: { width: 6, height: 6, borderRadius: 3 },
  taskIconStyle: { marginRight: 2 },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: typography.base, fontWeight: typography.medium },
  taskDate: { fontSize: typography.xs, marginTop: 2 },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radii.full, marginLeft: spacing.sm },
  statusText: { fontSize: typography.xs, fontWeight: typography.semibold },
  taskMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  metaBadge: { borderWidth: 1, borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  metaText: { fontSize: typography.xs, fontWeight: typography.semibold },
  taskActions: { flexDirection: 'row', gap: spacing.xs },
  taskActionBtn: {
    flex: 1, minHeight: 36,
    borderRadius: radii.md, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 4, paddingHorizontal: spacing.xs,
  },
  taskActionText: { fontSize: typography.xs, fontWeight: typography.semibold },

  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000055' },
  centerModalWrapper: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
  actionModal: { borderRadius: radii.xl, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
  actionModalTitle: { fontSize: typography.lg, fontWeight: typography.bold },
  actionModalSub: { fontSize: typography.sm, lineHeight: 18 },
  actionLabel: { fontSize: typography.xs, fontWeight: typography.semibold, letterSpacing: 0.6, textTransform: 'uppercase' },
  timeInputsRow: { flexDirection: 'row', gap: spacing.md },
  timeField: { flex: 1, gap: spacing.xs },
  timeInput: { minHeight: 44, borderRadius: radii.md, borderWidth: 1, paddingHorizontal: spacing.md, fontSize: typography.base, fontWeight: typography.medium },
  reasonInput: { minHeight: 96, borderRadius: radii.md, borderWidth: 1, padding: spacing.md, fontSize: typography.base },
  actionError: { fontSize: typography.xs },
  actionModalButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  secondaryBtn: { flex: 1, minHeight: 44, borderRadius: radii.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { flex: 1, minHeight: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { fontSize: typography.sm, fontWeight: typography.semibold },
  primaryBtnText: { fontSize: typography.sm, fontWeight: typography.bold },

  errorBox: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.sm },
  errorText: { fontSize: typography.sm, textAlign: 'center' },
  retryText: { fontSize: typography.sm, fontWeight: typography.semibold },
  emptyText: { textAlign: 'center', marginTop: spacing.xl, fontSize: typography.sm },

  fab: { position: 'absolute', bottom: 80, right: spacing.xl, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});