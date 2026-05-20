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
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, radii } from '../styles/theme';
import { listarTareas, type Tarea } from '../services/taskService';
import {
  generarHorario,
  listarBloques,
  aceptarBloque,
  rechazarBloque,
  type BloqueHorario,
} from '../services/scheduleService';
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

function fechaToHora(fecha: string): string {
  const d = new Date(fecha);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`;
}

function fechaToDayIndex(fecha: string): number {
  const d = new Date(fecha);
  const dow = d.getDay();
  return dow === 0 ? 6 : dow - 1;
}

function formatFechaParam(dayIndex: number): string {
  const today = new Date();
  const diff = dayIndex - adjustedToday;
  const target = new Date(today);
  target.setDate(today.getDate() + diff);
  return target.toISOString().split('T')[0];
}


interface ScheduleBlock {
  id: string;
  titulo: string;
  tipo: 'tarea' | 'habito' | 'evento' | 'libre';
  estado: 'pendiente' | 'completada' | 'propuesto';
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

function apiToBlock(bloque: BloqueHorario): ScheduleBlock {
  const horaInicio = fechaToHora(bloque.fecha_inicio);
  const horaFin = fechaToHora(bloque.fecha_fin);
  const ini = new Date(bloque.fecha_inicio);
  const fin = new Date(bloque.fecha_fin);
  const durationMin = Math.round((fin.getTime() - ini.getTime()) / 60000);

  return {
    id: bloque.id,
    titulo: bloque.titulo,
    tipo: bloque.tipo,
    estado: bloque.estado,
    horaInicio,
    horaFin,
    durationMin,
    razon: bloque.razon,
    fuente: 'agente',
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


interface TimelineBlockProps {
  block: ScheduleBlock;
  onAceptar?: (id: string) => void;
  onRechazar?: (id: string) => void;
}

function TimelineBlock({ block, onAceptar, onRechazar }: TimelineBlockProps) {
  const { theme } = useTheme();

  const tipoAccent: Record<string, string> = {
    tarea:  theme.secondary,
    habito: theme.success,
    evento: theme.primary,
    libre:  theme.textTertiary,
  };

  const isPropuesto = block.estado === 'propuesto';

  const blockColors = {
    pendiente:  {
      bg: block.fuente === 'agente' ? theme.primaryMuted : theme.surfaceElevated,
      border: block.fuente === 'agente' ? theme.primary + '40' : theme.border,
      text: block.fuente === 'agente' ? theme.primary : theme.textSecondary,
    },
    completada: {
      bg: theme.successMuted,
      border: theme.success + '50',
      text: theme.success,
    },
    propuesto: {
      bg: theme.primaryMuted + 'AA',
      border: theme.primary + '60',
      text: theme.primary,
    },
  };

  const top = (timeToMinutes(block.horaInicio) - START_HOUR * 60) * PX_PER_MIN;
  const height = Math.max(block.durationMin * PX_PER_MIN, isPropuesto ? 64 : 36);
  const scheme = blockColors[block.estado];

  return (
    <TouchableOpacity
      style={[
        styles.block,
        {
          top,
          height,
          borderColor: scheme.border,
          backgroundColor: scheme.bg,
          borderStyle: isPropuesto ? 'dashed' : 'solid',
          borderWidth: isPropuesto ? 1.5 : 1,
        },
      ]}
      activeOpacity={0.8}
      onPress={() => {
        if (block.razon) Alert.alert(block.titulo, block.razon);
      }}
    >
      <View style={[styles.blockAccent, { backgroundColor: tipoAccent[block.tipo] ?? theme.textTertiary }]} />
      <View style={styles.blockContent}>
        <Text
          style={[styles.blockTitle, { color: scheme.text }, height < 48 && styles.blockTitleSm]}
          numberOfLines={1}
        >
          {block.titulo}
        </Text>
        {height >= 48 && (
          <Text style={[styles.blockTime, { color: theme.textTertiary }]}>
            {block.horaInicio} – {block.horaFin}
          </Text>
        )}

        {/* Botones aceptar / rechazar solo en propuesto */}
        {isPropuesto && onAceptar && onRechazar && (
          <View style={styles.propuestoBtns}>
            <TouchableOpacity
              style={[styles.propuestoBtn, { backgroundColor: theme.success + '22', borderColor: theme.success + '60' }]}
              onPress={() => onAceptar(block.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="checkmark" size={14} color={theme.success} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.propuestoBtn, { backgroundColor: theme.error + '22', borderColor: theme.error + '60' }]}
              onPress={() => onRechazar(block.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={14} color={theme.error} />
            </TouchableOpacity>
          </View>
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
  const [bloquesAgente, setBloquesAgente] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
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

  const cargarBloquesAgente = useCallback(async (dayIndex: number) => {
    try {
      if (!kairosToken) return;
      const fecha = formatFechaParam(dayIndex);
      const data = await listarBloques(kairosToken, fecha);
      setBloquesAgente(data.map(apiToBlock));
    } catch {
      setBloquesAgente([]);
    }
  }, [kairosToken]);

  useEffect(() => { cargarTareas(); }, [cargarTareas]);
  useEffect(() => { cargarBloquesAgente(selectedDay); }, [selectedDay, cargarBloquesAgente]);

  const handleGenerar = async () => {
    if (!kairosToken) return;
    try {
      setGenerating(true);
      const fecha = formatFechaParam(selectedDay);
      const data = await generarHorario(kairosToken, fecha);
      setBloquesAgente(data.map(apiToBlock));
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo generar el horario. Intenta de nuevo.');
    } finally {
      setGenerating(false);
    }
  };

  const handleAceptar = async (id: string) => {
    if (!kairosToken) return;
    try {
      const actualizado = await aceptarBloque(kairosToken, id);
      setBloquesAgente(prev =>
        prev.map(b => b.id === id ? { ...b, estado: 'pendiente' as const } : b)
      );
    } catch {
      Alert.alert('Error', 'No se pudo aceptar el bloque.');
    }
  };

  const handleRechazar = async (id: string) => {
    if (!kairosToken) return;
    try {
      await rechazarBloque(kairosToken, id);
      setBloquesAgente(prev => prev.filter(b => b.id !== id));
    } catch {
      Alert.alert('Error', 'No se pudo rechazar el bloque.');
    }
  };

  const handleAceptarTodos = async () => {
    if (!kairosToken) return;
    const propuestos = bloquesAgente.filter(b => b.estado === 'propuesto');
    try {
      await Promise.all(propuestos.map(b => aceptarBloque(kairosToken, b.id)));
      setBloquesAgente(prev =>
        prev.map(b => b.estado === 'propuesto' ? { ...b, estado: 'pendiente' as const } : b)
      );
    } catch {
      Alert.alert('Error', 'No se pudieron aceptar todos los bloques.');
    }
  };

  const bloquesDelDiaActual = bloquesDelDia(tareas, selectedDay);
  const todosLosBloques = [...bloquesDelDiaActual, ...bloquesAgente];
  const hayPropuestos = bloquesAgente.some(b => b.estado === 'propuesto');

  const completadas = todosLosBloques.filter(b => b.estado === 'completada').length;
  const pendientes = todosLosBloques.filter(b => b.estado === 'pendiente').length;
  const propuestos = todosLosBloques.filter(b => b.estado === 'propuesto').length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Horario</Text>
        <View style={styles.headerRight}>
          {hayPropuestos && (
            <TouchableOpacity
              style={[styles.aceptarTodosBtn, { borderColor: theme.success + '60', backgroundColor: theme.success + '15' }]}
              onPress={handleAceptarTodos}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-done" size={14} color={theme.success} />
              <Text style={[styles.aceptarTodosBtnText, { color: theme.success }]}>Aceptar todos</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.generateBtn, { borderColor: theme.primary + '60', backgroundColor: theme.primaryMuted }]}
            onPress={handleGenerar}
            disabled={generating}
            activeOpacity={0.8}
          >
            {generating ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Ionicons name="sparkles-outline" size={14} color={theme.primary} />
            )}
            <Text style={[styles.generateBtnText, { color: theme.primary }]}>
              {generating ? 'Generando…' : 'Generar'}
            </Text>
          </TouchableOpacity>
        </View>
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
              <View style={[styles.todayDot, { backgroundColor: selectedDay === i ? theme.primary : theme.textTertiary }]} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary strip */}
      <View style={styles.summaryStrip}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: theme.success }]} />
          <Text style={[styles.summaryText, { color: theme.textSecondary }]}>{completadas} completadas</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: theme.secondary }]} />
          <Text style={[styles.summaryText, { color: theme.textSecondary }]}>{pendientes} pendientes</Text>
        </View>
        {propuestos > 0 && (
          <View style={styles.summaryItem}>
            <View style={[styles.summaryDot, { backgroundColor: theme.primary }]} />
            <Text style={[styles.summaryText, { color: theme.primary }]}>{propuestos} propuestos</Text>
          </View>
        )}
      </View>

      {/* Timeline */}
      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={theme.primary} />
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
            {todosLosBloques.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
                Sin actividades para este día
              </Text>
            ) : (
              todosLosBloques.map(block => (
                <TimelineBlock
                  key={block.id}
                  block={block}
                  onAceptar={block.estado === 'propuesto' ? handleAceptar : undefined}
                  onRechazar={block.estado === 'propuesto' ? handleRechazar : undefined}
                />
              ))
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },

  generateBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radii.full, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    minWidth: 100, justifyContent: 'center',
  },
  generateBtnText: { fontSize: typography.sm, fontWeight: typography.semibold, letterSpacing: 0.3 },

  aceptarTodosBtn: {
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderRadius: radii.full, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
  },
  aceptarTodosBtnText: { fontSize: typography.xs, fontWeight: typography.semibold },

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
  hourLabel: { width: HOUR_COL, fontSize: typography.xs, textAlign: 'right', paddingRight: spacing.sm },
  hourLine: { flex: 1, height: StyleSheet.hairlineWidth },

  blocksColumn: { position: 'absolute', left: HOUR_COL + spacing.sm, right: spacing.base },

  block: {
    position: 'absolute', left: 0, right: 0,
    borderRadius: radii.md, borderWidth: 1,
    flexDirection: 'row', overflow: 'hidden',
  },
  blockAccent: { width: 3, borderRadius: 2 },
  blockContent: { flex: 1, paddingHorizontal: spacing.xs, paddingVertical: 4, justifyContent: 'center' },
  blockTitle: { fontSize: typography.sm, fontWeight: typography.semibold },
  blockTitleSm: { fontSize: typography.xs },
  blockTime: { fontSize: typography.xs, marginTop: 1 },

  propuestoBtns: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  propuestoBtn: {
    width: 24, height: 24, borderRadius: radii.sm, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },

  emptyText: { position: 'absolute', top: 80, alignSelf: 'center', fontSize: typography.sm },

  nowLine: { position: 'absolute', left: -spacing.sm, right: 0, flexDirection: 'row', alignItems: 'center' },
  nowDot: { width: 8, height: 8, borderRadius: 4 },
  nowBar: { flex: 1, height: 1.5 },
});