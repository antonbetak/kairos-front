import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, radii } from '../styles/theme';
import { obtenerFitData, type FitMetric } from '../services/fitService';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - spacing.base * 4;

type IoniconsName = keyof typeof Ionicons.glyphMap;

const ACTIVITY_ICONS: Record<number, { icon: IoniconsName; label: string }> = {
  1:   { icon: 'bicycle-outline',           label: 'Ciclismo' },
  2:   { icon: 'bicycle-outline',           label: 'Ciclismo en pista' },
  7:   { icon: 'walk-outline',              label: 'Caminata' },
  8:   { icon: 'barbell-outline',           label: 'Aeróbicos' },
  9:   { icon: 'body-outline',              label: 'Aeróbicos' },
  10:  { icon: 'body-outline',              label: 'Badminton' },
  13:  { icon: 'baseball-outline',          label: 'Béisbol' },
  14:  { icon: 'basketball-outline',        label: 'Baloncesto' },
  16:  { icon: 'bicycle-outline',           label: 'Ciclismo de montaña' },
  17:  { icon: 'boat-outline',              label: 'Canotaje' },
  20:  { icon: 'body-outline',              label: 'Boxeo' },
  21:  { icon: 'body-outline',              label: 'Calistenia' },
  22:  { icon: 'bicycle-outline',           label: 'Ciclismo de circuito' },
  29:  { icon: 'body-outline',              label: 'Elíptica' },
  31:  { icon: 'body-outline',              label: 'Esgrima' },
  32:  { icon: 'american-football-outline', label: 'Fútbol americano' },
  33:  { icon: 'body-outline',              label: 'Frisbee' },
  34:  { icon: 'body-outline',              label: 'Jardinería' },
  35:  { icon: 'golf-outline',              label: 'Golf' },
  37:  { icon: 'body-outline',              label: 'Gimnasia' },
  38:  { icon: 'barbell-outline',           label: 'Pesas' },
  41:  { icon: 'body-outline',              label: 'Yoga' },
  42:  { icon: 'body-outline',              label: 'Patinaje en hielo' },
  44:  { icon: 'body-outline',              label: 'Saltar la cuerda' },
  45:  { icon: 'body-outline',              label: 'Kayak' },
  46:  { icon: 'body-outline',              label: 'Crossfit' },
  47:  { icon: 'body-outline',              label: 'Kickboxing' },
  48:  { icon: 'body-outline',              label: 'Patinaje' },
  50:  { icon: 'body-outline',              label: 'Artes marciales' },
  51:  { icon: 'body-outline',              label: 'Meditación' },
  52:  { icon: 'body-outline',              label: 'Artes marciales mixtas' },
  56:  { icon: 'body-outline',              label: 'Pilates' },
  57:  { icon: 'body-outline',              label: 'Polo' },
  59:  { icon: 'body-outline',              label: 'Raquetbol' },
  60:  { icon: 'boat-outline',              label: 'Remo' },
  62:  { icon: 'body-outline',              label: 'Rugby' },
  64:  { icon: 'body-outline',              label: 'Patineta' },
  65:  { icon: 'snow-outline',              label: 'Esquí alpino' },
  66:  { icon: 'body-outline',              label: 'Trineo' },
  68:  { icon: 'snow-outline',              label: 'Snowboard' },
  69:  { icon: 'body-outline',              label: 'Raquetas de nieve' },
  71:  { icon: 'football-outline',          label: 'Fútbol' },
  72:  { icon: 'moon-outline',              label: 'Sueño' },
  73:  { icon: 'body-outline',              label: 'Squash' },
  74:  { icon: 'walk-outline',              label: 'Subir escaleras' },
  75:  { icon: 'body-outline',              label: 'Surf' },
  76:  { icon: 'body-outline',              label: 'Natación en alberca' },
  77:  { icon: 'walk-outline',              label: 'Escaleras' },
  78:  { icon: 'body-outline',              label: 'Natación en mar abierto' },
  79:  { icon: 'body-outline',              label: 'Natación' },
  80:  { icon: 'barbell-outline',           label: 'Entrenamiento de fuerza' },
  82:  { icon: 'tennisball-outline',        label: 'Tenis' },
  83:  { icon: 'walk-outline',              label: 'Caminadora' },
  84:  { icon: 'walk-outline',              label: 'Senderismo' },
  87:  { icon: 'body-outline',              label: 'Voleibol' },
  88:  { icon: 'walk-outline',              label: 'Caminar' },
  89:  { icon: 'water-outline',             label: 'Polo acuático' },
  90:  { icon: 'body-outline',              label: 'Levantamiento de pesas' },
  91:  { icon: 'body-outline',              label: 'Windsurf' },
  92:  { icon: 'body-outline',              label: 'Yoga' },
  93:  { icon: 'walk-outline',              label: 'Caminata' },
  94:  { icon: 'body-outline',              label: 'Zumba' },
  97:  { icon: 'body-outline',              label: 'Escalada' },
  108: { icon: 'body-outline',              label: 'Zumba' },
  115: { icon: 'bicycle-outline',           label: 'Ciclismo indoor' },
};

function getActivityInfo(activityType: number): { icon: IoniconsName; label: string } {
  return ACTIVITY_ICONS[activityType] ?? { icon: 'fitness-outline', label: 'Actividad' };
}

function getMetric(metrics: FitMetric[], name: string): FitMetric | undefined {
  return metrics.find(m =>
    m.name?.toLowerCase().includes(name) ||
    m.dataTypeName?.toLowerCase().includes(name)
  );
}

function formatValue(value: number | null | undefined, unit?: string | null): string {
  if (value === null || value === undefined) return '—';
  if (unit === 'kcal' || unit === 'cal') return `${Math.round(value)} kcal`;
  if (unit === 'ms') {
    const min = Math.round(value / 60000);
    if (min >= 60) return `${Math.floor(min / 60)}h ${min % 60}min`;
    return `${min} min`;
  }
  if (unit === 'count') return value.toLocaleString('es-MX');
  if (unit === 'm') return `${(value / 1000).toFixed(1)} km`;
  return `${Math.round(value * 10) / 10}${unit ? ` ${unit}` : ''}`;
}

function parseMs(value: string | number | undefined): number {
  if (!value) return 0;
  return typeof value === 'string' ? parseInt(value, 10) : value;
}

function formatFecha(ms: string | number | undefined): string {
  const parsed = parseMs(ms);
  if (!parsed) return '—';
  return new Date(parsed).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

function formatDuracion(startMs: string | number, endMs: string | number): string {
  const start = parseMs(startMs);
  const end = parseMs(endMs);
  if (!start || !end) return '—';
  const min = Math.round((end - start) / 60000);
  if (min >= 60) return `${Math.floor(min / 60)}h ${min % 60}min`;
  return `${min} min`;
}

function miniBarData(metric: FitMetric): number[] {
  if (!metric.buckets || metric.buckets.length === 0) return [];
  return metric.buckets.map(b => b.value ?? 0);
}

function MiniBarChart({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) return null;
  const H = 36;
  const W = CHART_W;
  const max = Math.max(...data, 1);
  const barW = (W / data.length) * 0.55;
  const gap = W / data.length;

  return (
    <Svg width={W} height={H}>
      {data.map((v, i) => {
        const h = Math.max((v / max) * (H - 4), 2);
        const x = i * gap + (gap - barW) / 2;
        return <Rect key={i} x={x} y={H - h} width={barW} height={h} rx={2} fill={color} opacity={0.75} />;
      })}
    </Svg>
  );
}

function MetricCard({
  iconName, iconColor, label, value, sublabel, data,
  accentColor, bgColor, borderColor,
}: {
  iconName: IoniconsName; iconColor: string; label: string; value: string;
  sublabel?: string; data?: number[];
  accentColor: string; bgColor: string; borderColor: string;
}) {
  return (
    <View style={[styles.metricCard, { backgroundColor: bgColor, borderColor }]}>
      <View style={styles.metricCardHeader}>
        <View style={[styles.metricIconWrap, { backgroundColor: accentColor + '20' }]}>
          <Ionicons name={iconName} size={24} color={iconColor} />
        </View>
        <View style={styles.metricCardInfo}>
          <Text style={[styles.metricLabel, { color: accentColor + 'BB' }]}>{label}</Text>
          <Text style={[styles.metricValue, { color: accentColor }]}>{value}</Text>
          {sublabel && <Text style={[styles.metricSublabel, { color: accentColor + '88' }]}>{sublabel}</Text>}
        </View>
      </View>
      {data && data.length > 0 && (
        <View style={styles.metricChart}>
          <MiniBarChart data={data} color={accentColor} />
        </View>
      )}
    </View>
  );
}

function SessionItem({ session, theme }: { session: any; theme: any }) {
  const activityInfo = getActivityInfo(session.activityType ?? 0);
  const nombre = session.name && session.name !== '' ? session.name : activityInfo.label;
  const fecha = formatFecha(session.startTimeMillis);
  const duracion = formatDuracion(session.startTimeMillis, session.endTimeMillis);

  return (
    <View style={[styles.sessionItem, { borderBottomColor: theme.border }]}>
      <View style={[styles.sessionIcon, { backgroundColor: theme.primaryMuted }]}>
        <Ionicons name={activityInfo.icon} size={22} color={theme.primary} />
      </View>
      <View style={styles.sessionInfo}>
        <Text style={[styles.sessionName, { color: theme.textPrimary }]}>{nombre}</Text>
        <Text style={[styles.sessionMeta, { color: theme.textSecondary }]}>
          {fecha} · {duracion}
        </Text>
      </View>
    </View>
  );
}

export default function FitnessScreen() {
  const { theme } = useTheme();
  const { getToken, isSignedIn } = useAuth();
  const [fitData, setFitData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<7 | 14 | 30>(7);

  const cargarFit = useCallback(async () => {
    if (!isSignedIn) {
      setError('Inicia sesión con Google para ver tus datos de fitness');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const clerkToken = await getToken();
      if (!clerkToken) throw new Error('No hay sesión activa');
      const end = new Date().toISOString();
      const start = new Date(Date.now() - periodo * 24 * 60 * 60 * 1000).toISOString();
      const data = await obtenerFitData(clerkToken, { start, end, bucketDays: 1 });
      setFitData(data);
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar los datos de fitness');
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, periodo]);

  useEffect(() => { cargarFit(); }, [cargarFit]);

  const metrics: FitMetric[] = fitData?.metrics ?? [];
  const sessions: any[] = fitData?.sessions ?? [];

  // Separar sueño de las demás sesiones
  const sesionesSueno = sessions.filter(s => s.activityType === 72);
  const sesionesEjercicio = sessions.filter(s => s.activityType !== 72);

  // Calcular total de sueño desde sesiones si no viene como métrica
  const totalSuenoMs = sesionesSueno.reduce((acc, s) => {
    return acc + (parseMs(s.endTimeMillis) - parseMs(s.startTimeMillis));
  }, 0);

  const pasos        = getMetric(metrics, 'step');
  const calorias     = getMetric(metrics, 'calori') ?? getMetric(metrics, 'calories');
  const distancia    = getMetric(metrics, 'distance');
  const actividadMin = getMetric(metrics, 'active') ?? getMetric(metrics, 'activity');
  const frecuencia   = getMetric(metrics, 'heart');
  const sueno        = getMetric(metrics, 'sleep');

  const PERIODOS: Array<{ key: 7 | 14 | 30; label: string }> = [
    { key: 7,  label: '7 días' },
    { key: 14, label: '14 días' },
    { key: 30, label: '30 días' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />

      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Fitness</Text>
          <Text style={[styles.headerSub, { color: theme.textTertiary }]}>Google Fit</Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: theme.primaryMuted, borderColor: theme.primary + '50' }]}
          onPress={cargarFit}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh-outline" size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

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
          <Ionicons name="fitness-outline" size={64} color={theme.textTertiary} />
          <Text style={[styles.errorTitle, { color: theme.textPrimary }]}>Sin datos de fitness</Text>
          <Text style={[styles.errorText, { color: theme.textSecondary }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: theme.primaryMuted, borderColor: theme.primary + '50' }]}
            onPress={cargarFit}
            activeOpacity={0.8}
          >
            <Text style={[styles.retryBtnText, { color: theme.primary }]}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Resumen</Text>

          <View style={styles.metricsGrid}>
            {pasos && (
              <MetricCard
                iconName="footsteps-outline" iconColor={theme.primary}
                label="Pasos" value={formatValue(pasos.total, 'count')}
                sublabel={`últimos ${periodo} días`} data={miniBarData(pasos)}
                accentColor={theme.primary} bgColor={theme.primaryMuted} borderColor={theme.primary + '40'}
              />
            )}
            {calorias && (
              <MetricCard
                iconName="flame-outline" iconColor={theme.warning}
                label="Calorías quemadas" value={formatValue(calorias.total, calorias.unit ?? 'kcal')}
                sublabel={`últimos ${periodo} días`} data={miniBarData(calorias)}
                accentColor={theme.warning} bgColor={theme.primaryMuted} borderColor={theme.warning + '40'}
              />
            )}
            {distancia && (
              <MetricCard
                iconName="map-outline" iconColor={theme.success}
                label="Distancia" value={formatValue(distancia.total, 'm')}
                sublabel={`últimos ${periodo} días`} data={miniBarData(distancia)}
                accentColor={theme.success} bgColor={theme.successMuted} borderColor={theme.success + '40'}
              />
            )}
            {actividadMin && (
              <MetricCard
                iconName="timer-outline" iconColor={theme.secondary}
                label="Minutos activos" value={formatValue(actividadMin.total, actividadMin.unit ?? 'ms')}
                sublabel={`últimos ${periodo} días`} data={miniBarData(actividadMin)}
                accentColor={theme.secondary} bgColor={theme.secondaryMuted} borderColor={theme.secondary + '40'}
              />
            )}
            {frecuencia && (
              <MetricCard
                iconName="heart-outline" iconColor="#E53935"
                label="Frecuencia cardíaca" value={formatValue(frecuencia.total, 'bpm')}
                data={miniBarData(frecuencia)}
                accentColor="#E53935" bgColor="#E5393510" borderColor="#E5393540"
              />
            )}

            {/* Sueño desde métricas o desde sesiones */}
            {sueno ? (
              <MetricCard
                iconName="moon-outline" iconColor={theme.primary}
                label="Sueño" value={formatValue(sueno.total, sueno.unit ?? 'ms')}
                data={miniBarData(sueno)}
                accentColor={theme.primary} bgColor={theme.primaryMuted} borderColor={theme.primary + '40'}
              />
            ) : sesionesSueno.length > 0 ? (
              <MetricCard
                iconName="moon-outline" iconColor={theme.primary}
                label="Sueño"
                value={formatValue(totalSuenoMs, 'ms')}
                sublabel={`${sesionesSueno.length} registro${sesionesSueno.length > 1 ? 's' : ''}`}
                accentColor={theme.primary} bgColor={theme.primaryMuted} borderColor={theme.primary + '40'}
              />
            ) : null}
          </View>

          {metrics.length === 0 && sesionesSueno.length === 0 && sesionesEjercicio.length === 0 && (
            <View style={styles.emptyMetrics}>
              <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
                No hay datos disponibles para este periodo.{'\n'}
                Asegúrate de tener Google Fit activo en tu dispositivo.
              </Text>
            </View>
          )}

          {/* Sesiones de ejercicio — sin sueño */}
          {sesionesEjercicio.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Sesiones</Text>
              <View style={[styles.sessionsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {sesionesEjercicio.slice(0, 15).map((s, i) => (
                  <SessionItem key={i} session={s} theme={theme} />
                ))}
              </View>
            </>
          )}

          <View style={{ height: spacing.xxxl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.base, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  headerTitle: { fontSize: typography.xxl, fontWeight: typography.bold },
  headerSub: { fontSize: typography.xs, marginTop: 2 },
  refreshBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  periodoRow: {
    flexDirection: 'row', marginHorizontal: spacing.base,
    borderRadius: radii.lg, borderWidth: 1, padding: 4, marginBottom: spacing.base,
  },
  periodoTab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center' },
  periodoText: { fontSize: typography.sm, fontWeight: typography.medium },

  scrollContent: { paddingHorizontal: spacing.base },
  sectionTitle: { fontSize: typography.lg, fontWeight: typography.bold, marginBottom: spacing.md, marginTop: spacing.sm },

  metricsGrid: { gap: spacing.md },
  metricCard: { borderRadius: radii.xl, borderWidth: 1, padding: spacing.base, gap: spacing.sm },
  metricCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  metricIconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  metricCardInfo: { flex: 1 },
  metricLabel: { fontSize: typography.xs, fontWeight: typography.medium, textTransform: 'uppercase', letterSpacing: 0.5 },
  metricValue: { fontSize: typography.xxl, fontWeight: typography.extrabold },
  metricSublabel: { fontSize: typography.xs, marginTop: 2 },
  metricChart: { marginTop: spacing.xs },

  sessionsCard: { borderRadius: radii.xl, borderWidth: 1, overflow: 'hidden' },
  sessionItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.base, borderBottomWidth: 1 },
  sessionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sessionInfo: { flex: 1 },
  sessionName: { fontSize: typography.base, fontWeight: typography.semibold },
  sessionMeta: { fontSize: typography.sm, marginTop: 2 },

  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  errorTitle: { fontSize: typography.xl, fontWeight: typography.bold, textAlign: 'center' },
  errorText: { fontSize: typography.sm, textAlign: 'center', lineHeight: 20 },
  retryBtn: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: radii.full, borderWidth: 1, marginTop: spacing.sm },
  retryBtnText: { fontSize: typography.base, fontWeight: typography.semibold },

  emptyMetrics: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyText: { fontSize: typography.sm, textAlign: 'center', lineHeight: 20 },
});