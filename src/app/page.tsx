'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, LogOut, RotateCcw } from 'lucide-react';
import { useStreamingChat } from './hooks/useStreamingChat';
import { AuthState } from './types/chat';
import { AuthChat } from './components/AuthChat';
import { Message } from './components/Message';
import { StatusIndicator } from './components/StatusIndicator';
import { ChatInput } from './components/ChatInput';

export default function ChatPage() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false
  });

  const {
    messages,
    isLoading,
    currentStatus,
    sendMessage,
    stopGeneration,
    clearMessages
  } = useStreamingChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Declarar función antes de usarla en useEffect
  const loadConversationHistory = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/history`);
      if (response.ok) {
        const { messages: historyMessages } = await response.json();
        // Cargar mensajes anteriores si es necesario
        console.log('History loaded:', historyMessages);
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  }, []);

  // Auto-scroll to bottom cuando hay nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStatus]);

  // Cargar conversación existente si hay sesión
  useEffect(() => {
    if (authState.isAuthenticated && authState.conversationId) {
      loadConversationHistory(authState.conversationId);
    }
  }, [authState.isAuthenticated, authState.conversationId, loadConversationHistory]);

  const handleSendMessage = async (content: string) => {
    if (!authState.user?.id || !authState.conversationId) return;

    await sendMessage(content, authState.user.id, authState.conversationId);
  };

  const handleLogout = () => {
    setAuthState({ isAuthenticated: false });
    clearMessages();
  };

  const handleClearChat = () => {
    clearMessages();
  };

  // Si no está autenticado, mostrar pantalla de login
  if (!authState.isAuthenticated) {
    return (
      <AuthChat 
        onAuth={setAuthState} 
        isLoading={false} 
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-gray-800">AI Assistant</h1>
            <p className="text-xs text-gray-600">
              Conectado como {authState.user?.displayName}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearChat}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Limpiar chat"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="max-w-4xl mx-auto">
          {/* Welcome Message */}
          {messages.length === 0 && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                ¡Hola {authState.user?.displayName}!
              </h2>
              <p className="text-gray-600 mb-6">
                Soy tu asistente IA. Puedo ayudarte con:
              </p>
              <div className="grid gap-3 max-w-md mx-auto text-left">
                <div className="flex items-start gap-2 p-3 bg-white rounded-lg border">
                  <span className="text-lg">🔍</span>
                  <div>
                    <div className="font-medium text-sm">Buscar información</div>
                    <div className="text-xs text-gray-600">
                      ¿Qué dice sobre marketing digital?
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-white rounded-lg border">
                  <span className="text-lg">💾</span>
                  <div>
                    <div className="font-medium text-sm">Guardar datos</div>
                    <div className="text-xs text-gray-600">
                      Guardá: Cliente nuevo - Juan Pérez
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-white rounded-lg border">
                  <span className="text-lg">🧮</span>
                  <div>
                    <div className="font-medium text-sm">Realizar cálculos</div>
                    <div className="text-xs text-gray-600">
                      Calculá el 15% de descuento sobre $1200
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((message, index) => (
            <Message 
              key={message.id} 
              message={message} 
              isLast={index === messages.length - 1}
            />
          ))}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Status Indicator */}
      <StatusIndicator 
        status={currentStatus} 
        isVisible={isLoading && !!currentStatus} 
      />

      {/* Chat Input */}
      <ChatInput
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        onStopGeneration={stopGeneration}
        placeholder="Preguntame lo que necesites..."
      />
    </div>
  );
}