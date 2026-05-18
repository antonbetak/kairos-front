import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { apiRequest } from './api';
import { saveSession } from '../store/authStore';

WebBrowser.maybeCompleteAuthSession();

interface GoogleAuthUrlResponse {
  url: string;
}

interface GoogleAuthResponse {
  provider: string;
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
  // 1. El redirect URI que Expo puede capturar (ngrok)
  const redirectUri = Linking.createURL('/auth/google/callback');

  // 2. Pedir la URL de autorización pasando platform=ios y el redirect URI de Expo
  const { url } = await apiRequest<GoogleAuthUrlResponse>(
    `/auth/google/auth-url?platform=ios&redirect_uri=${encodeURIComponent(redirectUri)}`
  );

  // 3. Abrir el browser con esa URL — Expo intercepta cuando regresa al redirect URI
  const result = await WebBrowser.openAuthSessionAsync(url, redirectUri);

  if (result.type !== 'success') {
    throw new Error('El usuario canceló el inicio de sesión con Google');
  }

  // 4. Extraer code y state del redirect URL que capturó Expo
  const { queryParams } = Linking.parse(result.url);
  const code = queryParams?.code as string | undefined;
  const state = queryParams?.state as string | undefined;

  if (!code || !state) {
    throw new Error('Google no devolvió los parámetros esperados');
  }

  // 5. Mandar code y state al backend via POST /mobile-callback
  const authResponse = await apiRequest<GoogleAuthResponse>('/auth/google/mobile-callback', {
    method: 'POST',
    body: { code, state },
  });

  // 6. Guardar la sesión
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