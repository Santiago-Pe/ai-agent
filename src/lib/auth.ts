import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

const COOKIE_NAME = 'ai-agent-session';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7, // 7 días
  path: '/'
};

export interface SessionData {
  userId: string;
  conversationId: string;
  name: string;
  displayName: string;
  createdAt: number;
}

/**
 * Crea un nuevo JWT con los datos de sesión
 */
export async function createSession(data: Omit<SessionData, 'createdAt'>): Promise<string> {
  const token = await new SignJWT({
    ...data,
    createdAt: Date.now()
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verifica y decodifica un JWT
 */
export async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionData;
  } catch (error) {
    console.error('[Auth] Error verificando token:', error);
    return null;
  }
}

/**
 * Guarda el token en una cookie httpOnly
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, COOKIE_OPTIONS);
}

/**
 * Obtiene el token de la cookie
 */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  return cookie?.value || null;
}

/**
 * Obtiene la sesión actual desde la cookie
 */
export async function getSession(): Promise<SessionData | null> {
  const token = await getSessionToken();
  if (!token) return null;

  return await verifySession(token);
}

/**
 * Elimina la sesión (logout)
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Actualiza la sesión con nuevos datos
 */
export async function updateSession(data: Partial<SessionData>): Promise<string | null> {
  const currentSession = await getSession();
  if (!currentSession) return null;

  const updatedData = { ...currentSession, ...data };
  const newToken = await createSession(updatedData);
  await setSessionCookie(newToken);

  return newToken;
}
