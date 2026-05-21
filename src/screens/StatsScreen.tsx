import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Circle, Path, G, Text as SvgText } from 'react-native-svg';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, radii } from '../styles/theme';
import { obtenerEstadisticas, obtenerRacha, listarLogros, type Estadistica, type Racha, type Logro } from '../services/statsService';
import { listarTareas, type Tarea } from '../services/taskService';
import { getAccessToken } from '../store/authStore';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - spacing.base * 2;

type Periodo = 'dia' | 'semana' | 'mes' | 'año';
type TipoTarea = 'tarea' | 'habito' | 'evento' | 'libre';

const TIPO_LABELS: Record<TipoTarea, string> = {
  tarea: 'Tareas', habito: 'Hábitos', evento: 'Eventos', libre: 'Libre',
};

function formatTiempo(min: number): string {
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}


function calcularDatosPeriodo(tareas: Tarea[], periodo: Periodo) {
  const ahora = new Date();

  const enPeriodo = (t: Tarea) => {
    if (!t.due_at) return false;
    const d = new Date(t.due_at);
    if (periodo === 'dia') {
      return d.toDateString() === ahora.toDateString();
    }
    if (periodo === 'semana') {
      const startOfWeek = new Date(ahora);
      startOfWeek.setDate(ahora.getDate() - ahora.getDay() + 1);
      startOfWeek.setHours(0, 0, 0, 0);
      return d >= startOfWeek;
    }
    if (periodo === 'mes') {
      return d.getMonth() === ahora.getMonth() && d.getFullYear() === ahora.getFullYear();
    }
    return d.getFullYear() === ahora.getFullYear();
  };

  const filtradas = tareas.filter(enPeriodo);
  const completadas = filtradas.filter(t => (t.estado ?? (t.completada ? 'completada' : 'pendiente')) === 'completada');

  // Barras
  let barras: { label: string; completadas: number; total: number }[] = [];
  if (periodo === 'dia') {
    const horas = [8, 10, 12, 14, 16, 18];
    barras = horas.map(h => {
      const enHora = filtradas.filter(t => t.due_at && new Date(t.due_at).getHours() === h);
      return { label: `${h}h`, completadas: enHora.filter(t => (t.estado ?? (t.completada ? 'completada' : 'pendiente')) === 'completada').length, total: enHora.length };
    });
  } else if (periodo === 'semana') {
    const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    barras = dias.map((label, i) => {
      const enDia = filtradas.filter(t => {
        if (!t.due_at) return false;
        const d = new Date(t.due_at).getDay();
        const adj = d === 0 ? 6 : d - 1;
        return adj === i;
      });
      return { label, completadas: enDia.filter(t => (t.estado ?? (t.completada ? 'completada' : 'pendiente')) === 'completada').length, total: enDia.length };
    });
  } else if (periodo === 'mes') {
    barras = ['S1', 'S2', 'S3', 'S4'].map((label, i) => {
      const enSemana = filtradas.filter(t => {
        if (!t.due_at) return false;
        const d = new Date(t.due_at).getDate();
        return Math.floor((d - 1) / 7) === i;
      });
      return { label, completadas: enSemana.filter(t => (t.estado ?? (t.completada ? 'completada' : 'pendiente')) === 'completada').length, total: enSemana.length };
    });
  } else {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    barras = meses.slice(0, ahora.getMonth() + 1).map((label, i) => {
      const enMes = filtradas.filter(t => t.due_at && new Date(t.due_at).getMonth() === i);
      return { label, completadas: enMes.filter(t => (t.estado ?? (t.completada ? 'completada' : 'pendiente')) === 'completada').length, total: enMes.length };
    });
  }

  // Línea de tendencia (% completado por barra)
  const linea = barras.map(b => b.total > 0 ? Math.round((b.completadas / b.total) * 100) : 0);

  const tipos: Record<TipoTarea, number> = { tarea: 0, habito: 0, evento: 0, libre: 0 };
  filtradas.forEach(t => { tipos[t.tipo ?? 'libre'] += 1; });

  return {
    barras,
    linea,
    tipos,
    totalCompletadas: completadas.length,
    totalTareas: filtradas.length,
    tiempoTotal: completadas.length * 30, // 30 min estimado por tarea
  };
}


function BarChart({ data, primaryColor, surfaceColor }: {
  data: { label: string; completadas: number; total: number }[];
  primaryColor: string;
  surfaceColor: string;
}) {
  const H = 140;
  const padL = 8, padR = 8, padTop = 12, padBot = 28;
  const chartH = H - padTop - padBot;
  const barW_total = (CHART_W - padL - padR) / Math.max(data.length, 1);
  const barW = barW_total * 0.5;
  const maxVal = Math.max(...data.map(d => d.total), 1);

  return (
    <Svg width={CHART_W} height={H}>
      {data.map((d, i) => {
        const x = padL + i * barW_total + (barW_total - barW) / 2;
        const totalH = (d.total / maxVal) * chartH;
        const compH = d.total > 0 ? (d.completadas / d.total) * totalH : 0;
        const yBase = padTop + chartH;
        return (
          <G key={i}>
            <Rect x={x} y={yBase - totalH} width={barW} height={Math.max(totalH, 2)} rx={4} fill={surfaceColor} />
            {compH > 0 && <Rect x={x} y={yBase - compH} width={barW} height={compH} rx={4} fill={primaryColor} />}
            <SvgText x={x + barW / 2} y={H - 6} fontSize={9} fill={surfaceColor} textAnchor="middle" opacity={0.7}>{d.label}</SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

function LineChart({ data, primaryColor }: { data: number[]; primaryColor: string }) {
  const H = 80;
  const padX = 12, padY = 8;
  const chartH = H - padY * 2;
  const chartW = CHART_W - padX * 2;

  if (data.length < 2) return null;

  const points = data.map((v, i) => ({
    x: padX + (i / (data.length - 1)) * chartW,
    y: padY + (1 - v / 100) * chartH,
  }));

  const pathD = points.reduce((d, p, i) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const prev = points[i - 1];
    const cpx = (prev.x + p.x) / 2;
    return `${d} C${cpx},${prev.y} ${cpx},${p.y} ${p.x},${p.y}`;
  }, '');

  const areaD = `${pathD} L${points[points.length - 1].x},${H} L${points[0].x},${H} Z`;

  return (
    <Svg width={CHART_W} height={H}>
      <Path d={areaD} fill={primaryColor} opacity={0.12} />
      <Path d={pathD} stroke={primaryColor} strokeWidth={2} fill="none" strokeLinecap="round" />
      {points.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={3} fill={primaryColor} />)}
    </Svg>
  );
}

function DonutChart({ tipos, theme }: { tipos: Record<TipoTarea, number>; theme: any }) {
  const SIZE = 140;
  const cx = SIZE / 2, cy = SIZE / 2, R = 52, strokeW = 20;

  const colors: Record<TipoTarea, string> = {
    tarea: theme.primary, habito: theme.success, evento: theme.warning, libre: theme.secondary,
  };

  const total = Object.values(tipos).reduce((a, b) => a + b, 0) || 1;
  const circumference = 2 * Math.PI * R;
  let offset = 0;

  const segments = (Object.keys(tipos) as TipoTarea[]).map(key => {
    const pct = tipos[key] / total;
    const seg = { key, pct, offset, dash: pct * circumference, gap: (1 - pct) * circumference };
    offset += pct;
    return seg;
  });

  return (
    <View style={styles.donutWrapper}>
      <Svg width={SIZE} height={SIZE}>
        {segments.map(seg => (
          <Circle
            key={seg.key} cx={cx} cy={cy} r={R} fill="none"
            stroke={colors[seg.key as TipoTarea]} strokeWidth={strokeW}
            strokeDasharray={`${seg.dash} ${seg.gap}`}
            strokeDashoffset={circumference * (0.25 - seg.offset)}
            strokeLinecap="butt" opacity={seg.pct === 0 ? 0 : 1}
          />
        ))}
        <SvgText x={cx} y={cy - 6} textAnchor="middle" fontSize={20} fontWeight="700" fill={theme.textPrimary}>{total}</SvgText>
        <SvgText x={cx} y={cy + 12} textAnchor="middle" fontSize={9} fill={theme.textSecondary}>total</SvgText>
      </Svg>
      <View style={styles.donutLegend}>
        {(Object.keys(tipos) as TipoTarea[]).filter(k => tipos[k] > 0).map(key => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors[key] }]} />
            <View>
              <Text style={[styles.legendLabel, { color: theme.textPrimary }]}>{TIPO_LABELS[key]}</Text>
              <Text style={[styles.legendValue, { color: theme.textSecondary }]}>
                {tipos[key]} · {Math.round(tipos[key] / total * 100)}%
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}


function StatBadge({ label, value, sub, accentColor, bgColor, borderColor }: {
  label: string; value: string; sub?: string;
  accentColor: string; bgColor: string; borderColor: string;
}) {
  return (
    <View style={[styles.statBadge, { backgroundColor: bgColor, borderColor }]}>
      <Text style={[styles.statBadgeValue, { color: accentColor }]}>{value}</Text>
      <Text style={[styles.statBadgeLabel, { color: accentColor }]}>{label}</Text>
      {sub && <Text style={[styles.statBadgeSub, { color: accentColor + '88' }]}>{sub}</Text>}
    </View>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{title}</Text>
        {subtitle && <Text style={[styles.cardSubtitle, { color: theme.textTertiary }]}>{subtitle}</Text>}
      </View>
      {children}
    </View>
  );
}

function LogroItem({ logro, theme }: { logro: Logro; theme: any }) {
  return (
    <View style={[styles.logroItem, { borderColor: theme.border }]}> 
      <View style={[styles.logroIcon, { backgroundColor: theme.primaryMuted, alignItems: 'center', justifyContent: 'center' }]}> 
        <FontAwesome name="trophy" size={24} color={theme.primary} />
      </View>
      <View style={styles.logroText}>
        <Text style={[styles.logroTitulo, { color: theme.textPrimary }]}>{logro.titulo}</Text>
        <Text style={[styles.logroDesc, { color: theme.textSecondary }]}>{logro.descripcion}</Text>
        <Text style={[styles.logroFecha, { color: theme.textTertiary }]}> 
          {new Date(logro.fecha_desbloqueo).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
      </View>
    </View>
  );
}


const PERIODOS: Array<{ key: Periodo; label: string }> = [
  { key: 'dia', label: 'Hoy' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mes' },
  { key: 'año', label: 'Año' },
];

export default function StatsScreen() {
  const { theme } = useTheme();
  const [periodo, setPeriodo] = useState<Periodo>('semana');
  const [estadistica, setEstadistica] = useState<Estadistica | null>(null);
  const [racha, setRacha] = useState<Racha | null>(null);
  const [logros, setLogros] = useState<Logro[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    try {
      setError(null);
      const token = await getAccessToken();
      if (!token) throw new Error('No hay sesión activa');

      const [est, rach, logs, tar] = await Promise.all([
        obtenerEstadisticas(token),
        obtenerRacha(token, 'tareas'),
        listarLogros(token),
        listarTareas(token),
      ]);

      setEstadistica(est);
      setRacha(rach);
      setLogros(logs);
      setTareas(tar);
    } catch (err: any) {
      setError(err.message || 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const datosPeriodo = calcularDatosPeriodo(tareas, periodo);
  const pct = datosPeriodo.totalTareas > 0
    ? Math.round(datosPeriodo.totalCompletadas / datosPeriodo.totalTareas * 100)
    : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Métricas</Text>
      </View>

      {/* Period selector */}
      <View style={[styles.periodoRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {PERIODOS.map(p => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodoTab, periodo === p.key && { backgroundColor: theme.primary, borderRadius: radii.md }]}
            onPress={() => setPeriodo(p.key)}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.periodoText,
              { color: periodo === p.key ? theme.textInverse : theme.textSecondary },
              periodo === p.key && { fontWeight: typography.bold },
            ]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ flex: 1 }} />
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          <TouchableOpacity onPress={cargarDatos}>
            <Text style={[{ color: theme.primary, fontSize: typography.sm, fontWeight: typography.semibold }]}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Summary badges */}
          <View style={styles.badgeRow}>
            <StatBadge
              label="completadas"
              value={`${datosPeriodo.totalCompletadas}`}
              sub={`de ${datosPeriodo.totalTareas}`}
              accentColor={theme.primary}
              bgColor={theme.primaryMuted}
              borderColor={theme.primary + '40'}
            />
            <StatBadge
              label="completado"
              value={`${pct}%`}
              accentColor={theme.success}
              bgColor={theme.successMuted}
              borderColor={theme.success + '40'}
            />
            <StatBadge
              label="tiempo est."
              value={formatTiempo(datosPeriodo.tiempoTotal)}
              accentColor={theme.secondary}
              bgColor={theme.secondaryMuted}
              borderColor={theme.secondary + '40'}
            />
          </View>

          {/* Racha */}
          <View style={styles.badgeRow}>
            <StatBadge
              label="racha actual"
              value={`${racha?.racha_actual ?? 0}d`}
              accentColor={theme.warning}
              bgColor={theme.primaryMuted}
              borderColor={theme.warning + '40'}
            />
            <StatBadge
              label="mejor racha"
              value={`${racha?.mejor_racha ?? 0}d`}
              accentColor={theme.textSecondary}
              bgColor={theme.surfaceElevated}
              borderColor={theme.border}
            />
            <StatBadge
              label="total historial"
              value={`${estadistica?.tareas_completadas ?? 0}`}
              sub="completadas"
              accentColor={theme.primary}
              bgColor={theme.primaryMuted}
              borderColor={theme.primary + '40'}
            />
          </View>

          {/* Bar chart */}
          <Card
            title="Tareas completadas"
            subtitle={periodo === 'dia' ? 'por hora' : periodo === 'semana' ? 'por día' : periodo === 'mes' ? 'por semana' : 'por mes'}
          >
            <BarChart data={datosPeriodo.barras} primaryColor={theme.primary} surfaceColor={theme.surfaceElevated} />
            <View style={styles.barLegendRow}>
              <View style={styles.barLegendItem}>
                <View style={[styles.barLegendDot, { backgroundColor: theme.primary }]} />
                <Text style={[styles.barLegendText, { color: theme.textSecondary }]}>Completadas</Text>
              </View>
              <View style={styles.barLegendItem}>
                <View style={[styles.barLegendDot, { backgroundColor: theme.surfaceElevated }]} />
                <Text style={[styles.barLegendText, { color: theme.textSecondary }]}>Total</Text>
              </View>
            </View>
          </Card>

          {/* Line chart */}
          <Card title="Tendencia de productividad" subtitle="% completado">
            <LineChart data={datosPeriodo.linea} primaryColor={theme.primary} />
            <View style={styles.lineLabels}>
              <Text style={[styles.lineLabelText, { color: theme.textTertiary }]}>0%</Text>
              <Text style={[styles.lineLabelText, { color: theme.textTertiary }]}>100%</Text>
            </View>
          </Card>

          {/* Donut */}
          <Card title="Por tipo de tarea">
            <DonutChart tipos={datosPeriodo.tipos} theme={theme} />
          </Card>

          {/* Logros */}
          {logros.length > 0 && (
            <Card title="Logros desbloqueados" subtitle={`${logros.length} logros`}>
              {logros.map(l => <LogroItem key={l.codigo} logro={l} theme={theme} />)}
            </Card>
          )}

          <View style={{ height: spacing.xxxl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },

  header: { paddingHorizontal: spacing.base, paddingTop: spacing.md, paddingBottom: spacing.base },
  headerTitle: { fontSize: typography.xxl, fontWeight: typography.bold },

  periodoRow: {
    flexDirection: 'row', marginHorizontal: spacing.base,
    borderRadius: radii.lg, borderWidth: 1, padding: 4, marginBottom: spacing.base,
  },
  periodoTab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center' },
  periodoText: { fontSize: typography.sm, fontWeight: typography.medium },

  scrollContent: { paddingHorizontal: spacing.base },

  badgeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  statBadge: { flex: 1, borderRadius: radii.lg, borderWidth: 1, padding: spacing.md, alignItems: 'center', gap: 2 },
  statBadgeValue: { fontSize: typography.xl, fontWeight: typography.extrabold },
  statBadgeLabel: { fontSize: typography.xs, fontWeight: typography.medium, textAlign: 'center' },
  statBadgeSub: { fontSize: typography.xs, textAlign: 'center' },

  card: { borderRadius: radii.xl, borderWidth: 1, padding: spacing.base, marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.md },
  cardTitle: { fontSize: typography.base, fontWeight: typography.semibold },
  cardSubtitle: { fontSize: typography.xs },

  barLegendRow: { flexDirection: 'row', gap: spacing.base, marginTop: spacing.sm },
  barLegendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  barLegendDot: { width: 8, height: 8, borderRadius: 4 },
  barLegendText: { fontSize: typography.xs },

  lineLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  lineLabelText: { fontSize: typography.xs },

  donutWrapper: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  donutLegend: { flex: 1, gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: typography.sm, fontWeight: typography.medium },
  legendValue: { fontSize: typography.xs },

  logroItem: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1 },
  logroIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  logroText: { flex: 1 },
  logroTitulo: { fontSize: typography.base, fontWeight: typography.semibold },
  logroDesc: { fontSize: typography.sm, marginTop: 2 },
  logroFecha: { fontSize: typography.xs, marginTop: 4 },

  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  errorText: { fontSize: typography.sm, textAlign: 'center' },
});
