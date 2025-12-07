import { clearSession } from '@/lib/auth';

/**
 * POST /api/auth/logout
 * Cierra la sesión eliminando la cookie JWT
 */
export async function POST() {
  try {
    await clearSession();

    return Response.json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });

  } catch (error) {
    console.error('[Logout] Error cerrando sesión:', error);
    return Response.json({
      success: false,
      error: 'Error cerrando sesión'
    }, { status: 500 });
  }
}