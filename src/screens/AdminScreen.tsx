import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { makeShadows, radii, spacing, typography } from '../styles/theme';
import { getAccessToken, getStoredUser, type StoredUser } from '../store/authStore';
import {
  deactivateUser,
  deleteUser,
  getTaskMetrics,
  getUserMetrics,
  getUsers,
  type AdminTaskMetrics,
  type AdminUser,
  type AdminUserMetrics,
  type AdminUsersFilters,
} from '../services/adminService';

const PAGE_SIZE = 8;

type SectionTab = 'users' | 'metrics';
type FilterValue = 'all' | 'admin' | 'user';
type ProviderValue = 'all' | 'local' | 'google' | 'clerk';
type StatusValue = 'all' | 'activo' | 'inactivo';
type BannerKind = 'success' | 'error';

interface Props {
  role: string | null;
  onLogout: () => void;
  onFallbackHome: () => void;
}

const INITIAL_FILTERS = {
  rol: 'all' as FilterValue,
  auth_provider: 'all' as ProviderValue,
  activo: 'all' as StatusValue,
};

const PROVIDER_STYLES: Record<Exclude<ProviderValue, 'all'>, { backgroundColor: string; color: string }> = {
  local: { backgroundColor: '#8A8A8A22', color: '#6F6F6F' },
  google: { backgroundColor: '#DB443722', color: '#DB4437' },
  clerk: { backgroundColor: '#7B3FF222', color: '#7B3FF2' },
};

const ROLE_STYLES: Record<string, { backgroundColor: string; color: string }> = {
  admin: { backgroundColor: '#C49A3C22', color: '#B07A1E' },
  user: { backgroundColor: '#8A8A8A22', color: '#6A6A6A' },
};

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '---';
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatFilterValue(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: 'success' | 'error' | 'warning' | 'neutral';
}) {
  const { theme } = useTheme();
  const palette = {
    success: { backgroundColor: theme.successMuted, color: theme.success },
    error: { backgroundColor: theme.errorMuted, color: theme.error },
    warning: { backgroundColor: `${theme.warning}22`, color: theme.warning },
    neutral: { backgroundColor: theme.primaryMuted, color: theme.primary },
  }[tone];

  return (
    <View style={[styles.badge, { backgroundColor: palette.backgroundColor }]}>
      <Text style={[styles.badgeText, { color: palette.color }]}>{label}</Text>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.filterChip,
        { backgroundColor: active ? theme.primaryMuted : theme.surfaceElevated, borderColor: active ? theme.primary : theme.border },
      ]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <Text style={[styles.filterChipText, { color: active ? theme.primary : theme.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: 'success' | 'error' | 'warning' | 'neutral';
}) {
  const { theme } = useTheme();
  const palette = {
    success: { backgroundColor: theme.successMuted, color: theme.success },
    error: { backgroundColor: theme.errorMuted, color: theme.error },
    warning: { backgroundColor: `${theme.warning}22`, color: theme.warning },
    neutral: { backgroundColor: theme.primaryMuted, color: theme.primary },
  }[tone];

  return (
    <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.statIconWrap, { backgroundColor: palette.backgroundColor }]}>
        <Ionicons name={icon} size={18} color={palette.color} />
      </View>
      <Text style={[styles.statValue, { color: theme.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function SectionHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderText}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{title}</Text>
        {subtitle ? <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {actions}
    </View>
  );
}

function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { theme } = useTheme();

  return (
    <View style={[styles.emptyState, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Ionicons name={icon} size={32} color={theme.textTertiary} />
      <Text style={[styles.emptyStateTitle, { color: theme.textPrimary }]}>{title}</Text>
      <Text style={[styles.emptyStateMessage, { color: theme.textSecondary }]}>{message}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.primary }]}
          onPress={onAction}
          activeOpacity={0.85}
        >
          <Text style={[styles.primaryButtonText, { color: theme.textInverse }]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function UsersTable({
  users,
  currentUserId,
  onDeactivate,
  onDelete,
  actionLoadingId,
}: {
  users: AdminUser[];
  currentUserId: string | null;
  onDeactivate: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
  actionLoadingId: string | null;
}) {
  const { theme } = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.table}>
        <View style={[styles.tableHeader, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <Text style={[styles.colName, styles.headerText, { color: theme.textPrimary }]}>Nombre</Text>
          <Text style={[styles.colEmail, styles.headerText, { color: theme.textPrimary }]}>Email</Text>
          <Text style={[styles.colHandle, styles.headerText, { color: theme.textPrimary }]}>Handle</Text>
          <Text style={[styles.colRole, styles.headerText, { color: theme.textPrimary }]}>Rol</Text>
          <Text style={[styles.colProvider, styles.headerText, { color: theme.textPrimary }]}>Auth provider</Text>
          <Text style={[styles.colStatus, styles.headerText, { color: theme.textPrimary }]}>Estado</Text>
          <Text style={[styles.colDate, styles.headerText, { color: theme.textPrimary }]}>Registro</Text>
          <Text style={[styles.colActions, styles.headerText, { color: theme.textPrimary }]}>Acciones</Text>
        </View>

        {users.map(user => {
          const isSelf = currentUserId ? currentUserId === user.id_usuario : false;
          const isAdmin = user.rol === 'admin';
          const canDeactivate = user.activo && !isAdmin;
          const canDelete = !isAdmin;
          const loadingThisRow = actionLoadingId === user.id_usuario;
          const providerStyle = PROVIDER_STYLES[(user.auth_provider || 'local') as Exclude<ProviderValue, 'all'>] ?? PROVIDER_STYLES.local;
          const roleStyle = ROLE_STYLES[user.rol] ?? ROLE_STYLES.user;

          return (
            <View
              key={user.id_usuario}
              style={[
                styles.tableRow,
                { borderColor: theme.border, backgroundColor: isSelf ? theme.primaryMuted : theme.surface },
                !user.activo && { opacity: 0.78 },
              ]}
            >
              <Text style={[styles.cellText, styles.colName, { color: theme.textPrimary }]} numberOfLines={2}>
                {user.nombre}
                {isSelf ? ' (tú)' : ''}
              </Text>
              <Text style={[styles.cellText, styles.colEmail, { color: theme.textSecondary }]} numberOfLines={2}>
                {user.email}
              </Text>
              <Text style={[styles.cellText, styles.colHandle, { color: theme.textSecondary }]} numberOfLines={1}>
                {user.handle || '---'}
              </Text>
              <View style={styles.colRole}>
                <View style={[styles.inlineBadge, { backgroundColor: roleStyle.backgroundColor }]}>
                  <Text style={[styles.inlineBadgeText, { color: roleStyle.color }]}>{formatFilterValue(user.rol || 'user')}</Text>
                </View>
              </View>
              <View style={styles.colProvider}>
                <View style={[styles.inlineBadge, { backgroundColor: providerStyle.backgroundColor }]}>
                  <Text style={[styles.inlineBadgeText, { color: providerStyle.color }]}>
                    {formatFilterValue(user.auth_provider || 'local')}
                  </Text>
                </View>
              </View>
              <View style={styles.colStatus}>
                {user.activo ? <StatusBadge label="Activo" tone="success" /> : <StatusBadge label="Inactivo" tone="error" />}
              </View>
              <Text style={[styles.cellText, styles.colDate, { color: theme.textSecondary }]}>{formatDate(user.created_at)}</Text>
              <View style={styles.colActions}>
                {loadingThisRow ? (
                  <ActivityIndicator color={theme.primary} />
                ) : (
                  <View style={styles.actionsWrap}>
                    {canDeactivate ? (
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.warning + '22', borderColor: theme.warning + '55' }]}
                        onPress={() => onDeactivate(user)}
                        activeOpacity={0.84}
                      >
                        <Ionicons name="pause-circle-outline" size={14} color={theme.warning} />
                        <Text style={[styles.actionButtonText, { color: theme.warning }]}>Desactivar</Text>
                      </TouchableOpacity>
                    ) : null}
                    {canDelete ? (
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          { backgroundColor: theme.errorMuted, borderColor: theme.error + '55' },
                          isSelf && styles.disabledActionButton,
                        ]}
                        onPress={() => onDelete(user)}
                        activeOpacity={0.84}
                        disabled={isSelf}
                      >
                        <Ionicons name="trash-outline" size={14} color={theme.error} />
                        <Text style={[styles.actionButtonText, { color: theme.error }]}>Eliminar</Text>
                      </TouchableOpacity>
                    ) : null}
                    {isSelf ? (
                      <Text style={[styles.selfNote, { color: theme.textTertiary }]}>Protegido</Text>
                    ) : null}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function UserMetricsPanel({ metrics }: { metrics: AdminUserMetrics }) {
  const { theme } = useTheme();
  const providers = Object.entries(metrics.byProvider ?? {});
  const roles = Object.entries(metrics.byRole ?? {});

  return (
    <View style={styles.metricsGrid}>
      <View style={styles.metricsCardsRow}>
        <StatCard label="Total de usuarios" value={metrics.total} icon="people-outline" />
        <StatCard label="Usuarios activos" value={metrics.active} icon="checkmark-circle-outline" tone="success" />
        <StatCard label="Usuarios inactivos" value={metrics.inactive} icon="close-circle-outline" tone="error" />
      </View>

      <View style={[styles.metricsBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.metricsBoxTitle, { color: theme.textPrimary }]}>Por auth provider</Text>
        <View style={styles.chipWrap}>
          {providers.length > 0 ? (
            providers.map(([key, value]) => (
              <View key={key} style={[styles.metricChip, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                <Text style={[styles.metricChipKey, { color: theme.textSecondary }]}>{formatFilterValue(key)}</Text>
                <Text style={[styles.metricChipValue, { color: theme.textPrimary }]}>{String(value)}</Text>
              </View>
            ))
          ) : (
            <Text style={[styles.metricsBoxEmpty, { color: theme.textTertiary }]}>Sin desglose disponible</Text>
          )}
        </View>
      </View>

      <View style={[styles.metricsBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.metricsBoxTitle, { color: theme.textPrimary }]}>Por rol</Text>
        <View style={styles.chipWrap}>
          {roles.length > 0 ? (
            roles.map(([key, value]) => (
              <View key={key} style={[styles.metricChip, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                <Text style={[styles.metricChipKey, { color: theme.textSecondary }]}>{formatFilterValue(key)}</Text>
                <Text style={[styles.metricChipValue, { color: theme.textPrimary }]}>{String(value)}</Text>
              </View>
            ))
          ) : (
            <Text style={[styles.metricsBoxEmpty, { color: theme.textTertiary }]}>Sin desglose disponible</Text>
          )}
        </View>
      </View>
    </View>
  );
}

function TaskMetricsPanel({ metrics }: { metrics: AdminTaskMetrics }) {
  const { theme } = useTheme();
  const hasErrors = metrics.taskError > 0 || metrics.scheduleError > 0;

  return (
    <View style={styles.metricsGrid}>
      <View style={styles.metricsCardsRow}>
        <StatCard label="Tareas creadas hoy" value={metrics.createdToday} icon="today-outline" />
        <StatCard label="Últimos 7 días" value={metrics.createdLast7Days} icon="calendar-outline" />
        <StatCard label="Últimos 30 días" value={metrics.createdLast30Days} icon="calendar-number-outline" />
      </View>

      <View
        style={[
          styles.metricsAlertBox,
          { backgroundColor: hasErrors ? theme.errorMuted : theme.successMuted, borderColor: hasErrors ? theme.error + '50' : theme.success + '55' },
        ]}
      >
        <View style={styles.metricsAlertHeader}>
          <Ionicons
            name={hasErrors ? 'warning-outline' : 'checkmark-circle-outline'}
            size={20}
            color={hasErrors ? theme.error : theme.success}
          />
          <Text style={[styles.metricsBoxTitle, { color: hasErrors ? theme.error : theme.success }]}>Estado de errores</Text>
        </View>
        <View style={styles.errorMetricsRow}>
          <View style={styles.errorMetricItem}>
            <Text style={[styles.errorMetricLabel, { color: theme.textSecondary }]}>task_error</Text>
            <Text style={[styles.errorMetricValue, { color: hasErrors ? theme.error : theme.success }]}>{metrics.taskError}</Text>
          </View>
          <View style={styles.errorMetricItem}>
            <Text style={[styles.errorMetricLabel, { color: theme.textSecondary }]}>schedule_error</Text>
            <Text style={[styles.errorMetricValue, { color: hasErrors ? theme.error : theme.success }]}>{metrics.scheduleError}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function AdminScreen({ role, onLogout, onFallbackHome }: Props) {
  const { theme } = useTheme();
  const shadows = makeShadows(theme.shadowColor);

  const [section, setSection] = useState<SectionTab>('users');
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pageInfo, setPageInfo] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [userMetrics, setUserMetrics] = useState<AdminUserMetrics | null>(null);
  const [taskMetrics, setTaskMetrics] = useState<AdminTaskMetrics | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: BannerKind; text: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [currentUserLoaded, setCurrentUserLoaded] = useState(false);

  useEffect(() => {
    if (role !== 'admin') {
      onFallbackHome();
    }
  }, [onFallbackHome, role]);

  useEffect(() => {
    let mounted = true;
    getStoredUser().then(user => {
      if (mounted) {
        setCurrentUser(user);
        setCurrentUserLoaded(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!banner) return;
    const timeout = setTimeout(() => setBanner(null), 2800);
    return () => clearTimeout(timeout);
  }, [banner]);

  const requireToken = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('No hay sesión activa');
    }
    return token;
  }, []);

  const normalizedFilters = useMemo<AdminUsersFilters>(() => ({
    rol: filters.rol === 'all' ? undefined : filters.rol,
    auth_provider: filters.auth_provider === 'all' ? undefined : filters.auth_provider,
    activo: filters.activo === 'all' ? undefined : filters.activo === 'activo',
  }), [filters]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const token = await requireToken();
      const response = await getUsers(normalizedFilters, page, PAGE_SIZE, token);
      setUsers(response.items);
      setPageInfo({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (error: any) {
      setUsersError(error?.message || 'No se pudieron cargar los usuarios');
    } finally {
      setUsersLoading(false);
    }
  }, [normalizedFilters, page, requireToken]);

  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const token = await requireToken();
      const [usersResponse, tasksResponse] = await Promise.all([getUserMetrics(token), getTaskMetrics(token)]);
      setUserMetrics(usersResponse);
      setTaskMetrics(tasksResponse);
    } catch (error: any) {
      setMetricsError(error?.message || 'No se pudieron cargar las métricas');
    } finally {
      setMetricsLoading(false);
    }
  }, [requireToken]);

  useEffect(() => {
    if (section === 'users') {
      loadUsers();
    }
  }, [loadUsers, section]);

  useEffect(() => {
    if (section === 'metrics') {
      loadMetrics();
    }
  }, [loadMetrics, section]);

  const refreshCurrentSection = useCallback(async () => {
    if (section === 'users') {
      await loadUsers();
    }
    if (section === 'metrics') {
      await loadMetrics();
    }
  }, [loadMetrics, loadUsers, section]);

  const setFilterValue = useCallback(
    (key: keyof typeof filters, value: FilterValue | ProviderValue | StatusValue) => {
      setPage(1);
      setFilters(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  const runUserAction = useCallback(async (user: AdminUser, action: 'deactivate' | 'delete') => {
    setActionLoadingId(user.id_usuario);
    try {
      const token = await requireToken();
      if (action === 'deactivate') {
        await deactivateUser(user.id_usuario, token);
        setBanner({ kind: 'success', text: `Usuario ${user.nombre} desactivado` });
      } else {
        await deleteUser(user.id_usuario, token);
        setBanner({ kind: 'success', text: `Usuario ${user.nombre} eliminado` });
      }
      await refreshCurrentSection();
    } catch (error: any) {
      setBanner({ kind: 'error', text: error?.message || 'La acción no se pudo completar' });
    } finally {
      setActionLoadingId(null);
    }
  }, [refreshCurrentSection, requireToken]);

  const confirmDeactivate = useCallback((user: AdminUser) => {
    Alert.alert(
      'Desactivar usuario',
      `Vas a desactivar a ${user.nombre}. Esta acción bloqueará su acceso hasta que sea reactivado desde el backend.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Desactivar', style: 'destructive', onPress: () => runUserAction(user, 'deactivate') },
      ]
    );
  }, [runUserAction]);

  const confirmDelete = useCallback((user: AdminUser) => {
    Alert.alert(
      'Eliminar usuario',
      `Esta acción eliminará de forma definitiva a ${user.nombre}. Verifica que no necesites recuperar su cuenta antes de continuar.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => runUserAction(user, 'delete') },
      ]
    );
  }, [runUserAction]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }, shadows.md]}>
        <View style={styles.headerCopy}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Panel de administración</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Gestión de usuarios y métricas internas</Text>
        </View>
        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]} onPress={onLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={theme.textSecondary} />
          <Text style={[styles.logoutText, { color: theme.textSecondary }]}>Salir</Text>
        </TouchableOpacity>
      </View>

      {banner ? (
        <View style={[
          styles.banner,
          { backgroundColor: banner.kind === 'success' ? theme.successMuted : theme.errorMuted, borderColor: banner.kind === 'success' ? theme.success + '55' : theme.error + '55' },
        ]}>
          <Ionicons
            name={banner.kind === 'success' ? 'checkmark-circle-outline' : 'warning-outline'}
            size={18}
            color={banner.kind === 'success' ? theme.success : theme.error}
          />
          <Text style={[styles.bannerText, { color: banner.kind === 'success' ? theme.success : theme.error }]}>{banner.text}</Text>
        </View>
      ) : null}

      <View style={styles.sectionTabs}>
        <TouchableOpacity
          style={[
            styles.sectionTab,
            { backgroundColor: section === 'users' ? theme.primaryMuted : theme.surfaceElevated, borderColor: section === 'users' ? theme.primary : theme.border },
          ]}
          onPress={() => setSection('users')}
          activeOpacity={0.84}
        >
          <Ionicons name="people-outline" size={18} color={section === 'users' ? theme.primary : theme.textSecondary} />
          <Text style={[styles.sectionTabText, { color: section === 'users' ? theme.primary : theme.textSecondary }]}>Usuarios</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.sectionTab,
            { backgroundColor: section === 'metrics' ? theme.primaryMuted : theme.surfaceElevated, borderColor: section === 'metrics' ? theme.primary : theme.border },
          ]}
          onPress={() => setSection('metrics')}
          activeOpacity={0.84}
        >
          <Ionicons name="stats-chart-outline" size={18} color={section === 'metrics' ? theme.primary : theme.textSecondary} />
          <Text style={[styles.sectionTabText, { color: section === 'metrics' ? theme.primary : theme.textSecondary }]}>Métricas</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {section === 'users' ? (
          <View style={styles.panel}>
            <SectionHeader
              title="Usuarios"
              subtitle="Filtra, revisa y administra el estado de cada cuenta"
              actions={(
                <TouchableOpacity
                  style={[styles.secondaryButton, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
                  onPress={loadUsers}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh-outline" size={16} color={theme.textSecondary} />
                  <Text style={[styles.secondaryButtonText, { color: theme.textSecondary }]}>Actualizar</Text>
                </TouchableOpacity>
              )}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
              <View style={styles.filterGroup}>
                <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Rol</Text>
                <View style={styles.filterChipsRow}>
                  <FilterChip label="Todos" active={filters.rol === 'all'} onPress={() => setFilterValue('rol', 'all')} />
                  <FilterChip label="User" active={filters.rol === 'user'} onPress={() => setFilterValue('rol', 'user')} />
                  <FilterChip label="Admin" active={filters.rol === 'admin'} onPress={() => setFilterValue('rol', 'admin')} />
                </View>
              </View>

              <View style={styles.filterGroup}>
                <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Auth provider</Text>
                <View style={styles.filterChipsRow}>
                  <FilterChip label="Todos" active={filters.auth_provider === 'all'} onPress={() => setFilterValue('auth_provider', 'all')} />
                  <FilterChip label="Local" active={filters.auth_provider === 'local'} onPress={() => setFilterValue('auth_provider', 'local')} />
                  <FilterChip label="Google" active={filters.auth_provider === 'google'} onPress={() => setFilterValue('auth_provider', 'google')} />
                  <FilterChip label="Clerk" active={filters.auth_provider === 'clerk'} onPress={() => setFilterValue('auth_provider', 'clerk')} />
                </View>
              </View>

              <View style={styles.filterGroup}>
                <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Estado</Text>
                <View style={styles.filterChipsRow}>
                  <FilterChip label="Todos" active={filters.activo === 'all'} onPress={() => setFilterValue('activo', 'all')} />
                  <FilterChip label="Activo" active={filters.activo === 'activo'} onPress={() => setFilterValue('activo', 'activo')} />
                  <FilterChip label="Inactivo" active={filters.activo === 'inactivo'} onPress={() => setFilterValue('activo', 'inactivo')} />
                </View>
              </View>
            </ScrollView>

            <View style={[styles.listCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {usersLoading ? (
                <View style={styles.loadingState}>
                  <ActivityIndicator color={theme.primary} />
                  <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Cargando usuarios...</Text>
                </View>
              ) : usersError ? (
                <EmptyState
                  icon="alert-circle-outline"
                  title="No pudimos cargar los usuarios"
                  message={usersError}
                  actionLabel="Reintentar"
                  onAction={loadUsers}
                />
              ) : users.length === 0 ? (
                <EmptyState
                  icon="people-outline"
                  title="Sin resultados"
                  message="No hay usuarios que coincidan con los filtros actuales."
                  actionLabel="Limpiar filtros"
                  onAction={() => {
                    setPage(1);
                    setFilters(INITIAL_FILTERS);
                  }}
                />
              ) : (
                <UsersTable
                  users={users}
                  currentUserId={currentUser?.id_usuario ?? null}
                  onDeactivate={confirmDeactivate}
                  onDelete={confirmDelete}
                  actionLoadingId={actionLoadingId}
                />
              )}
            </View>

            <View style={styles.paginationRow}>
              <TouchableOpacity
                style={[
                  styles.pageButton,
                  { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
                  page <= 1 && styles.pageButtonDisabled,
                ]}
                onPress={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page <= 1 || usersLoading}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-back" size={16} color={page <= 1 ? theme.textTertiary : theme.textSecondary} />
                <Text style={[styles.pageButtonText, { color: page <= 1 ? theme.textTertiary : theme.textSecondary }]}>Anterior</Text>
              </TouchableOpacity>

              <Text style={[styles.pageInfo, { color: theme.textSecondary }]}>
                Página {pageInfo.page} de {pageInfo.totalPages} · {pageInfo.total} usuarios
              </Text>

              <TouchableOpacity
                style={[
                  styles.pageButton,
                  { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
                  page >= pageInfo.totalPages && styles.pageButtonDisabled,
                ]}
                onPress={() => setPage(prev => prev + 1)}
                disabled={page >= pageInfo.totalPages || usersLoading}
                activeOpacity={0.8}
              >
                <Text style={[styles.pageButtonText, { color: page >= pageInfo.totalPages ? theme.textTertiary : theme.textSecondary }]}>Siguiente</Text>
                <Ionicons name="chevron-forward" size={16} color={page >= pageInfo.totalPages ? theme.textTertiary : theme.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.panel}>
            <SectionHeader
              title="Métricas"
              subtitle="Resumen de usuarios y actividad de tareas"
              actions={(
                <TouchableOpacity
                  style={[styles.secondaryButton, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
                  onPress={loadMetrics}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh-outline" size={16} color={theme.textSecondary} />
                  <Text style={[styles.secondaryButtonText, { color: theme.textSecondary }]}>Actualizar</Text>
                </TouchableOpacity>
              )}
            />

            {metricsLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Cargando métricas...</Text>
              </View>
            ) : metricsError ? (
              <EmptyState
                icon="alert-circle-outline"
                title="No pudimos cargar las métricas"
                message={metricsError}
                actionLabel="Reintentar"
                onAction={loadMetrics}
              />
            ) : (
              <View style={styles.metricsContent}>
                {userMetrics ? <UserMetricsPanel metrics={userMetrics} /> : null}
                {taskMetrics ? <TaskMetricsPanel metrics={taskMetrics} /> : null}
              </View>
            )}
          </View>
        )}

        {!currentUserLoaded ? (
          <View style={[styles.loadingHint, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ActivityIndicator color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Sincronizando sesión...</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.base,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.xl,
    fontWeight: typography.extrabold,
  },
  headerSubtitle: {
    fontSize: typography.sm,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  logoutText: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.lg,
  },
  bannerText: {
    flex: 1,
    fontSize: typography.sm,
    fontWeight: typography.medium,
  },
  sectionTabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
  },
  sectionTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  sectionTabText: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.base,
  },
  panel: {
    gap: spacing.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.base,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: typography.lg,
    fontWeight: typography.extrabold,
  },
  sectionSubtitle: {
    marginTop: 2,
    fontSize: typography.sm,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
  },
  filtersRow: {
    gap: spacing.base,
    paddingVertical: spacing.xs,
  },
  filterGroup: {
    minWidth: 320,
    gap: spacing.xs,
  },
  filterLabel: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  filterChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
  },
  listCard: {
    borderWidth: 1,
    borderRadius: radii.xl,
    overflow: 'hidden',
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 220,
    padding: spacing.xl,
  },
  loadingHint: {
    marginTop: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderRadius: radii.lg,
  },
  loadingText: {
    fontSize: typography.sm,
  },
  table: {
    minWidth: 980,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: spacing.md,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: spacing.md,
  },
  headerText: {
    fontSize: typography.xs,
    fontWeight: typography.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cellText: {
    fontSize: typography.sm,
  },
  colName: {
    width: 150,
    paddingHorizontal: spacing.base,
  },
  colEmail: {
    width: 200,
    paddingHorizontal: spacing.base,
  },
  colHandle: {
    width: 120,
    paddingHorizontal: spacing.base,
  },
  colRole: {
    width: 110,
    paddingHorizontal: spacing.base,
  },
  colProvider: {
    width: 130,
    paddingHorizontal: spacing.base,
  },
  colStatus: {
    width: 110,
    paddingHorizontal: spacing.base,
  },
  colDate: {
    width: 130,
    paddingHorizontal: spacing.base,
  },
  colActions: {
    width: 220,
    paddingHorizontal: spacing.base,
    alignItems: 'flex-start',
  },
  inlineBadge: {
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  inlineBadgeText: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
  },
  actionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  disabledActionButton: {
    opacity: 0.45,
  },
  actionButtonText: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
  },
  selfNote: {
    fontSize: typography.xs,
    fontWeight: typography.medium,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 220,
    padding: spacing.xl,
    borderWidth: 1,
    borderRadius: radii.xl,
  },
  emptyStateTitle: {
    fontSize: typography.lg,
    fontWeight: typography.bold,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: typography.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryButton: {
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
  primaryButtonText: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    flexWrap: 'wrap',
    paddingHorizontal: spacing.xs,
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pageButtonDisabled: {
    opacity: 0.45,
  },
  pageButtonText: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
  },
  pageInfo: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
  },
  metricsContent: {
    gap: spacing.base,
  },
  metricsGrid: {
    gap: spacing.base,
  },
  metricsCardsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  statCard: {
    flexGrow: 1,
    flexBasis: 160,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.base,
    gap: spacing.sm,
  },
  statIconWrap: {
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    padding: spacing.sm,
  },
  statValue: {
    fontSize: typography.xl,
    fontWeight: typography.extrabold,
  },
  statLabel: {
    fontSize: typography.sm,
    lineHeight: 18,
  },
  metricsBox: {
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.base,
    gap: spacing.base,
  },
  metricsBoxTitle: {
    fontSize: typography.base,
    fontWeight: typography.bold,
  },
  metricsBoxEmpty: {
    fontSize: typography.sm,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricChip: {
    minWidth: 120,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  metricChipKey: {
    fontSize: typography.xs,
    fontWeight: typography.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricChipValue: {
    fontSize: typography.base,
    fontWeight: typography.bold,
  },
  metricsAlertBox: {
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.base,
    gap: spacing.md,
  },
  metricsAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorMetricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  errorMetricItem: {
    flexGrow: 1,
    flexBasis: 140,
    borderRadius: radii.lg,
    backgroundColor: '#FFFFFF10',
    padding: spacing.md,
  },
  errorMetricLabel: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  errorMetricValue: {
    fontSize: typography.xl,
    fontWeight: typography.extrabold,
    marginTop: spacing.xs,
  },
});
