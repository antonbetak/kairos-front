import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, radii } from '../styles/theme';
import {
  listarNotificaciones,
  marcarLeida as marcarLeidaService,
  marcarTodasLeidas as marcarTodasLeidasService,
  type Notificacion,
} from '../services/notificationsService';
import { getAccessToken } from '../store/authStore';


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

type IconName = keyof typeof Ionicons.glyphMap;

const tipoIcon: Record<string, { name: IconName; color: (theme: any) => string }> = {
  logro:         { name: 'trophy-outline',              color: t => t.warning },
  racha:         { name: 'flame-outline',               color: t => t.warning },
  cumplimiento:  { name: 'checkmark-circle-outline',    color: t => t.success },
  recordatorio:  { name: 'alarm-outline',               color: t => t.secondary },
  sistema:       { name: 'information-circle-outline',  color: t => t.textSecondary },
  tarea:         { name: 'checkbox-outline',            color: t => t.primary },
};

function getIconConfig(tipo: string) {
  return tipoIcon[tipo] ?? tipoIcon.sistema;
}


function NotifItem({ notif, onPress }: { notif: Notificacion; onPress: () => void }) {
  const { theme } = useTheme();
  const icon = getIconConfig(notif.tipo);

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
      <View style={[styles.notifIconWrap, { backgroundColor: theme.surfaceElevated }]}>
        <Ionicons name={icon.name} size={20} color={icon.color(theme)} />
      </View>

      <View style={styles.notifContent}>
        <View style={styles.notifTopRow}>
          <Text
            style={[
              styles.notifTitulo,
              { color: theme.textPrimary },
              !notif.leida && { fontWeight: typography.bold },
            ]}
            numberOfLines={1}
          >
            {notif.titulo}
          </Text>
          {!notif.leida && (
            <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />
          )}
        </View>
        <Text style={[styles.notifCuerpo, { color: theme.textSecondary }]} numberOfLines={2}>
          {notif.mensaje}
        </Text>
        <Text style={[styles.notifTime, { color: theme.textTertiary }]}>
          {tiempoRelativo(notif.fecha_creacion)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}


interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function NotificationsModal({ visible, onClose }: Props) {
  const { theme } = useTheme();
  const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sinLeer = notifs.filter(n => !n.leida).length;

  const cargarNotificaciones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('No hay sesión activa');
      const data = await listarNotificaciones(token);
      setNotifs(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) cargarNotificaciones();
  }, [visible, cargarNotificaciones]);

  const handleMarcarLeida = async (id: string) => {
    // Optimistic update
    setNotifs(prev => prev.map(n => n.id_notificacion === id ? { ...n, leida: true } : n));
    try {
      const token = await getAccessToken();
      if (!token) return;
      await marcarLeidaService(token, id);
    } catch {
      // Revert on error
      cargarNotificaciones();
    }
  };

  const handleMarcarTodasLeidas = async () => {
    setNotifs(prev => prev.map(n => ({ ...n, leida: true })));
    try {
      const token = await getAccessToken();
      if (!token) return;
      await marcarTodasLeidasService(token);
    } catch {
      cargarNotificaciones();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />

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
              <TouchableOpacity onPress={handleMarcarTodasLeidas} activeOpacity={0.7}>
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
          {loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: spacing.xl }} />
          ) : error ? (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle-outline" size={40} color={theme.error} />
              <Text style={[styles.emptyText, { color: theme.error }]}>{error}</Text>
            </View>
          ) : notifs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={40} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textTertiary }]}>Sin notificaciones</Text>
            </View>
          ) : (
            notifs.map(n => (
              <NotifItem
                key={n.id_notificacion}
                notif={n}
                onPress={() => handleMarcarLeida(n.id_notificacion)}
              />
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}


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
  panelHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  panelHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  panelTitle: { fontSize: typography.xl, fontWeight: typography.bold },
  countBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.full, borderWidth: 1 },
  countBadgeText: { fontSize: typography.xs, fontWeight: typography.semibold },
  markAllText: { fontSize: typography.sm, fontWeight: typography.medium },
  closeBtn: { padding: spacing.xs },

  notifItem: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  notifIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notifContent: { flex: 1 },
  notifTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  notifTitulo: { fontSize: typography.base, fontWeight: typography.medium, flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: spacing.sm },
  notifCuerpo: { fontSize: typography.sm, lineHeight: 18, marginBottom: 4 },
  notifTime: { fontSize: typography.xs },

  emptyState: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxxl },
  emptyText: { fontSize: typography.base },
});