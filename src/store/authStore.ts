import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'kairos_access_token';
const REFRESH_KEY = 'kairos_refresh_token';
const USER_KEY = 'kairos_user';

export interface StoredUser {
  id_usuario: string;
  nombre: string;
  email: string;
}

export async function saveSession(
  accessToken: string,
  refreshToken: string | null,
  user: StoredUser
): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) await AsyncStorage.setItem(REFRESH_KEY, refreshToken);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(REFRESH_KEY);
}

export async function getStoredUser(): Promise<StoredUser | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY, USER_KEY]);
}