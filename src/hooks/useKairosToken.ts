import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/expo';
import { exchangeClerkToken } from '../services/authService';
import {
  saveSession,
  saveClerkToken,
  getRolFromToken,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
} from '../store/authStore';

export function useKairosToken() {
  const { getToken, isSignedIn } = useAuth();
  const [kairosToken, setKairosToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const exchange = async () => {
      try {
        const storedToken = await getAccessToken();
        if (storedToken) {
          const storedUser = await getStoredUser();
          const rol = storedUser?.rol ?? getRolFromToken(storedToken);

          if (storedUser && storedUser.rol !== rol) {
            await saveSession(storedToken, await getRefreshToken(), { ...storedUser, rol });
          }

          setKairosToken(storedToken);
          return;
        }

        if (!isSignedIn) {
          setKairosToken(null);
          return;
        }

        const clerkToken = await getToken();
        if (!clerkToken) throw new Error('No hay sesión de Clerk');
        await saveClerkToken(clerkToken);

        const response = await exchangeClerkToken(clerkToken);
        const rol = getRolFromToken(response.access_token);

        await saveSession(
          response.access_token,
          response.refresh_token,
          {
            id_usuario: (response as any).user?.id_usuario ?? '',
            nombre: (response as any).user?.nombre ?? '',
            email: (response as any).user?.email ?? '',
            rol,
          }
        );

        setKairosToken(response.access_token);
      } catch (error: any) {
        console.warn('[useKairosToken] Error al obtener token:', error.message);
        setKairosToken(null);
      } finally {
        setLoading(false);
      }
    };

    exchange();
  }, [isSignedIn]);

  return { kairosToken, loading };
}