import { useState, useCallback, useRef } from 'react';
import { Message, StreamData } from '../types/chat';


export function useStreamingChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (
    content: string, 
    userId: string, 
    conversationId: string
  ) => {
    // Agregar mensaje del usuario
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
      status: 'sending'
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setCurrentStatus('');

    // Crear mensaje del asistente vacío
    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      toolCalls: []
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages
            .filter(m => m.role !== 'system')
            .map(m => ({ role: m.role, content: m.content }))
            .concat([{ role: 'user', content }]),
          userId,
          conversationId
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: StreamData = JSON.parse(line.slice(6));
              
              setMessages(prev => prev.map(msg => {
                if (msg.id === assistantMessage.id) {
                  return handleStreamData(msg, data);
                }
                return msg;
              }));

              if (data.type === 'status') {
                setCurrentStatus(data.content);
              }

              if (data.finished) {
                setIsLoading(false);
                setCurrentStatus('');
                // Marcar mensaje usuario como enviado
                setMessages(prev => prev.map(msg => 
                  msg.id === userMessage.id 
                    ? { ...msg, status: 'sent' }
                    : msg
                ));
              }

            } catch (e) {
              console.error('Error parsing stream data:', e);
            }
          }
        }
      }

    } catch (error) {
      setIsLoading(false);
      setCurrentStatus('');
      
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Usuario canceló
      }

      // Error de red o servidor
      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id 
          ? { ...msg, status: 'error' }
          : msg.id === assistantMessage.id
          ? { ...msg, content: 'Lo siento, ocurrió un error. Intentá nuevamente.' }
          : msg
      ));
    }
  }, [messages]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setCurrentStatus('');
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentStatus('');
  }, []);

  return {
    messages,
    isLoading,
    currentStatus,
    sendMessage,
    stopGeneration,
    clearMessages
  };
}

function handleStreamData(message: Message, data: StreamData): Message {
  switch (data.type) {
    case 'content':
      return {
        ...message,
        content: message.content + data.content
      };

    case 'tool_call':
      if (data.toolCall) {
        const existingToolCalls = message.toolCalls || [];
        const toolCallIndex = existingToolCalls.findIndex(
          tc => tc.name === data.toolCall!.name
        );

        if (toolCallIndex >= 0) {
          // Actualizar tool call existente
          const updatedToolCalls = [...existingToolCalls];
          updatedToolCalls[toolCallIndex] = {
            ...updatedToolCalls[toolCallIndex],
            ...data.toolCall,
            status: 'completed'
          };
          return { ...message, toolCalls: updatedToolCalls };
        } else {
          // Agregar nuevo tool call
          return {
            ...message,
            toolCalls: [...existingToolCalls, { ...data.toolCall, status: 'completed' }]
          };
        }
      }
      return message;

    case 'error':
      return {
        ...message,
        content: message.content + `\n❌ Error: ${data.content}`
      };

    default:
      return message;
  }
}