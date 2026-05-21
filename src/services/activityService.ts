import { apiRequest } from './api';

export interface ActivityEvent {
  id_evento: string;
  actor_id: string;
  event_type: string;
  title: string;
  message: string | null;
  source_service: string | null;
  source_entity_id: string | null;
  visibility: 'public' | 'friends' | 'private';
  extra_data: any | null;
  created_at: string;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface InviteResponse {
  id: string;
  owner_id: string;
  code: string;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  created_at: string;
}

export interface ReactionResponse {
  id: string;
  event_id: string;
  actor_id: string;
  reaction: string;
  created_at: string;
}

export interface UserProfile {
  id_usuario: string;
  nombre: string;
  avatar_url: string | null;
}

export async function obtenerFeed(token: string, limit = 50): Promise<ActivityEvent[]> {
  return apiRequest<ActivityEvent[]>(`/activity/feed?limit=${limit}`, { token });
}

export async function listarAmigos(token: string): Promise<Friendship[]> {
  return apiRequest<Friendship[]>('/activity/friends', { token });
}

export async function enviarSolicitud(token: string, addressee_id: string): Promise<Friendship> {
  return apiRequest<Friendship>('/activity/friends/request', {
    method: 'POST', token, body: { addressee_id },
  });
}

export async function aceptarSolicitud(token: string, friendship_id: string): Promise<Friendship> {
  return apiRequest<Friendship>(`/activity/friends/${friendship_id}/accept`, {
    method: 'POST', token,
  });
}

export async function crearInvitacion(token: string): Promise<InviteResponse> {
  return apiRequest<InviteResponse>('/activity/invites', {
    method: 'POST', token, body: { max_uses: 10 },
  });
}

export async function aceptarInvitacion(token: string, code: string): Promise<Friendship> {
  return apiRequest<Friendship>(`/activity/invites/${code}/accept`, {
    method: 'POST', token,
  });
}

export async function reaccionarEvento(token: string, event_id: string, reaction: string): Promise<ReactionResponse> {
  return apiRequest<ReactionResponse>(`/activity/events/${event_id}/react`, {
    method: 'POST', token, body: { reaction },
  });
}

export async function obtenerPerfilUsuario(token: string, user_id: string): Promise<UserProfile> {
  return apiRequest<UserProfile>(`/activity/users/${user_id}/profile`, { token });
}