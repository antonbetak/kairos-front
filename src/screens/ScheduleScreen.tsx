import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
  LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/expo';
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
import { listarEventos, type EventItem } from '../services/calendarService';
import { obtenerFitData } from '../services/fitService';
import { getAccessToken, getStoredUser } from '../store/authStore';


const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const NUM_DAYS = 28; // 2 semanas atrás y 2 adelante
const today = new Date();
const todayIndex = today.getDay();
const adjustedToday = todayIndex === 0 ? 6 : todayIndex - 1;
const START_OFFSET = -14; // 2 semanas atrás

// Genera un array de objetos con info de cada día a mostrar
function getDaysArray() {
  const daysArr = [];
  for (let i = 0; i < NUM_DAYS; i++) {
    const offset = START_OFFSET + i;
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    const dow = date.getDay();
    const adjustedDow = dow === 0 ? 6 : dow - 1;
    daysArr.push({
      label: DAYS[adjustedDow],
      date,
      dayNum: date.getDate(),
      monthNum: date.getMonth() + 1,
      offset,
      isToday: date.toDateString() === today.toDateString(),
    });
  }
  return daysArr;
}

const PX_PER_MIN = 1.1;
const HOUR_HEIGHT = 60 * PX_PER_MIN;
const START_HOUR = 6;
const HOUR_COL = 52;
const TODAY_DAY_INDEX = Math.abs(START_OFFSET);
const DAY_TAB_WIDTH = 38;
const DAY_TAB_GAP = spacing.xs;
const SLEEP_ACTIVITY_TYPE = 72;

const FIT_ACTIVITY_LABELS: Record<number, string> = {
  1: 'Ciclismo',
  7: 'Caminata',
  8: 'Aeróbicos',
  21: 'Calistenia',
  29: 'Elíptica',
  38: 'Pesas',
  41: 'Yoga',
  56: 'Pilates',
  71: 'Fútbol',
  76: 'Natación',
  80: 'Entrenamiento de fuerza',
  82: 'Tenis',
  83: 'Caminadora',
  84: 'Senderismo',
  88: 'Caminar',
  90: 'Levantamiento de pesas',
  92: 'Yoga',
  94: 'Zumba',
};

function extractHHMM(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`;
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


interface DisplayBlock {
  id: string;
  titulo: string;
  tipo: string;
  estado: string;
  horaInicio: string;
  horaFin: string;
  durationMin: number;
  razon?: string | null;
  fuente: 'tarea' | 'schedule' | 'agente' | 'google' | 'fitness' | 'sleep';
  raw?: ScheduleAgentBlock;
}

function tareaToDisplay(t: Tarea): DisplayBlock | null {
  const estado = t.estado ?? (t.completada ? 'completada' : 'pendiente');
  if (estado === 'abandonada') return null;

  const usesRealTime = estado === 'completada' && t.started_at && t.completed_at;
  const startStr = usesRealTime ? t.started_at : t.due_at;
  if (!startStr) return null;

  const start = new Date(startStr);
  if (Number.isNaN(start.getTime())) return null;

  const h = start.getHours();
  if (h < START_HOUR || h >= START_HOUR + 16) return null;

  const end = usesRealTime ? new Date(t.completed_at!) : new Date(start.getTime() + 30 * 60000);
  if (Number.isNaN(end.getTime()) || end <= start) return null;

  const durationMin = Math.max((end.getTime() - start.getTime()) / 60000, 15);

  return {
    id: t.id_tarea,
    titulo: t.titulo,
    tipo: t.tipo ?? 'tarea',
    estado,
    horaInicio: extractHHMM(start.toISOString()),
    horaFin: extractHHMM(end.toISOString()),
    durationMin,
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
    tipo: b.tipo ?? 'libre',
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
    tipo: b.tipo ?? 'libre',
    estado: b.estado,
    horaInicio: extractHHMM(b.fecha_inicio),
    horaFin: extractHHMM(b.fecha_fin),
    durationMin,
    razon: b.razon,
    fuente: 'agente',
    raw: b,
  };
}

function googleToDisplay(e: EventItem): DisplayBlock | null {
  const startStr = e.start.dateTime ?? e.start.date;
  const endStr = e.end.dateTime ?? e.end.date;
  if (!startStr || !endStr) return null;

  const start = new Date(startStr);
  const end = new Date(endStr);
  const h = start.getHours();
  if (h < START_HOUR || h >= START_HOUR + 16) return null;

  const durationMin = Math.max((end.getTime() - start.getTime()) / 60000, 15);

  return {
    id: `gcal-${e.id}`,
    titulo: e.summary,
    tipo: 'evento',
    estado: 'google',
    horaInicio: extractHHMM(startStr),
    horaFin: extractHHMM(endStr),
    durationMin,
    razon: e.description ?? null,
    fuente: 'google',
  };
}

function parseFitMs(value: string | number | undefined): number {
  if (!value) return 0;
  return typeof value === 'string' ? parseInt(value, 10) : value;
}

function formatFitTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`;
}

function getFitSessionName(session: any): string {
  if (session.name && session.name !== '') return session.name;
  if (session.activityType === SLEEP_ACTIVITY_TYPE) return 'Dormido';
  return FIT_ACTIVITY_LABELS[session.activityType ?? 0] ?? 'Ejercicio';
}

function fitSessionToDisplay(session: any, selectedDate: Date): DisplayBlock | null {
  const startMs = parseFitMs(session.startTimeMillis);
  const endMs = parseFitMs(session.endTimeMillis);
  if (!startMs || !endMs || endMs <= startMs) return null;

  const dayStart = new Date(selectedDate);
  dayStart.setHours(START_HOUR, 0, 0, 0);
  const dayEnd = new Date(selectedDate);
  dayEnd.setHours(START_HOUR + 16, 0, 0, 0);

  const start = new Date(Math.max(startMs, dayStart.getTime()));
  const end = new Date(Math.min(endMs, dayEnd.getTime()));
  if (end <= start) return null;

  const isSleep = session.activityType === SLEEP_ACTIVITY_TYPE;
  const durationMin = Math.max((end.getTime() - start.getTime()) / 60000, 15);

  return {
    id: `fit-${isSleep ? 'sleep' : 'exercise'}-${session.id ?? `${startMs}-${endMs}`}`,
    titulo: getFitSessionName(session),
    tipo: isSleep ? 'libre' : 'habito',
    estado: isSleep ? 'sleep' : 'fitness',
    horaInicio: formatFitTime(start),
    horaFin: formatFitTime(end),
    durationMin,
    razon: `${formatFitTime(new Date(startMs))} – ${formatFitTime(new Date(endMs))}`,
    fuente: isSleep ? 'sleep' : 'fitness',
  };
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
    tarea:  theme.secondary,
    habito: theme.success,
    evento: theme.primary,
    libre:  theme.textTertiary,
    google: '#4285F4',
  };

  const fuenteColors = {
    tarea:    { bg: theme.surfaceElevated, border: theme.border,         text: theme.textSecondary },
    schedule: { bg: theme.successMuted,    border: theme.success + '50', text: theme.success },
    agente:   { bg: theme.primaryMuted,    border: theme.primary + '40', text: theme.primary },
    google:   { bg: '#4285F420',           border: '#4285F450',          text: '#4285F4' },
    fitness:  { bg: theme.warning + '18',  border: theme.warning + '55', text: theme.warning },
    sleep:    { bg: theme.primaryMuted,    border: theme.primary + '55', text: theme.primary },
  };

  const topPx = (() => {
    const [h, m] = block.horaInicio.split(':').map(Number);
    return (h * 60 + m - START_HOUR * 60) * PX_PER_MIN;
  })();

  const height = Math.max(block.durationMin * PX_PER_MIN, 36);
  const scheme = fuenteColors[block.fuente] ?? fuenteColors.tarea;
  const esAgente = block.fuente === 'agente';

  return (
    <TouchableOpacity
      style={[styles.block, { top: topPx, height, borderColor: scheme.border, backgroundColor: scheme.bg }]}
      activeOpacity={0.8}
      onPress={() => {
        if (block.razon || block.fuente === 'google' || block.fuente === 'fitness' || block.fuente === 'sleep') {
          Alert.alert(block.titulo, block.razon ?? `${block.horaInicio} – ${block.horaFin}`);
        }
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
        {esAgente && height >= 60 && (
  <View style={styles.blockActions}>
    <TouchableOpacity
      style={[styles.blockActionBtn, { backgroundColor: theme.success + '20', borderColor: theme.success + '50' }]}
      onPress={onAceptar}
      activeOpacity={0.8}
    >
      <Ionicons name="checkmark" size={14} color={theme.success} />
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.blockActionBtn, { backgroundColor: theme.error + '20', borderColor: theme.error + '50' }]}
      onPress={onRechazar}
      activeOpacity={0.8}
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
  const { getToken, isSignedIn } = useAuth();

  const daysArr = getDaysArray();
  // Por defecto, el día seleccionado es el de hoy (índice 14)
  const daySelectorRef = useRef<ScrollView>(null);
  const timelineRef = useRef<ScrollView>(null);
  const [selectedDay, setSelectedDay] = useState(TODAY_DAY_INDEX);
  const [daySelectorWidth, setDaySelectorWidth] = useState(0);
  const [timelineHeight, setTimelineHeight] = useState(0);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [bloques, setBloques] = useState<ScheduleBlock[]>([]);
  const [bloquesAgente, setBloquesAgente] = useState<ScheduleAgentBlock[]>([]);
  const [eventosGoogle, setEventosGoogle] = useState<EventItem[]>([]);
  const [fitSessions, setFitSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const HOURS = Array.from({ length: 16 }, (_, i) => i + START_HOUR);

  const centerDayTab = useCallback((index: number, animated = true) => {
    if (!daySelectorWidth) return;
    const tabCenterX = spacing.base + index * (DAY_TAB_WIDTH + DAY_TAB_GAP) + DAY_TAB_WIDTH / 2;
    const x = Math.max(0, tabCenterX - daySelectorWidth / 2);
    daySelectorRef.current?.scrollTo({ x, animated });
  }, [daySelectorWidth]);

  useEffect(() => {
    centerDayTab(TODAY_DAY_INDEX, false);
  }, [centerDayTab]);

  const handleDaySelectorLayout = (event: LayoutChangeEvent) => {
    setDaySelectorWidth(event.nativeEvent.layout.width);
  };

  const scrollToCurrentTime = useCallback((animated = false) => {
    if (!timelineHeight) return;

    const now = new Date();
    const minutesFromStart = now.getHours() * 60 + now.getMinutes() - START_HOUR * 60;
    const currentY = minutesFromStart * PX_PER_MIN;
    const contentHeight = HOURS.length * HOUR_HEIGHT;
    const maxY = Math.max(0, contentHeight - timelineHeight);
    const y = Math.min(Math.max(currentY - timelineHeight * 0.35, 0), maxY);

    timelineRef.current?.scrollTo({ y, animated });
  }, [HOURS.length, timelineHeight]);

  useEffect(() => {
    if (!loading && !error) {
      scrollToCurrentTime(false);
    }
  }, [error, loading, scrollToCurrentTime, selectedDay]);

  const handleTimelineLayout = (event: LayoutChangeEvent) => {
    setTimelineHeight(event.nativeEvent.layout.height);
  };

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

      // Cargar eventos de Google Calendar si el usuario tiene sesión con Google
      if (isSignedIn) {
        const clerkToken = await getToken();
        if (clerkToken) {
          try {
            const hoy = new Date();
            const timeMin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 3).toISOString();
            const timeMax = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 7).toISOString();
            const eventos = await listarEventos(clerkToken, { timeMin, timeMax, maxResults: 50 });
            setEventosGoogle(eventos.items ?? []);
          } catch {
            // Si falla Google Calendar, no bloqueamos el resto
            setEventosGoogle([]);
          }

          try {
            const fitStart = new Date(daysArr[0].date);
            fitStart.setHours(0, 0, 0, 0);
            const fitEnd = new Date(daysArr[daysArr.length - 1].date);
            fitEnd.setHours(23, 59, 59, 999);
            const fit = await obtenerFitData(clerkToken, {
              start: fitStart.toISOString(),
              end: fitEnd.toISOString(),
              bucketDays: 1,
            });
            setFitSessions(fit.sessions ?? []);
          } catch {
            // Si falla Google Fit, mantenemos el horario y calendarios visibles
            setFitSessions([]);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const handleGenerar = async () => {
  setGenerating(true);
  try {
    const token = await getAccessToken();
    if (!token) throw new Error('No hay sesión activa');

    const fecha = daysArr[selectedDay].date;
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    const fechaStr = `${y}-${m}-${d}`;

    const bloques = await generarHorario(token, fechaStr);

    if (!bloques || bloques.length === 0) {
      Alert.alert('Sin bloques', 'El agente necesita más historial. Completa algunas tareas primero.');
      return;
    }

    // Los bloques vienen como ScheduleBlock con status='propuesto'
    // Los mostramos directamente en bloquesAgente como ScheduleAgentBlock
    setBloquesAgente(bloques.map(b => ({
      id: b.id,
      titulo: b.titulo,
      descripcion: b.descripcion,
      tipo: b.tipo,
      estado: b.status,
      fecha_inicio: b.fecha_inicio,
      fecha_fin: b.fecha_fin,
      razon: null,
    })));

  } catch (err: any) {
    Alert.alert('Error', err.message ?? 'No se pudo generar el horario');
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
  const fechaDia = daysArr[selectedDay].date;
  const fechaDiaStr = fechaDia.toDateString();

  const tareasDisplay: DisplayBlock[] = tareas
    .filter(t => {
      const estado = t.estado ?? (t.completada ? 'completada' : 'pendiente');
      if (estado === 'abandonada') return false;
      const dateStr = estado === 'completada' && t.started_at ? t.started_at : t.due_at;
      return !!dateStr && new Date(dateStr).toDateString() === fechaDiaStr;
    })
    .map(tareaToDisplay)
    .filter((b): b is DisplayBlock => b !== null);

  const bloquesDisplay: DisplayBlock[] = bloques
    .filter(b => new Date(b.fecha_inicio).toDateString() === fechaDiaStr)
    .filter(b => b.status !== 'propuesto')
    .map(scheduleToDisplay);

  const agenteDisplay: DisplayBlock[] = bloquesAgente
    .filter(b => new Date(b.fecha_inicio).toDateString() === fechaDiaStr)
    .map(agenteToDisplay);

  const googleDisplay: DisplayBlock[] = eventosGoogle
    .filter(e => {
      const startStr = e.start.dateTime ?? e.start.date;
      if (!startStr) return false;
      return new Date(startStr).toDateString() === fechaDiaStr;
    })
    .map(googleToDisplay)
    .filter((b): b is DisplayBlock => b !== null);

  const fitDisplay: DisplayBlock[] = fitSessions
    .map(session => fitSessionToDisplay(session, fechaDia))
    .filter((b): b is DisplayBlock => b !== null);

  const todosBloques = [...tareasDisplay, ...bloquesDisplay, ...agenteDisplay, ...googleDisplay, ...fitDisplay];
  const completados = todosBloques.filter(b => b.estado === 'completed' || b.estado === 'completada').length;
  const pendientes = todosBloques.filter(b => b.estado === 'pendiente' || b.estado === 'planned').length;
  const propuestos = agenteDisplay.length;
  const googleCount = googleDisplay.length;
  const ejercicioCount = fitDisplay.filter(b => b.fuente === 'fitness').length;
  const suenoCount = fitDisplay.filter(b => b.fuente === 'sleep').length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Horario</Text>
        <TouchableOpacity
          style={[styles.generateBtn, { backgroundColor: theme.primaryMuted, borderColor: theme.primary + '50' }, generating && { opacity: 0.7 }]}
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.daySelector}
        contentContainerStyle={styles.daySelectorContent}
        ref={daySelectorRef}
        onLayout={handleDaySelectorLayout}
      >
        {daysArr.map((d, i) => (
          <TouchableOpacity
            key={d.date.toISOString()}
            style={[styles.dayTab, { backgroundColor: theme.surface, borderColor: theme.border }, selectedDay === i && { backgroundColor: theme.primaryMuted, borderColor: theme.primary + '50' }]}
            onPress={() => {
              setSelectedDay(i);
              centerDayTab(i);
            }}
          >
            <Text style={[styles.dayLabel, { color: selectedDay === i ? theme.primary : theme.textSecondary }, selectedDay === i && styles.dayLabelActive]}>
              {d.label}
            </Text>
            <Text style={[styles.dayDate, { color: selectedDay === i ? theme.primary : theme.textTertiary }]}>
              {d.dayNum}/{d.monthNum}
            </Text>
            {d.isToday && <View style={[styles.todayDot, { backgroundColor: theme.primary }]} />}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Summary strip */}
      <View style={styles.summaryStrip}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: theme.success }]} />
          <Text style={[styles.summaryText, { color: theme.textTertiary }]}>{completados} hecho{completados !== 1 ? 's' : ''}</Text>
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
        {googleCount > 0 && (
          <View style={styles.summaryItem}>
            <View style={[styles.summaryDot, { backgroundColor: '#4285F4' }]} />
            <Text style={[styles.summaryText, { color: theme.textTertiary }]}>{googleCount} Google</Text>
          </View>
        )}
        {ejercicioCount > 0 && (
          <View style={styles.summaryItem}>
            <View style={[styles.summaryDot, { backgroundColor: theme.warning }]} />
            <Text style={[styles.summaryText, { color: theme.textTertiary }]}>{ejercicioCount} ejercicio{ejercicioCount !== 1 ? 's' : ''}</Text>
          </View>
        )}
        {suenoCount > 0 && (
          <View style={styles.summaryItem}>
            <View style={[styles.summaryDot, { backgroundColor: theme.primary }]} />
            <Text style={[styles.summaryText, { color: theme.textTertiary }]}>{suenoCount} sueño</Text>
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
        <ScrollView
          ref={timelineRef}
          style={styles.timeline}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.timelineContent}
          onLayout={handleTimelineLayout}
        >
          {HOURS.map(h => (
            <View key={h} style={[styles.hourRow, { top: (h - START_HOUR) * HOUR_HEIGHT }]}>
              <Text style={[styles.hourLabel, { color: theme.textTertiary }]}>{h < 10 ? `0${h}` : h}:00</Text>
              <View style={[styles.hourLine, { backgroundColor: theme.borderSubtle }]} />
            </View>
          ))}

          <View style={[styles.blocksColumn, { height: HOURS.length * HOUR_HEIGHT }]}>
            {todosBloques.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textTertiary }]}>Sin actividades — toca ✦ Generar</Text>
            ) : (
              todosBloques.map(block => (
                <TimelineBlock
                  key={block.id}
                  block={block}
                  onAceptar={block.fuente === 'agente' && block.raw ? () => handleAceptar(block.raw!) : undefined}
                  onRechazar={block.fuente === 'agente' && block.raw ? () => handleRechazar(block.raw!) : undefined}
                />
              ))
            )}

            {daysArr[selectedDay]?.isToday && (
              <View style={[styles.nowLine, { top: (new Date().getHours() * 60 + new Date().getMinutes() - START_HOUR * 60) * PX_PER_MIN }]}>
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

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.base, paddingTop: spacing.md, paddingBottom: spacing.base },
  headerTitle: { fontSize: typography.xxl, fontWeight: typography.bold },
  generateBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.full, borderWidth: 1, minWidth: 100, alignItems: 'center', justifyContent: 'center' },
  generateBtnText: { fontSize: typography.sm, fontWeight: typography.semibold, letterSpacing: 0.3 },

  daySelector: {
    height: 48,
    maxHeight: 48,
    flexGrow: 0,
    marginBottom: spacing.xs,
  },
  daySelectorContent: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.base,
    paddingRight: spacing.base,
  },
  dayTab: {
    width: DAY_TAB_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 1,
    paddingHorizontal: 0,
    borderRadius: radii.md,
    borderWidth: 1,
    marginHorizontal: 0,
    gap: 0,
    height: 44,
  },
  dayLabel: { fontSize: 11, fontWeight: typography.medium, lineHeight: 13, paddingTop: 0, paddingBottom: 0 },
  dayLabelActive: { fontWeight: typography.bold },
  dayDate: { fontSize: 11, marginTop: 0, lineHeight: 13, paddingTop: 0, paddingBottom: 0 },
  todayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 0 },

  summaryStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.base,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
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
  blockActionBtn: { 
  width: 24, 
  height: 24, 
  borderRadius: radii.sm, 
  borderWidth: 1,
  alignItems: 'center',
  justifyContent: 'center',
},
  blockActionText: { fontSize: typography.xs, fontWeight: typography.semibold },

  nowLine: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
  nowDot: { width: 8, height: 8, borderRadius: 4 },
  nowBar: { flex: 1, height: 1, opacity: 0.6 },

  errorBox: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.sm },
  errorText: { fontSize: typography.sm, textAlign: 'center' },
  emptyText: { textAlign: 'center', marginTop: spacing.xl, fontSize: typography.sm },
});
