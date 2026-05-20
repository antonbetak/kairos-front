import { apiRequest } from './api';


export type TipoBloque = 'tarea' | 'habito' | 'evento' | 'libre';
export type EstadoBloque = 'pendiente' | 'completada' | 'propuesto';

export interface BloqueHorario {
  id: string;
  titulo: string;
  descripcion?: string | null;
  tipo: TipoBloque;
  estado: EstadoBloque;
  fecha_inicio: string;
  fecha_fin: string;
  razon?: string | null;
}


export async function generarHorario(
  token: string,
  fecha: string,
): Promise<BloqueHorario[]> {
  return apiRequest<BloqueHorario[]>(`/schedule/generate?fecha=${fecha}`, {
    method: 'POST',
    token,
  });
}

export async function listarBloques(
  token: string,
  fecha: string,
): Promise<BloqueHorario[]> {
  return apiRequest<BloqueHorario[]>(`/schedule/blocks?fecha=${fecha}`, {
    token,
  });
}

export async function aceptarBloque(
  token: string,
  id: string,
): Promise<BloqueHorario> {
  return apiRequest<BloqueHorario>(`/schedule/${id}/accept`, {
    method: 'PATCH',
    token,
  });
}

export async function rechazarBloque(
  token: string,
  id: string,
): Promise<void> {
  return apiRequest<void>(`/schedule/${id}/reject`, {
    method: 'DELETE',
    token,
  });
}