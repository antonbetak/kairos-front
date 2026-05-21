import { apiRequest } from './api';

export type TipoTarea = 'tarea' | 'habito' | 'evento' | 'libre';
export type PrioridadTarea = 0 | 1 | 2;
export type EstadoTarea = 'pendiente' | 'completada' | 'abandonada';

export interface Tarea {
  id_tarea: string;
  id_usuario: string;
  titulo: string;
  descripcion: string | null;
  completada: boolean;
  tipo: TipoTarea;
  prioridad: PrioridadTarea;
  estado: EstadoTarea;
  due_at: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  abandoned_at?: string | null;
  abandon_reason?: string | null;
  due_warning_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TareaCrear {
  titulo: string;
  descripcion?: string;
  due_at?: string;
  tipo?: TipoTarea;
  prioridad?: PrioridadTarea;
  estado?: EstadoTarea;
}

export interface TareaActualizar {
  titulo?: string;
  descripcion?: string;
  completada?: boolean;
  due_at?: string;
  started_at?: string;
  completed_at?: string;
  abandoned_at?: string;
  abandon_reason?: string;
  tipo?: TipoTarea;
  prioridad?: PrioridadTarea;
  estado?: EstadoTarea;
}

export async function listarTareas(token: string): Promise<Tarea[]> {
  return apiRequest<Tarea[]>('/tasks', { token });
}

export async function crearTarea(token: string, datos: TareaCrear): Promise<Tarea> {
  return apiRequest<Tarea>('/tasks', {
    method: 'POST',
    body: datos,
    token,
  });
}

export async function actualizarTarea(
  token: string,
  id: string,
  datos: TareaActualizar
): Promise<Tarea> {
  return apiRequest<Tarea>(`/tasks/${id}`, {
    method: 'PATCH',
    body: datos,
    token,
  });
}

export async function eliminarTarea(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/tasks/${id}`, {
    method: 'DELETE',
    token,
  });
}
