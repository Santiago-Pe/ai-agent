/**
 * Utilidades para manejo de cookies compatible con producción
 * Fallback para cuando cookies() de Next.js tiene problemas
 */

const COOKIE_NAME = 'ai-agent-session';

interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  maxAge: number;
  path: string;
}

/**
 * Crea un header Set-Cookie compatible con producción
 */
export function createSetCookieHeader(token: string, options: CookieOptions): string {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    `Path=${options.path}`,
    `Max-Age=${options.maxAge}`,
    `SameSite=${options.sameSite}`
  ];

  if (options.httpOnly) {
    parts.push('HttpOnly');
  }

  if (options.secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

/**
 * Extrae el valor de una cookie desde el header Cookie
 */
export function getCookieFromHeader(cookieHeader: string | null, cookieName: string = COOKIE_NAME): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map(c => c.trim());
  const targetCookie = cookies.find(c => c.startsWith(`${cookieName}=`));

  if (!targetCookie) return null;

  return targetCookie.split('=')[1] || null;
}
