import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
  Share,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, radii } from '../styles/theme';
import { getAccessToken, getStoredUser } from '../store/authStore';
import {
  obtenerFeed,
  listarAmigos,
  crearInvitacion,
  aceptarSolicitud,
  aceptarInvitacion,
  reaccionarEvento,
  obtenerPerfilUsuario,
  type ActivityEvent,
  type Friendship,
  type UserProfile,
} from '../services/activityService';

type IoniconsName = keyof typeof Ionicons.glyphMap;


function tiempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  const hrs = Math.floor(min / 60);
  const dias = Math.floor(hrs / 24);
  if (min < 1)  return 'ahora';
  if (min < 60) return `hace ${min} min`;
  if (hrs < 24) return `hace ${hrs} h`;
  return `hace ${dias} día${dias > 1 ? 's' : ''}`;
}

const EVENT_ICONS: Record<string, { icon: IoniconsName; color: (t: any) => string }> = {
  tarea_completada:  { icon: 'checkmark-circle-outline', color: t => t.success },
  logro:             { icon: 'trophy-outline',            color: t => t.warning },
  racha:             { icon: 'flame-outline',             color: t => t.warning },
  habito_completado: { icon: 'repeat-outline',            color: t => t.primary },
  horario_creado:    { icon: 'calendar-outline',          color: t => t.secondary },
  default:           { icon: 'ellipse-outline',           color: t => t.textTertiary },
};

function getEventIcon(eventType: string) {
  return EVENT_ICONS[eventType] ?? EVENT_ICONS.default;
}

const REACTIONS: Array<{ key: string; icon: IoniconsName }> = [
  { key: 'applause', icon: 'hand-left-outline' },
  { key: 'fire',     icon: 'flame-outline' },
  { key: 'heart',    icon: 'heart-outline' },
];


function Avatar({ profile, size = 40 }: { profile?: UserProfile; size?: number }) {
  const { theme } = useTheme();
  const initials = profile?.nombre
    ? profile.nombre.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  if (profile?.avatar_url) {
    return (
      <Image
        source={{ uri: profile.avatar_url }}
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <View style={[
      styles.avatarPlaceholder,
      { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.primaryMuted },
    ]}>
      <Text style={[styles.avatarInitials, { color: theme.primary, fontSize: size * 0.35 }]}>
        {initials}
      </Text>
    </View>
  );
}


function FeedItem({
  event,
  myId,
  profile,
  onReact,
}: {
  event: ActivityEvent;
  myId: string;
  profile?: UserProfile;
  onReact: (id: string, reaction: string) => void;
}) {
  const { theme } = useTheme();
  const iconConfig = getEventIcon(event.event_type);
  const isMine = event.actor_id === myId;

  return (
    <View style={[styles.feedItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.feedItemHeader}>
        <Avatar profile={profile} size={40} />
        <View style={styles.feedItemMeta}>
          <View style={styles.feedItemTitleRow}>
            <View style={[styles.feedEventIcon, { backgroundColor: iconConfig.color(theme) + '20' }]}>
              <Ionicons name={iconConfig.icon} size={14} color={iconConfig.color(theme)} />
            </View>
            <Text style={[styles.feedItemName, { color: theme.textPrimary }]}>
              {isMine ? 'Tú' : profile?.nombre ?? 'Usuario'}
            </Text>
          </View>
          <Text style={[styles.feedItemTime, { color: theme.textTertiary }]}>
            {tiempoRelativo(event.created_at)}
          </Text>
        </View>
      </View>

      <Text style={[styles.feedItemTitle, { color: theme.textPrimary }]}>{event.title}</Text>
      {event.message && (
        <Text style={[styles.feedItemMessage, { color: theme.textSecondary }]}>{event.message}</Text>
      )}

      {/* Reacciones — solo si no es mi publicación */}
      {!isMine && (
        <View style={styles.feedItemActions}>
          {REACTIONS.map(r => (
            <TouchableOpacity
              key={r.key}
              style={[styles.reactionBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
              onPress={() => onReact(event.id_evento, r.key)}
              activeOpacity={0.7}
            >
              <Ionicons name={r.icon} size={15} color={theme.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}


function FriendItem({
  friendship,
  myId,
  profile,
  onAccept,
}: {
  friendship: Friendship;
  myId: string;
  profile?: UserProfile;
  onAccept?: (id: string) => void;
}) {
  const { theme } = useTheme();
  const isPending = friendship.status === 'pending';
  const isIncoming = isPending && friendship.addressee_id === myId;
  const isOutgoing = isPending && friendship.requester_id === myId;

  return (
    <View style={[styles.friendItem, { borderBottomColor: theme.border }]}>
      <Avatar profile={profile} size={44} />
      <View style={styles.friendInfo}>
        <Text style={[styles.friendName, { color: theme.textPrimary }]}>
          {profile?.nombre ?? 'Usuario'}
        </Text>
        <Text style={[styles.friendStatus, { color: theme.textTertiary }]}>
          {friendship.status === 'accepted'
            ? 'Amigo'
            : isOutgoing
            ? 'Solicitud enviada'
            : 'Solicitud recibida'}
        </Text>
      </View>
      {isIncoming && onAccept && (
        <TouchableOpacity
          style={[styles.acceptBtn, { backgroundColor: theme.primaryMuted, borderColor: theme.primary + '50' }]}
          onPress={() => onAccept(friendship.id)}
          activeOpacity={0.8}
        >
          <Text style={[styles.acceptBtnText, { color: theme.primary }]}>Aceptar</Text>
        </TouchableOpacity>
      )}
      {friendship.status === 'accepted' && (
        <Ionicons name="checkmark-circle-outline" size={20} color={theme.success} />
      )}
    </View>
  );
}


type Tab = 'feed' | 'amigos';

export default function CommunityScreen() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [feed, setFeed] = useState<ActivityEvent[]>([]);
  const [amigos, setAmigos] = useState<Friendship[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myId, setMyId] = useState('');
  const [codigoInvite, setCodigoInvite] = useState('');
  const [inputCodigo, setInputCodigo] = useState('');
  const [loadingInvite, setLoadingInvite] = useState(false);
  const profileCache = useRef<Record<string, UserProfile>>({});

  const cargarPerfil = useCallback(async (userId: string, token: string) => {
    if (profileCache.current[userId]) return;
    try {
      const perfil = await obtenerPerfilUsuario(token, userId);
      profileCache.current[userId] = perfil;
      setProfiles(prev => ({ ...prev, [userId]: perfil }));
    } catch {
      // Si falla, no bloqueamos
    }
  }, []);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const user = await getStoredUser();
      if (!token) throw new Error('No hay sesión activa');

      const userId = user?.id_usuario ?? '';
      setMyId(userId);

      const [feedData, amigosData] = await Promise.all([
        obtenerFeed(token),
        listarAmigos(token),
      ]);

      setFeed(feedData);
      setAmigos(amigosData);

      // Cargar perfiles de todos los actores únicos
      const actorIds = [...new Set([
        ...feedData.map(e => e.actor_id),
        ...amigosData.map(a => a.requester_id),
        ...amigosData.map(a => a.addressee_id),
      ])].filter(id => id !== userId);

      for (const id of actorIds) {
        cargarPerfil(id, token);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [cargarPerfil]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const handleReact = async (eventId: string, reaction: string) => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      await reaccionarEvento(token, eventId, reaction);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleAceptarSolicitud = async (friendshipId: string) => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const actualizada = await aceptarSolicitud(token, friendshipId);
      setAmigos(prev => prev.map(a => a.id === friendshipId ? actualizada : a));
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleGenerarInvite = async () => {
    setLoadingInvite(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const invite = await crearInvitacion(token);
      setCodigoInvite(invite.code);
      await Share.share({
        message: `¡Únete a Kairos! Usa este código: ${invite.code}`,
        title: 'Invitación a Kairos',
      });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoadingInvite(false);
    }
  };

  const handleAceptarInvite = async () => {
    if (!inputCodigo.trim()) return;
    try {
      const token = await getAccessToken();
      if (!token) return;
      await aceptarInvitacion(token, inputCodigo.trim());
      setInputCodigo('');
      Alert.alert('¡Listo!', 'Ahora son amigos en Kairos.');
      cargarDatos();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Código inválido o expirado');
    }
  };

  const TABS: Array<{ key: Tab; label: string; icon: IoniconsName }> = [
    { key: 'feed',   label: 'Feed',   icon: 'newspaper-outline' },
    { key: 'amigos', label: 'Amigos', icon: 'people-outline' },
  ];

  const pendientes = amigos.filter(a => a.status === 'pending' && a.addressee_id === myId).length;
  const aceptados  = amigos.filter(a => a.status === 'accepted').length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />

      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Comunidad</Text>
        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: theme.primaryMuted, borderColor: theme.primary + '50' }]}
          onPress={cargarDatos}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh-outline" size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.tabRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && { backgroundColor: theme.primary, borderRadius: radii.md }]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.8}
          >
            <Ionicons name={tab.icon} size={16} color={activeTab === tab.key ? theme.textInverse : theme.textSecondary} />
            <Text style={[
              styles.tabText,
              { color: activeTab === tab.key ? theme.textInverse : theme.textSecondary },
              activeTab === tab.key && { fontWeight: typography.bold },
            ]}>
              {tab.label}{tab.key === 'amigos' && pendientes > 0 ? ` (${pendientes})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ flex: 1 }} />
      ) : error ? (
        <View style={styles.errorBox}>
          <Ionicons name="warning-outline" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          <TouchableOpacity onPress={cargarDatos}>
            <Text style={[{ color: theme.primary, fontSize: typography.sm, fontWeight: typography.semibold }]}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : activeTab === 'feed' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {feed.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="newspaper-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Sin actividad</Text>
              <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
                Agrega amigos para ver su actividad aquí.
              </Text>
            </View>
          ) : (
            <View style={styles.feedList}>
              {feed.map(event => (
                <FeedItem
                  key={event.id_evento}
                  event={event}
                  myId={myId}
                  profile={profiles[event.actor_id]}
                  onReact={handleReact}
                />
              ))}
            </View>
          )}
          <View style={{ height: spacing.xxxl }} />
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.primaryMuted, borderColor: theme.primary + '40' }]}>
              <Text style={[styles.statValue, { color: theme.primary }]}>{aceptados}</Text>
              <Text style={[styles.statLabel, { color: theme.primary + 'BB' }]}>Amigos</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
              <Text style={[styles.statValue, { color: theme.textSecondary }]}>{pendientes}</Text>
              <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Pendientes</Text>
            </View>
          </View>

          <View style={[styles.inviteSection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.inviteTitle, { color: theme.textPrimary }]}>Invitar a Kairos</Text>
            <Text style={[styles.inviteSubtitle, { color: theme.textSecondary }]}>
              Genera un código y compártelo con tus amigos
            </Text>
            <TouchableOpacity
              style={[styles.inviteBtn, { backgroundColor: theme.primary }, loadingInvite && { opacity: 0.7 }]}
              onPress={handleGenerarInvite}
              disabled={loadingInvite}
              activeOpacity={0.85}
            >
              {loadingInvite
                ? <ActivityIndicator size="small" color={theme.textInverse} />
                : <>
                    <Ionicons name="share-outline" size={18} color={theme.textInverse} />
                    <Text style={[styles.inviteBtnText, { color: theme.textInverse }]}>Generar invitación</Text>
                  </>
              }
            </TouchableOpacity>
            {codigoInvite !== '' && (
              <View style={[styles.codeBox, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                <Text style={[styles.codeLabel, { color: theme.textTertiary }]}>Tu código:</Text>
                <Text style={[styles.codeText, { color: theme.primary }]}>{codigoInvite}</Text>
              </View>
            )}
          </View>

          <View style={[styles.inviteSection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.inviteTitle, { color: theme.textPrimary }]}>Tengo un código</Text>
            <Text style={[styles.inviteSubtitle, { color: theme.textSecondary }]}>
              Ingresa el código que te compartió tu amigo
            </Text>
            <View style={styles.codeInputRow}>
              <TextInput
                style={[styles.codeInput, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="Pega el código aquí"
                placeholderTextColor={theme.textTertiary}
                value={inputCodigo}
                onChangeText={setInputCodigo}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.codeSubmitBtn, { backgroundColor: theme.primaryMuted, borderColor: theme.primary + '50' }]}
                onPress={handleAceptarInvite}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-forward-outline" size={20} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {amigos.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Mis amigos</Text>
              <View style={[styles.friendsList, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {amigos.map(a => {
                  const otherId = a.requester_id === myId ? a.addressee_id : a.requester_id;
                  return (
                    <FriendItem
                      key={a.id}
                      friendship={a}
                      myId={myId}
                      profile={profiles[otherId]}
                      onAccept={handleAceptarSolicitud}
                    />
                  );
                })}
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
  refreshBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  tabRow: {
    flexDirection: 'row', marginHorizontal: spacing.base,
    borderRadius: radii.lg, borderWidth: 1, padding: 4, marginBottom: spacing.base,
  },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  tabText: { fontSize: typography.sm, fontWeight: typography.medium },

  scrollContent: { paddingHorizontal: spacing.base },

  avatar: { },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontWeight: typography.bold },

  feedList: { gap: spacing.md },
  feedItem: { borderRadius: radii.xl, borderWidth: 1, padding: spacing.base, gap: spacing.sm },
  feedItemHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  feedItemMeta: { flex: 1 },
  feedItemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  feedEventIcon: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  feedItemName: { fontSize: typography.sm, fontWeight: typography.semibold },
  feedItemTime: { fontSize: typography.xs, marginTop: 2 },
  feedItemTitle: { fontSize: typography.base, fontWeight: typography.medium },
  feedItemMessage: { fontSize: typography.sm, lineHeight: 18 },
  feedItemActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  reactionBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  statCard: { flex: 1, borderRadius: radii.xl, borderWidth: 1, padding: spacing.base, alignItems: 'center', gap: 2 },
  statValue: { fontSize: typography.xxl, fontWeight: typography.extrabold },
  statLabel: { fontSize: typography.xs, fontWeight: typography.medium },

  inviteSection: { borderRadius: radii.xl, borderWidth: 1, padding: spacing.base, marginBottom: spacing.md, gap: spacing.sm },
  inviteTitle: { fontSize: typography.base, fontWeight: typography.bold },
  inviteSubtitle: { fontSize: typography.sm },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, height: 48, borderRadius: radii.md },
  inviteBtnText: { fontSize: typography.base, fontWeight: typography.semibold },
  codeBox: { borderRadius: radii.md, borderWidth: 1, padding: spacing.md, alignItems: 'center' },
  codeLabel: { fontSize: typography.xs, marginBottom: 4 },
  codeText: { fontSize: typography.lg, fontWeight: typography.bold, letterSpacing: 2 },
  codeInputRow: { flexDirection: 'row', gap: spacing.sm },
  codeInput: { flex: 1, height: 48, borderRadius: radii.md, borderWidth: 1, paddingHorizontal: spacing.base, fontSize: typography.base },
  codeSubmitBtn: { width: 48, height: 48, borderRadius: radii.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  sectionTitle: { fontSize: typography.lg, fontWeight: typography.bold, marginBottom: spacing.sm, marginTop: spacing.sm },
  friendsList: { borderRadius: radii.xl, borderWidth: 1, overflow: 'hidden' },
  friendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.base, borderBottomWidth: 1 },
  friendInfo: { flex: 1 },
  friendName: { fontSize: typography.base, fontWeight: typography.semibold },
  friendStatus: { fontSize: typography.xs, marginTop: 2 },
  acceptBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.full, borderWidth: 1 },
  acceptBtnText: { fontSize: typography.sm, fontWeight: typography.semibold },

  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  errorText: { fontSize: typography.sm, textAlign: 'center' },
  emptyBox: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.md },
  emptyTitle: { fontSize: typography.xl, fontWeight: typography.bold },
  emptyText: { fontSize: typography.sm, textAlign: 'center', lineHeight: 20 },
});