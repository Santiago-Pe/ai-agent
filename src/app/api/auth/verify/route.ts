export const runtime = "nodejs";

import { supabaseAdmin } from '@/lib/supabase';
import { createSession, setSessionCookie } from '@/lib/auth';
import { createSetCookieHeader } from '@/lib/cookie-utils';

export async function POST(req: Request) {
  try {
    console.log('[VERIFY] 🚀 Iniciando verificación de auth');
    console.log('[VERIFY] 🔧 ENV check:', {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 40),
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20),
      serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length,
      nodeEnv: process.env.NODE_ENV
    });

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
    console.log('[VERIFY] 🔍 Buscando usuario con código:', code.toUpperCase());

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('access_code', code.toUpperCase())
      .single();

    console.log('[VERIFY] 📊 Resultado de búsqueda:', {
      encontrado: !!user,
      error: error?.message,
      errorCode: error?.code,
      userId: user?.id
    });

    if (error || !user) {
      console.error('[VERIFY] ❌ Error buscando usuario:', {
        code: code.toUpperCase(),
        error: error,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30),
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      });

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

    console.log('[VERIFY] 🔐 Token creado, length:', token.length);

    await setSessionCookie(token);

    console.log('[VERIFY] ✅ Sesión creada para:', name, '- Cookie debería estar seteada');

    // Crear header Set-Cookie manualmente como respaldo
    const cookieHeader = createSetCookieHeader(token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });

    console.log('[VERIFY] 🍪 Set-Cookie header creado:', cookieHeader.substring(0, 100) + '...');

    // Crear respuesta con header Set-Cookie explícito
    const response = Response.json({
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

    console.log('[VERIFY] 📤 Enviando respuesta con status 200 y Set-Cookie header');

    return response;

  } catch (error) {
    console.error('Auth error:', error);
    return Response.json({
      success: false,
      message: 'Error interno. Intentá nuevamente en unos segundos.',
      error: true
    });
  }
}