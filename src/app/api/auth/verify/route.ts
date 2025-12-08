export const runtime = "nodejs";

import { supabaseAdmin } from '@/lib/supabase';
import { createSession, setSessionCookie } from '@/lib/auth';
import { createSetCookieHeader } from '@/lib/cookie-utils';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    // Extraer nombre y código del mensaje natural
    const authPattern = /(?:soy|me llamo|mi nombre es)\s+([^,\n]+)(?:,?\s*(?:mi\s*)?(?:código|code|clave)(?:\s*es)?\s*([A-Za-z0-9]+))?/i;
    const codePattern = /(?:código|code|clave)(?:\s*es)?\s*([A-Za-z0-9]+)/i;

    let name = '';
    let code = '';

    const authMatch = authPattern.exec(message);
    if (authMatch) {
      name = authMatch[1]?.trim() || '';
      code = authMatch[2]?.trim() || '';
    }

    // Si no encontró código en el primer match, buscar por separado
    if (!code) {
      const codeMatch = codePattern.exec(message);
      if (codeMatch) {
        code = codeMatch[1]?.trim() || '';
      }
    }

    if (!name || !code) {
      return Response.json({
        success: false,
        message: 'Por favor, proporciona tu nombre y código. Ejemplo: "Soy Juan, mi código es ABC123"',
        needsMoreInfo: true
      });
    }

    // Verificar código en Supabase
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('access_code', code.toUpperCase())
      .single();

    if (error || !user) {
      return Response.json({
        success: false,
        message: `No reconozco el código "${code}". Verificá que esté correcto o contactá soporte.`,
        invalidCode: true
      });
    }

    // Crear o obtener conversación
    const sessionId = `session_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .insert({
        user_id: user.id,
        session_id: sessionId
      })
      .select()
      .single();

    if (convError) {
      throw new Error('Error creando conversación');
    }

    // ✅ Crear JWT y guardar en cookie httpOnly
    const token = await createSession({
      userId: user.id,
      conversationId: conversation.id,
      name: user.name,
      displayName: name
    });

    await setSessionCookie(token);

    // Crear header Set-Cookie manualmente como respaldo
    const cookieHeader = createSetCookieHeader(token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });

    // Crear respuesta con header Set-Cookie explícito
    return Response.json({
      success: true,
      message: `¡Perfecto ${name}! Ya podés preguntarme lo que necesites.`,
      user: {
        id: user.id,
        name: user.name,
        displayName: name
      },
      conversationId: conversation.id,
      sessionId: sessionId
    }, {
      headers: {
        'Set-Cookie': cookieHeader
      }
    });

  } catch (error) {
    console.error('Auth error:', error);
    return Response.json({
      success: false,
      message: 'Error interno. Intentá nuevamente en unos segundos.',
      error: true
    });
  }
}