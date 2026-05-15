import { apiRequest } from './api';

export interface Tarea {
  id_tarea: string;
  id_usuario: string;
  titulo: string;
  descripcion: string | null;
  completada: boolean;
  due_at: string | null;
  due_warning_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TareaCrear {
  titulo: string;
  descripcion?: string;
  due_at?: string;
}

export interface TareaActualizar {
  completada: boolean;
  due_at?: string;
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