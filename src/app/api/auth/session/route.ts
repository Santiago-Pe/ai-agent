export const runtime = "nodejs";

import { getSession } from '@/lib/auth';

/**
 * GET /api/auth/session
 * Obtiene la sesión actual desde la cookie JWT
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return Response.json({
        authenticated: false,
        message: 'No hay sesión activa'
      }, { status: 401 });
    }

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
    return Response.json({
      authenticated: false,
      error: 'Error verificando sesión'
    }, { status: 500 });
  }
}