import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Circle, Path, G, Text as SvgText, Line } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, radii } from '../styles/theme';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - spacing.base * 2;


type Periodo = 'dia' | 'semana' | 'mes' | 'año';
type TipoTarea = 'tarea' | 'habito' | 'evento' | 'libre';


const MOCK: Record<Periodo, {
  barras: { label: string; completadas: number; total: number }[];
  linea: number[];
  tipos: Record<TipoTarea, number>;
  heatmap: number[][];
  totalCompletadas: number;
  totalTareas: number;
  tiempoTotal: number;
  rachaActual: number;
  mejorRacha: number;
}> = {
  dia: {
    barras: [
      { label: '8am', completadas: 1, total: 2 },
      { label: '10am', completadas: 2, total: 2 },
      { label: '12pm', completadas: 0, total: 1 },
      { label: '2pm', completadas: 1, total: 3 },
      { label: '4pm', completadas: 2, total: 2 },
      { label: '6pm', completadas: 0, total: 2 },
    ],
    linea: [20, 60, 40, 80, 90, 50],
    tipos: { tarea: 4, habito: 2, evento: 1, libre: 1 },
    heatmap: [],
    totalCompletadas: 6, totalTareas: 12, tiempoTotal: 180, rachaActual: 7, mejorRacha: 14,
  },
  semana: {
    barras: [
      { label: 'Lun', completadas: 4, total: 6 },
      { label: 'Mar', completadas: 6, total: 7 },
      { label: 'Mié', completadas: 3, total: 5 },
      { label: 'Jue', completadas: 7, total: 8 },
      { label: 'Vie', completadas: 5, total: 6 },
      { label: 'Sáb', completadas: 2, total: 3 },
      { label: 'Dom', completadas: 1, total: 2 },
    ],
    linea: [67, 86, 60, 87, 83, 67, 50],
    tipos: { tarea: 14, habito: 10, evento: 4, libre: 2 },
    heatmap: [
      [1, 1, 0, 1, 1, 0, 0],
      [1, 1, 1, 1, 0, 1, 0],
      [0, 1, 1, 1, 1, 1, 1],
      [1, 0, 1, 1, 1, 0, 1],
    ],
    totalCompletadas: 28, totalTareas: 37, tiempoTotal: 840, rachaActual: 7, mejorRacha: 14,
  },
  mes: {
    barras: [
      { label: 'S1', completadas: 18, total: 25 },
      { label: 'S2', completadas: 22, total: 28 },
      { label: 'S3', completadas: 15, total: 20 },
      { label: 'S4', completadas: 26, total: 30 },
    ],
    linea: [72, 78, 75, 87],
    tipos: { tarea: 48, habito: 28, evento: 12, libre: 8 },
    heatmap: [],
    totalCompletadas: 81, totalTareas: 103, tiempoTotal: 3600, rachaActual: 7, mejorRacha: 14,
  },
  año: {
    barras: [
      { label: 'Ene', completadas: 60, total: 80 },
      { label: 'Feb', completadas: 72, total: 90 },
      { label: 'Mar', completadas: 55, total: 75 },
      { label: 'Abr', completadas: 88, total: 100 },
      { label: 'May', completadas: 40, total: 60 },
      { label: 'Jun', completadas: 0, total: 0 },
    ],
    linea: [75, 80, 73, 88, 67, 0],
    tipos: { tarea: 180, habito: 120, evento: 45, libre: 30 },
    heatmap: [],
    totalCompletadas: 315, totalTareas: 405, tiempoTotal: 18000, rachaActual: 7, mejorRacha: 14,
  },
};

const TIPO_LABELS: Record<TipoTarea, string> = {
  tarea: 'Tareas', habito: 'Hábitos', evento: 'Eventos', libre: 'Libre',
};


function formatTiempo(min: number): string {
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}


function BarChart({ data, primaryColor, surfaceColor }: {
  data: { label: string; completadas: number; total: number }[];
  primaryColor: string;
  surfaceColor: string;
}) {
  const H = 140;
  const padL = 8;
  const padR = 8;
  const padTop = 12;
  const padBot = 28;
  const chartH = H - padTop - padBot;
  const barW_total = (CHART_W - padL - padR) / data.length;
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
            {/* Background bar */}
            <Rect
              x={x} y={yBase - totalH}
              width={barW} height={totalH}
              rx={4} fill={surfaceColor}
            />
            {/* Completed bar */}
            {compH > 0 && (
              <Rect
                x={x} y={yBase - compH}
                width={barW} height={compH}
                rx={4} fill={primaryColor}
              />
            )}
            {/* Label */}
            <SvgText
              x={x + barW / 2} y={H - 6}
              fontSize={9} fill={surfaceColor}
              textAnchor="middle" opacity={0.7}
            >
              {d.label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}


function LineChart({ data, primaryColor, surfaceColor }: {
  data: number[];
  primaryColor: string;
  surfaceColor: string;
}) {
  const H = 80;
  const padX = 12;
  const padY = 8;
  const chartH = H - padY * 2;
  const chartW = CHART_W - padX * 2;
  const maxVal = 100;

  const points = data.map((v, i) => ({
    x: padX + (i / (data.length - 1)) * chartW,
    y: padY + (1 - v / maxVal) * chartH,
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
      {/* Area fill */}
      <Path d={areaD} fill={primaryColor} opacity={0.12} />
      {/* Line */}
      <Path d={pathD} stroke={primaryColor} strokeWidth={2} fill="none" strokeLinecap="round" />
      {/* Dots */}
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={3} fill={primaryColor} />
      ))}
    </Svg>
  );
}


function DonutChart({ tipos, theme }: {
  tipos: Record<TipoTarea, number>;
  theme: any;
}) {
  const SIZE = 140;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const R = 52;
  const strokeW = 20;

  const colors: Record<TipoTarea, string> = {
    tarea:  theme.primary,
    habito: theme.success,
    evento: theme.warning,
    libre:  theme.secondary,
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

  const LABEL_R = R + strokeW / 2 + 14;

  return (
    <View style={styles.donutWrapper}>
      <Svg width={SIZE} height={SIZE}>
        {segments.map(seg => (
          <Circle
            key={seg.key}
            cx={cx} cy={cy} r={R}
            fill="none"
            stroke={colors[seg.key as TipoTarea]}
            strokeWidth={strokeW}
            strokeDasharray={`${seg.dash} ${seg.gap}`}
            strokeDashoffset={circumference * (0.25 - seg.offset)}
            strokeLinecap="butt"
            opacity={seg.pct === 0 ? 0 : 1}
          />
        ))}
        {/* Center total */}
        <SvgText x={cx} y={cy - 6} textAnchor="middle" fontSize={20} fontWeight="700" fill={theme.textPrimary}>
          {total}
        </SvgText>
        <SvgText x={cx} y={cy + 12} textAnchor="middle" fontSize={9} fill={theme.textSecondary}>
          total
        </SvgText>
      </Svg>

      {/* Legend */}
      <View style={styles.donutLegend}>
        {(Object.keys(tipos) as TipoTarea[]).map(key => (
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


function Heatmap({ data, primaryColor, surfaceColor }: {
  data: number[][];
  primaryColor: string;
  surfaceColor: string;
}) {
  const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const CELL = 32;
  const GAP = 4;

  if (!data.length) return null;

  return (
    <View>
      <View style={styles.heatmapRow}>
        {DIAS.map((d, i) => (
          <View key={i} style={[styles.heatmapCell, { width: CELL }]}>
            <Text style={[styles.heatmapDayLabel, { color: surfaceColor }]}>{d}</Text>
          </View>
        ))}
      </View>
      {data.map((week, wi) => (
        <View key={wi} style={[styles.heatmapRow, { marginBottom: GAP }]}>
          {week.map((val, di) => (
            <View
              key={di}
              style={[
                styles.heatmapCell,
                {
                  width: CELL, height: CELL,
                  backgroundColor: val ? primaryColor : surfaceColor,
                  opacity: val ? 0.85 : 0.3,
                  borderRadius: 6,
                  marginRight: GAP,
                },
              ]}
            />
          ))}
        </View>
      ))}
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


function Card({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
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


const PERIODOS: Array<{ key: Periodo; label: string }> = [
  { key: 'dia',    label: 'Hoy' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes',    label: 'Mes' },
  { key: 'año',    label: 'Año' },
];

export default function StatsScreen() {
  const { theme } = useTheme();
  const [periodo, setPeriodo] = useState<Periodo>('semana');
  const data = MOCK[periodo];
  const pct = data.totalTareas > 0
    ? Math.round(data.totalCompletadas / data.totalTareas * 100)
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
            style={[
              styles.periodoTab,
              periodo === p.key && { backgroundColor: theme.primary, borderRadius: radii.md },
            ]}
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Summary badges */}
        <View style={styles.badgeRow}>
          <StatBadge
            label="completadas"
            value={`${data.totalCompletadas}`}
            sub={`de ${data.totalTareas}`}
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
            label="tiempo"
            value={formatTiempo(data.tiempoTotal)}
            accentColor={theme.secondary}
            bgColor={theme.secondaryMuted}
            borderColor={theme.secondary + '40'}
          />
        </View>

        {/* Racha */}
        <View style={styles.badgeRow}>
          <StatBadge
            label="racha actual"
            value={`${data.rachaActual}d`}
            accentColor={theme.warning}
            bgColor={theme.primaryMuted}
            borderColor={theme.warning + '40'}
          />
          <StatBadge
            label="mejor racha"
            value={`${data.mejorRacha}d`}
            accentColor={theme.textSecondary}
            bgColor={theme.surfaceElevated}
            borderColor={theme.border}
          />
        </View>

        {/* Bar chart — completadas */}
        <Card
          title="Tareas completadas"
          subtitle={periodo === 'dia' ? 'por hora' : periodo === 'semana' ? 'por día' : periodo === 'mes' ? 'por semana' : 'por mes'}
        >
          <BarChart
            data={data.barras}
            primaryColor={theme.primary}
            surfaceColor={theme.surfaceElevated}
          />
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

        {/* Line chart — tendencia */}
        <Card title="Tendencia de productividad" subtitle="% completado">
          <LineChart
            data={data.linea}
            primaryColor={theme.primary}
            surfaceColor={theme.surfaceElevated}
          />
          <View style={styles.lineLabels}>
            <Text style={[styles.lineLabelText, { color: theme.textTertiary }]}>0%</Text>
            <Text style={[styles.lineLabelText, { color: theme.textTertiary }]}>100%</Text>
          </View>
        </Card>

        {/* Donut — por tipo */}
        <Card title="Por tipo de tarea">
          <DonutChart tipos={data.tipos} theme={theme} />
        </Card>

        {/* Heatmap — solo semana */}
        {periodo === 'semana' && data.heatmap.length > 0 && (
          <Card title="Consistencia de hábitos" subtitle="últimas 4 semanas">
            <Heatmap
              data={data.heatmap}
              primaryColor={theme.primary}
              surfaceColor={theme.surfaceElevated}
            />
          </Card>
        )}

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.base,
  },
  headerTitle: {
    fontSize: typography.xxl,
    fontWeight: typography.bold,
  },

  periodoRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.base,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 4,
    marginBottom: spacing.base,
  },
  periodoTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  periodoText: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
  },

  scrollContent: {
    paddingHorizontal: spacing.base,
  },

  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statBadge: {
    flex: 1,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  statBadgeValue: {
    fontSize: typography.xl,
    fontWeight: typography.extrabold,
  },
  statBadgeLabel: {
    fontSize: typography.xs,
    fontWeight: typography.medium,
    textAlign: 'center',
  },
  statBadgeSub: {
    fontSize: typography.xs,
    textAlign: 'center',
  },

  card: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
  },
  cardSubtitle: {
    fontSize: typography.xs,
  },

  barLegendRow: {
    flexDirection: 'row',
    gap: spacing.base,
    marginTop: spacing.sm,
  },
  barLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  barLegendDot: {
    width: 8, height: 8,
    borderRadius: 4,
  },
  barLegendText: {
    fontSize: typography.xs,
  },

  lineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  lineLabelText: {
    fontSize: typography.xs,
  },

  donutWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  donutLegend: {
    flex: 1,
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: 10, height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
  },
  legendValue: {
    fontSize: typography.xs,
  },

  heatmapRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 2,
  },
  heatmapCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heatmapDayLabel: {
    fontSize: typography.xs,
    fontWeight: typography.medium,
    marginBottom: 4,
  },
});