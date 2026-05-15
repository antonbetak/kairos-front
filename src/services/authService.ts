import { apiRequest } from './api';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string | null;
  refresh_expires_in: number | null;
}

export interface RegisterResponse {
  id_usuario: string;
  nombre: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface UserResponse {
  id_usuario: string;
  nombre: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export async function register(
  nombre: string,
  email: string,
  password: string
): Promise<RegisterResponse> {
  return apiRequest<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: { nombre, email, password },
  });
}

export async function getMe(token: string): Promise<UserResponse> {
  return apiRequest<UserResponse>('/auth/me', { token });
}

export async function refreshToken(refresh_token: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/refresh', {
    method: 'POST',
    body: { refresh_token },
  });
}