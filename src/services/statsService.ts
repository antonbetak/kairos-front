import { apiRequest } from './api';

export interface Estadistica {
  id_estadistica: string;
  id_usuario: string;
  tareas_creadas: number;
  tareas_completadas: number;
  horarios_creados: number;
  bloques_completados: number;
  porcentaje_cumplimiento: number;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface Racha {
  id_racha?: string;
  id_usuario: string;
  tipo: string;
  racha_actual: number;
  mejor_racha: number;
  ultima_fecha_actividad: string | null;
}

export interface Logro {
  id_logro?: string;
  id_usuario: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  fecha_desbloqueo: string;
}

export async function obtenerEstadisticas(token: string): Promise<Estadistica> {
  return apiRequest<Estadistica>('/stats/estadisticas', { token });
}

export async function obtenerRacha(token: string, tipo: string = 'tareas'): Promise<Racha> {
  return apiRequest<Racha>(`/stats/rachas/${tipo}`, { token });
}

export async function listarLogros(token: string): Promise<Logro[]> {
  return apiRequest<Logro[]>('/stats/logros', { token });
}