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
import {
  listarBloques,
  generarHorario,
  aceptarBloque,
  rechazarBloque,
  type ScheduleBlock,
  type ScheduleAgentBlock,
} from '../services/scheduleService';
import { getAccessToken, getStoredUser } from '../store/authStore';


const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const todayIndex = new Date().getDay();
const adjustedToday = todayIndex === 0 ? 6 : todayIndex - 1;

const PX_PER_MIN = 1.1;
const HOUR_HEIGHT = 60 * PX_PER_MIN;
const START_HOUR = 6;
const HOUR_COL = 52;

function timeToMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function extractHHMM(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`;
}


interface DisplayBlock {
  id: string;
  titulo: string;
  tipo: string;
  estado: string;
  horaInicio: string;
  horaFin: string;
  durationMin: number;
  razon?: string | null;
  fuente: 'tarea' | 'schedule' | 'agente';
  raw?: ScheduleAgentBlock;
}

function tareaToDisplay(t: Tarea): DisplayBlock | null {
  if (!t.due_at) return null;
  const h = new Date(t.due_at).getHours();
  if (h < START_HOUR || h >= START_HOUR + 16) return null;
  const horaInicio = extractHHMM(t.due_at);
  const endMin = h * 60 + new Date(t.due_at).getMinutes() + 30;
  const endH = Math.floor(endMin / 60);
  const endM = endMin % 60;
  return {
    id: t.id_tarea,
    titulo: t.titulo,
    tipo: 'tarea',
    estado: t.completada ? 'completada' : 'pendiente',
    horaInicio,
    horaFin: `${endH < 10 ? '0' : ''}${endH}:${endM < 10 ? '0' : ''}${endM}`,
    durationMin: 30,
    fuente: 'tarea',
  };
}

function scheduleToDisplay(b: ScheduleBlock): DisplayBlock {
  const durationMin = Math.max(
    (new Date(b.fecha_fin).getTime() - new Date(b.fecha_inicio).getTime()) / 60000,
    15
  );
  return {
    id: b.id,
    titulo: b.titulo,
    tipo: b.tipo,
    estado: b.status,
    horaInicio: extractHHMM(b.fecha_inicio),
    horaFin: extractHHMM(b.fecha_fin),
    durationMin,
    fuente: 'schedule',
  };
}

function agenteToDisplay(b: ScheduleAgentBlock): DisplayBlock {
  const durationMin = Math.max(
    (new Date(b.fecha_fin).getTime() - new Date(b.fecha_inicio).getTime()) / 60000,
    15
  );
  return {
    id: b.id,
    titulo: b.titulo,
    tipo: b.tipo,
    estado: b.estado,
    horaInicio: extractHHMM(b.fecha_inicio),
    horaFin: extractHHMM(b.fecha_fin),
    durationMin,
    razon: b.razon,
    fuente: 'agente',
    raw: b,
  };
}

function getDateForDayIndex(dayIndex: number): Date {
  const hoy = new Date();
  const dow = hoy.getDay();
  const adjustedDow = dow === 0 ? 6 : dow - 1;
  const diff = dayIndex - adjustedDow;
  const fecha = new Date(hoy);
  fecha.setDate(hoy.getDate() + diff);
  return fecha;
}

function bloquesDelDia(items: DisplayBlock[], dayIndex: number): DisplayBlock[] {
  return items.filter(b => {
    const fecha = getDateForDayIndex(dayIndex);
    // Para tareas usamos due_at, para schedule/agente usamos horaInicio como referencia del día
    return true; // ya están filtrados al cargar
  });
}


function TimelineBlock({
  block,
  onAceptar,
  onRechazar,
}: {
  block: DisplayBlock;
  onAceptar?: () => void;
  onRechazar?: () => void;
}) {
  const { theme } = useTheme();

  const tipoAccent: Record<string, string> = {
    tarea: theme.secondary,
    habito: theme.success,
    evento: theme.primary,
    libre: theme.textTertiary,
  };

  const fuenteColors = {
    tarea:    { bg: theme.surfaceElevated, border: theme.border,         text: theme.textSecondary },
    schedule: { bg: theme.successMuted,    border: theme.success + '50', text: theme.success },
    agente:   { bg: theme.primaryMuted,    border: theme.primary + '40', text: theme.primary },
  };

  const top = (timeToMinutes(
    block.fuente === 'tarea'
      ? `1970-01-01T${block.horaInicio}:00`
      : `1970-01-01T${block.horaInicio}:00`
  ) - START_HOUR * 60) * PX_PER_MIN;

  const topPx = ((() => {
    const [h, m] = block.horaInicio.split(':').map(Number);
    return (h * 60 + m - START_HOUR * 60) * PX_PER_MIN;
  })());

  const height = Math.max(block.durationMin * PX_PER_MIN, 36);
  const scheme = fuenteColors[block.fuente];
  const esAgente = block.fuente === 'agente';

  return (
    <TouchableOpacity
      style={[styles.block, { top: topPx, height, borderColor: scheme.border, backgroundColor: scheme.bg }]}
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
        {esAgente && height >= 72 && (
          <View style={styles.blockActions}>
            <TouchableOpacity
              style={[styles.blockActionBtn, { backgroundColor: theme.success + '20', borderColor: theme.success + '50' }]}
              onPress={onAceptar}
              activeOpacity={0.8}
            >
              <Text style={[styles.blockActionText, { color: theme.success }]}>✓ Aceptar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.blockActionBtn, { backgroundColor: theme.error + '20', borderColor: theme.error + '50' }]}
              onPress={onRechazar}
              activeOpacity={0.8}
            >
              <Text style={[styles.blockActionText, { color: theme.error }]}>✕ Rechazar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}


export default function ScheduleScreen() {
  const { theme } = useTheme();
  const [selectedDay, setSelectedDay] = useState(adjustedToday);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [bloques, setBloques] = useState<ScheduleBlock[]>([]);
  const [bloquesAgente, setBloquesAgente] = useState<ScheduleAgentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const HOURS = Array.from({ length: 16 }, (_, i) => i + START_HOUR);

  const cargarDatos = useCallback(async () => {
    try {
      setError(null);
      const token = await getAccessToken();
      if (!token) throw new Error('No hay sesión activa');
      const [tar, bloq] = await Promise.all([
        listarTareas(token),
        listarBloques(token),
      ]);
      setTareas(tar);
      setBloques(bloq);
    } catch (err: any) {
      setError(err.message || 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const handleGenerar = async () => {
    setGenerating(true);
    try {
      const token = await getAccessToken();
      const user = await getStoredUser();
      if (!token || !user) throw new Error('No hay sesión activa');

      const fecha = getDateForDayIndex(selectedDay);
      const fechaStr = fecha.toISOString().split('T')[0];

      const response = await generarHorario(token, fechaStr);

      if (!response.bloques || response.bloques.length === 0) {
        Alert.alert(
          'Sin bloques generados',
          'El agente necesita más historial para generar un horario personalizado. Completa algunas tareas primero.',
        );
        return;
      }

      setBloquesAgente(response.bloques);

      if (response.es_fallback) {
        Alert.alert('Horario generado', 'Usamos un horario base. Con el uso se irá personalizando.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo generar el horario');
    } finally {
      setGenerating(false);
    }
  };

  const handleAceptar = async (block: ScheduleAgentBlock) => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const aceptado = await aceptarBloque(token, block.id);
      setBloques(prev => [...prev, aceptado]);
      setBloquesAgente(prev => prev.filter(b => b.id !== block.id));
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleRechazar = async (block: ScheduleAgentBlock) => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      await rechazarBloque(token, block.id);
      setBloquesAgente(prev => prev.filter(b => b.id !== block.id));
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  // Filtrar por día seleccionado
  const fechaDia = getDateForDayIndex(selectedDay);
  const fechaDiaStr = fechaDia.toDateString();

  const tareasDisplay: DisplayBlock[] = tareas
    .filter(t => t.due_at && new Date(t.due_at).toDateString() === fechaDiaStr)
    .map(tareaToDisplay)
    .filter((b): b is DisplayBlock => b !== null);

  const bloquesDisplay: DisplayBlock[] = bloques
    .filter(b => new Date(b.fecha_inicio).toDateString() === fechaDiaStr)
    .map(scheduleToDisplay);

  const agenteDisplay: DisplayBlock[] = bloquesAgente
    .filter(b => new Date(b.fecha_inicio).toDateString() === fechaDiaStr)
    .map(agenteToDisplay);

  const todosBloques = [...tareasDisplay, ...bloquesDisplay, ...agenteDisplay];
  const completados = todosBloques.filter(b => b.estado === 'completed' || b.estado === 'completada').length;
  const pendientes = todosBloques.filter(b => b.estado === 'pendiente' || b.estado === 'planned').length;
  const propuestos = agenteDisplay.length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Horario</Text>
        <TouchableOpacity
          style={[
            styles.generateBtn,
            { backgroundColor: theme.primaryMuted, borderColor: theme.primary + '50' },
            generating && { opacity: 0.7 },
          ]}
          onPress={handleGenerar}
          disabled={generating}
          activeOpacity={0.8}
        >
          {generating
            ? <ActivityIndicator size="small" color={theme.primary} />
            : <Text style={[styles.generateBtnText, { color: theme.primary }]}>✦ Generar</Text>
          }
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
          <Text style={[styles.summaryText, { color: theme.textTertiary }]}>{completados} completado{completados !== 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: theme.textTertiary }]} />
          <Text style={[styles.summaryText, { color: theme.textTertiary }]}>{pendientes} pendiente{pendientes !== 1 ? 's' : ''}</Text>
        </View>
        {propuestos > 0 && (
          <View style={styles.summaryItem}>
            <View style={[styles.summaryDot, { backgroundColor: theme.primary }]} />
            <Text style={[styles.summaryText, { color: theme.textTertiary }]}>{propuestos} propuesto{propuestos !== 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>

      {/* Timeline */}
      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: spacing.xl }} />
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          <TouchableOpacity onPress={cargarDatos}>
            <Text style={[{ color: theme.primary, fontSize: typography.sm, fontWeight: typography.semibold }]}>Reintentar</Text>
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
                Sin actividades — toca ✦ Generar
              </Text>
            ) : (
              todosBloques.map(block => (
                <TimelineBlock
                  key={block.id}
                  block={block}
                  onAceptar={block.fuente === 'agente' && block.raw
                    ? () => handleAceptar(block.raw!)
                    : undefined
                  }
                  onRechazar={block.fuente === 'agente' && block.raw
                    ? () => handleRechazar(block.raw!)
                    : undefined
                  }
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
  generateBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radii.full, borderWidth: 1,
    minWidth: 100, alignItems: 'center', justifyContent: 'center',
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
  blockActions: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  blockActionBtn: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.full, borderWidth: 1 },
  blockActionText: { fontSize: typography.xs, fontWeight: typography.semibold },

  nowLine: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
  nowDot: { width: 8, height: 8, borderRadius: 4 },
  nowBar: { flex: 1, height: 1, opacity: 0.6 },

  errorBox: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.sm },
  errorText: { fontSize: typography.sm, textAlign: 'center' },
  emptyText: { textAlign: 'center', marginTop: spacing.xl, fontSize: typography.sm },
});