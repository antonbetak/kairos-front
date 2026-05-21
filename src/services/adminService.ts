import { apiRequest } from './api';

export interface AdminUser {
  id_usuario: string;
  nombre: string;
  email: string;
  handle: string | null;
  rol: string;
  auth_provider: string;
  activo: boolean;
  created_at: string;
}

export interface AdminUsersFilters {
  rol?: 'admin' | 'user' | string;
  auth_provider?: 'local' | 'google' | 'clerk' | string;
  activo?: boolean;
}

export interface AdminUsersPage {
  items: AdminUser[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminUserMetrics {
  total: number;
  active: number;
  inactive: number;
  byProvider: Record<string, number>;
  byRole: Record<string, number>;
}

export interface AdminTaskMetrics {
  createdToday: number;
  createdLast7Days: number;
  createdLast30Days: number;
  taskError: number;
  scheduleError: number;
}

function buildQuery(filters: AdminUsersFilters, page: number, limit: number) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));

  if (filters.rol) params.set('rol', filters.rol);
  if (filters.auth_provider) params.set('auth_provider', filters.auth_provider);
  if (typeof filters.activo === 'boolean') {
    params.set('activo', filters.activo ? 'true' : 'false');
  }

  return params.toString();
}

function normalizeUsersPage(response: any, page: number, limit: number): AdminUsersPage {
  const items = response?.items ?? response?.users ?? response?.data ?? [];
  const total = response?.total ?? response?.count ?? response?.total_users ?? items.length;
  const currentPage = response?.page ?? page;
  const currentLimit = response?.limit ?? limit;
  const totalPages =
    response?.totalPages ??
    response?.total_pages ??
    Math.max(1, Math.ceil((total || 0) / Math.max(currentLimit, 1)));

  return {
    items,
    page: currentPage,
    limit: currentLimit,
    total,
    totalPages,
  };
}

function normalizeUserMetrics(response: any): AdminUserMetrics {
  const total = response?.total ?? response?.total_users ?? response?.registrados ?? 0;
  const active = response?.active ?? response?.active_users ?? response?.total_active ?? response?.activos ?? 0;

  return {
    total,
    active,
    inactive: response?.inactive ?? response?.inactive_users ?? response?.total_inactive ?? response?.inactivos ?? Math.max(total - active, 0),
    byProvider:
      response?.byProvider ?? response?.by_auth_provider ?? response?.auth_provider ?? response?.providers ?? response?.by_provider ?? {},
    byRole: response?.byRole ?? response?.by_role ?? response?.roles ?? {},
  };
}

function normalizeTaskMetrics(response: any): AdminTaskMetrics {
  const errorEvents = response?.error_events ?? {};

  return {
    createdToday: response?.createdToday ?? response?.created_today ?? response?.total_today ?? response?.today ?? 0,
    createdLast7Days: response?.createdLast7Days ?? response?.created_7_days ?? response?.total_7_days ?? response?.last7Days ?? 0,
    createdLast30Days: response?.createdLast30Days ?? response?.created_30_days ?? response?.total_30_days ?? response?.last30Days ?? 0,
    taskError: response?.taskError ?? response?.task_error ?? errorEvents?.task_error ?? 0,
    scheduleError: response?.scheduleError ?? response?.schedule_error ?? errorEvents?.schedule_error ?? 0,
  };
}

export async function getUsers(
  filters: AdminUsersFilters,
  page: number,
  limit: number,
  token: string
): Promise<AdminUsersPage> {
  const query = buildQuery(filters, page, limit);
  const response = await apiRequest<any>(`/admin/users?${query}`, { token });
  return normalizeUsersPage(response, page, limit);
}

export async function deactivateUser(idUsuario: string, token: string): Promise<void> {
  await apiRequest<void>(`/admin/users/${idUsuario}/desactivar`, {
    method: 'PATCH',
    token,
  });
}

export async function deleteUser(idUsuario: string, token: string): Promise<void> {
  await apiRequest<void>(`/admin/users/${idUsuario}`, {
    method: 'DELETE',
    token,
  });
}

export async function getUserMetrics(token: string): Promise<AdminUserMetrics> {
  const response = await apiRequest<any>('/admin/metrics/users', { token });
  return normalizeUserMetrics(response);
}

export async function getTaskMetrics(token: string): Promise<AdminTaskMetrics> {
  const response = await apiRequest<any>('/admin/metrics/tasks', { token });
  return normalizeTaskMetrics(response);
}
