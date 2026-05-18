import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, radii } from '../styles/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type NotifTipo = 'tarea' | 'logro' | 'recordatorio' | 'sistema';

interface Notificacion {
  id: string;
  tipo: NotifTipo;
  titulo: string;
  cuerpo: string;
  leida: boolean;
  created_at: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_NOTIFS: Notificacion[] = [
  {
    id: '1',
    tipo: 'recordatorio',
    titulo: 'Tienes 2 tareas pendientes',
    cuerpo: 'No olvides completar tus tareas de hoy antes de las 18:00.',
    leida: false,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    tipo: 'logro',
    titulo: '¡Racha de 7 días!',
    cuerpo: 'Completaste al menos una tarea cada día esta semana.',
    leida: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: '3',
    tipo: 'tarea',
    titulo: 'Tarea por vencer',
    cuerpo: '"Revisar arquitectura de microservicios" vence hoy a las 18:00.',
    leida: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: '4',
    tipo: 'sistema',
    titulo: 'Bienvenida a Kairos',
    cuerpo: 'Configura tu horario y días laborales para personalizar tu experiencia.',
    leida: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tiempoRelativo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const min = Math.floor(diff / 60000);
  const hrs = Math.floor(min / 60);
  const dias = Math.floor(hrs / 24);
  if (min < 1)  return 'ahora';
  if (min < 60) return `hace ${min} min`;
  if (hrs < 24) return `hace ${hrs} h`;
  return `hace ${dias} día${dias > 1 ? 's' : ''}`;
}

const tipoIcon: Record<NotifTipo, { name: keyof typeof Ionicons.glyphMap; color: (theme: any) => string }> = {
  tarea:        { name: 'checkbox-outline',      color: t => t.primary },
  logro:        { name: 'trophy-outline',         color: t => t.warning },
  recordatorio: { name: 'alarm-outline',          color: t => t.secondary },
  sistema:      { name: 'information-circle-outline', color: t => t.textSecondary },
};

// ─── NotifItem ────────────────────────────────────────────────────────────────

function NotifItem({ notif, onPress }: { notif: Notificacion; onPress: () => void }) {
  const { theme } = useTheme();
  const icon = tipoIcon[notif.tipo];

  return (
    <TouchableOpacity
      style={[
        styles.notifItem,
        { borderBottomColor: theme.border },
        !notif.leida && { backgroundColor: theme.primaryMuted },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Icono tipo */}
      <View style={[styles.notifIconWrap, { backgroundColor: theme.surfaceElevated }]}>
        <Ionicons name={icon.name} size={20} color={icon.color(theme)} />
      </View>

      {/* Contenido */}
      <View style={styles.notifContent}>
        <View style={styles.notifTopRow}>
          <Text style={[styles.notifTitulo, { color: theme.textPrimary }, !notif.leida && { fontWeight: typography.bold }]}>
            {notif.titulo}
          </Text>
          {!notif.leida && (
            <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />
          )}
        </View>
        <Text style={[styles.notifCuerpo, { color: theme.textSecondary }]} numberOfLines={2}>
          {notif.cuerpo}
        </Text>
        <Text style={[styles.notifTime, { color: theme.textTertiary }]}>
          {tiempoRelativo(notif.created_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function NotificationsModal({ visible, onClose }: Props) {
  const { theme } = useTheme();

  const [notifs, setNotifs] = React.useState<Notificacion[]>(MOCK_NOTIFS);
  const sinLeer = notifs.filter(n => !n.leida).length;

  const marcarLeida = (id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
  };

  const marcarTodasLeidas = () => {
    setNotifs(prev => prev.map(n => ({ ...n, leida: true })));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Backdrop solo en la parte de abajo */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Panel que baja desde arriba */}
      <SafeAreaView
        style={[styles.panel, { backgroundColor: theme.bg, borderColor: theme.border }]}
        edges={['top']}
      >
        {/* Header */}
        <View style={[styles.panelHeader, { borderBottomColor: theme.border }]}>
          <View style={styles.panelHeaderLeft}>
            <Text style={[styles.panelTitle, { color: theme.textPrimary }]}>Notificaciones</Text>
            {sinLeer > 0 && (
              <View style={[styles.countBadge, { backgroundColor: theme.primaryMuted, borderColor: theme.primary + '50' }]}>
                <Text style={[styles.countBadgeText, { color: theme.primary }]}>{sinLeer} nuevas</Text>
              </View>
            )}
          </View>
          <View style={styles.panelHeaderRight}>
            {sinLeer > 0 && (
              <TouchableOpacity onPress={marcarTodasLeidas} activeOpacity={0.7}>
                <Text style={[styles.markAllText, { color: theme.primary }]}>Marcar todas</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Lista */}
        <ScrollView showsVerticalScrollIndicator={false}>
          {notifs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={40} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textTertiary }]}>Sin notificaciones</Text>
            </View>
          ) : (
            notifs.map(n => (
              <NotifItem key={n.id} notif={n} onPress={() => marcarLeida(n.id)} />
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#00000033',
  },

  panel: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    maxHeight: '70%',
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
    borderWidth: 1,
    borderTopWidth: 0,
    overflow: 'hidden',
  },

  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  panelHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  panelHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  panelTitle: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
  },
  countBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  countBadgeText: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
  },
  markAllText: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
  },
  closeBtn: {
    padding: spacing.xs,
  },

  notifItem: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  notifIconWrap: {
    width: 40, height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notifContent: { flex: 1 },
  notifTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  notifTitulo: {
    fontSize: typography.base,
    fontWeight: typography.medium,
    flex: 1,
  },
  unreadDot: {
    width: 8, height: 8,
    borderRadius: 4,
    marginLeft: spacing.sm,
  },
  notifCuerpo: {
    fontSize: typography.sm,
    lineHeight: 18,
    marginBottom: 4,
  },
  notifTime: {
    fontSize: typography.xs,
  },

  emptyState: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    fontSize: typography.base,
  },
});