export const runtime = "nodejs";

import { getSession, getSessionToken } from '@/lib/auth';

console.log("[SESSION API] runtime:", process.env.NEXT_RUNTIME);
console.log("[SESSION API] NODE_ENV:", process.env.NODE_ENV);

export async function GET() {
  try {
    // 🔍 LOG: verificar qué cookies llegan al servidor
    const token = await getSessionToken();
    console.log("[SESSION API] Cookie token recibido:", token ? "OK" : "NO TOKEN");

    const session = await getSession();

    // 🔍 LOG: ver si la sesión decodifica
    console.log("[SESSION API] Sesión decodificada:", session);

    if (!session) {
      console.log("[SESSION API] -> 401, no hay sesión");
      return Response.json(
        { authenticated: false, message: 'No hay sesión activa' },
        { status: 401 }
      );
    }

    console.log("[SESSION API] -> Sesión válida, usuario:", session.userId);

    return Response.json({
      authenticated: true,
      user: {
        id: session.userId,
        name: session.name,
        displayName: session.displayName
      },
      conversationId: session.conversationId
    });

  } catch (error) {
    console.error('[Session] Error obteniendo sesión:', error);
    return Response.json(
      { authenticated: false, error: 'Error verificando sesión' },
      { status: 500 }
    );
  }
}
