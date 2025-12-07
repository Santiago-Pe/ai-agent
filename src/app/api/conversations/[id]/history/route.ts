export const runtime = "nodejs";

import { getConversationHistory } from '@/lib/contex-manager';
import { supabaseAdmin } from '@/lib/supabase';


export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    
    // Verificar que la conversación existe
    const { data: conversation } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .single();

    if (!conversation) {
      return Response.json({ error: 'Conversación no encontrada' }, { status: 404 });
    }

    const messages = await getConversationHistory(conversationId, 50);
    
    return Response.json({ 
      messages: messages.map(msg => ({
        id: `${msg.role}-${Date.now()}-${Math.random()}`,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp)
      }))
    });

  } catch (error) {
    console.error('Error fetching conversation history:', error);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}