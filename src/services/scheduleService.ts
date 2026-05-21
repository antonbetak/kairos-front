import { apiRequest } from './api';

export interface ScheduleBlock {
  id: string;
  id_usuario: string;
  titulo: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  tipo: string | null;
  status: string;
  request_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleAgentBlock {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: string | null;
  estado: string;
  fecha_inicio: string;
  fecha_fin: string;
  razon: string | null;
}

export interface GenerateScheduleResponse {
  bloques: ScheduleAgentBlock[];
  es_fallback: boolean;
}

export async function listarBloques(token: string): Promise<ScheduleBlock[]> {
  return apiRequest<ScheduleBlock[]>('/schedule', { token });
}

export async function generarHorario(
  token: string,
  fecha: string
): Promise<ScheduleBlock[]> {
  return apiRequest<ScheduleBlock[]>('/schedule/generate', {
    method: 'POST',
    token,
    body: {
      fecha,
      metas: [],
      streaks: [],
    },
  });
}

export async function aceptarBloque(token: string, id: string): Promise<ScheduleBlock> {
  return apiRequest<ScheduleBlock>(`/schedule/${id}/accept`, {
    method: 'PATCH',
    token,
  });
}

export async function rechazarBloque(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/schedule/${id}/reject`, {
    method: 'DELETE',
    token,
  });
}

export async function eliminarBloque(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/schedule/${id}`, {
    method: 'DELETE',
    token,
  });
}