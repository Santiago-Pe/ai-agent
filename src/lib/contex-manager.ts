import { supabaseAdmin } from './supabase';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ChatContext {
  userId: string;
  conversationId: string;
  sessionId: string;
  messageHistory: Message[];
}

export async function getConversationHistory(conversationId: string, limit = 10) {
  const { data: messages, error } = await supabaseAdmin
    .from('messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching history:', error);
    return [];
  }

  return messages.map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    timestamp: msg.created_at
  }));
}

export async function saveUserMessage(conversationId: string, content: string) {
  const { error } = await supabaseAdmin
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role: 'user',
      content: content,
      tools_used: []
    });

  if (error) {
    console.error('Error saving user message:', error);
  }
}

export function trimContextForTokenLimit(messages: Message[], maxTokens = 3000): Message[] {
  // Estimación simple: ~4 caracteres por token
  const estimatedTokens = messages.reduce((acc, msg) => acc + msg.content.length / 4, 0);

  if (estimatedTokens <= maxTokens) {
    return messages;
  }
  // Mantener siempre los últimos 5 mensajes
  const recentMessages = messages.slice(-5);
  const trimmedMessages: Message[] = [...recentMessages];

  // Agregar mensajes anteriores hasta llegar al límite
  for (let i = messages.length - 6; i >= 0; i--) {
    const msgTokens = messages[i].content.length / 4;
    if (estimatedTokens - msgTokens > maxTokens) break;

    trimmedMessages.unshift(messages[i]);
  }

  return trimmedMessages;
}