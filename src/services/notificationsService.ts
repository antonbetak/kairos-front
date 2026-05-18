import { apiRequest } from './api';

export interface Notificacion {
  id_notificacion: string;
  request_id: string;
  id_usuario: string;
  titulo: string;
  mensaje: string;
  tipo: 'logro' | 'racha' | 'cumplimiento' | 'recordatorio' | string;
  leida: boolean;
  fecha_creacion: string;
  fecha_lectura: string | null;
}

export async function listarNotificaciones(token: string): Promise<Notificacion[]> {
  return apiRequest<Notificacion[]>('/notifications/notificaciones', { token });
}

export async function marcarLeida(token: string, id: string): Promise<Notificacion> {
  return apiRequest<Notificacion>(`/notifications/notificaciones/${id}/leer`, {
    method: 'PATCH',
    token,
  });
}

export async function marcarTodasLeidas(token: string): Promise<Notificacion[]> {
  return apiRequest<Notificacion[]>('/notifications/notificaciones/leer-todas', {
    method: 'PATCH',
    token,
  });
}