import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';
import { apiRequest } from './api';
import { saveSession } from '../store/authStore';

WebBrowser.maybeCompleteAuthSession();

interface GoogleAuthUrlResponse {
  url: string;
}

interface GoogleAuthResponse {
  user: {
    email: string;
    name: string;
    picture: string | null;
    google_id: string;
    email_verified: boolean;
  };
  tokens: {
    access_token: string;
    token_type: string;
    expires_in: number | null;
    refresh_token: string | null;
    scope: string;
    id_token: string | null;
  };
}

export async function loginConGoogle(): Promise<GoogleAuthResponse> {
  const useProxy = true;
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'kairos',
    path: 'auth/google/callback',
    useProxy,
  });
  const platform = useProxy ? 'web' : Platform.OS;

  // 1. Pedir la URL de autorización al backend
  const { url } = await apiRequest<GoogleAuthUrlResponse>(
    `/auth/google/auth-url?platform=${encodeURIComponent(
      platform
    )}&redirect_uri=${encodeURIComponent(redirectUri)}`
  );

  // 2. Abrir el browser del celular con esa URL
  const result = await WebBrowser.openAuthSessionAsync(
    url,
    redirectUri
  );

  if (result.type !== 'success' || !result.url) {
    throw new Error('El usuario canceló el inicio de sesión con Google');
  }

  // 3. Extraer el code y state del redirect URL
  const { queryParams } = Linking.parse(result.url);
  const code = queryParams?.code as string | undefined;
  const state = queryParams?.state as string | undefined;

  if (!code || !state) {
    throw new Error('Google no devolvió los parámetros esperados');
  }

  // 4. Mandar el code y state al backend para obtener los tokens
  const authResponse = await apiRequest<GoogleAuthResponse>(
    `/auth/google/callback?code=${code}&state=${state}`
  );

  // 5. Guardar la sesión
  await saveSession(
    authResponse.tokens.access_token,
    authResponse.tokens.refresh_token,
    {
      id_usuario: authResponse.user.google_id,
      nombre: authResponse.user.name,
      email: authResponse.user.email,
    }
  );

  return authResponse;
}