import { apiRequest } from './api';
import type { Tarea } from './taskService';

export interface BloqueAgente {
  titulo: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  tipo: 'tarea' | 'habito' | 'evento' | 'libre';
  razon: string | null;
}

export interface GenerateResponse {
  id_usuario: string;
  fecha: string;
  bloques: BloqueAgente[];
  es_fallback: boolean;
}

function tareaAContexto(tarea: Tarea) {
  return {
    id: tarea.id_tarea,
    titulo: tarea.titulo,
    descripcion: tarea.descripcion ?? null,
    tipo: tarea.tipo ?? 'tarea',
    prioridad: tarea.prioridad ?? 0,
    estado: tarea.estado ?? (tarea.completada ? 'completada' : 'pendiente'),
    fecha_limite: tarea.due_at ?? null,
    inicio_real: tarea.started_at ?? null,
    fin_real: tarea.completed_at ?? null,
    abandonada_en: tarea.abandoned_at ?? null,
    razon_abandono: tarea.abandon_reason ?? null,
    duracion_estimada_min: 30,
  };
}

export async function generarHorario(
  token: string,
  idUsuario: string,
  fecha: Date,
  tareas: Tarea[]
): Promise<GenerateResponse> {
  const fechaStr = fecha.toISOString().split('T')[0];
  const tareasActivas = tareas.filter(t => (t.estado ?? (t.completada ? 'completada' : 'pendiente')) === 'pendiente');
  const historialTareas = tareas
    .filter(t => (t.estado ?? (t.completada ? 'completada' : 'pendiente')) !== 'pendiente')
    .slice(0, 30);

  return apiRequest<GenerateResponse>('/agent/generate', {
    method: 'POST',
    token,
    body: {
      id_usuario: idUsuario,
      fecha: fechaStr,
      tareas: tareasActivas.map(tareaAContexto),
      historial_tareas: historialTareas.map(tareaAContexto),
      metas: [],
      streaks: [],
    },
  });
}
