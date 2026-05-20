import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/expo';
import { exchangeClerkToken } from '../services/authService';
import { saveSession, getAccessToken, clearSession } from '../store/authStore';

export function useKairosToken() {
  const { getToken, isSignedIn } = useAuth();
  const [kairosToken, setKairosToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSignedIn) {
      clearSession();
      setKairosToken(null);
      setLoading(false);
      return;
    }

    const exchange = async () => {
      try {
        // Siempre pide un token de Clerk fresco (dura 60s pero getToken lo renueva)
        const clerkToken = await getToken();
        if (!clerkToken) throw new Error('No hay sesión de Clerk');

        const response = await exchangeClerkToken(clerkToken);

        await saveSession(
          response.access_token,
          response.refresh_token,
          {
            id_usuario: (response as any).user?.id_usuario ?? '',
            nombre: (response as any).user?.nombre ?? '',
            email: (response as any).user?.email ?? '',
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