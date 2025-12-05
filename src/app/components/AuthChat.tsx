import { useState } from 'react';
import { Send, Lock } from 'lucide-react';
import { AuthState } from '../types/chat';

interface AuthChatProps {
  onAuth: (authState: AuthState) => void;
  isLoading: boolean;
}

export function AuthChat({ onAuth, isLoading }: AuthChatProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAuth = async () => {
    if (!input.trim() || isProcessing) return;

    setIsProcessing(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      });

      const result = await response.json();

      if (result.success) {
        onAuth({
          isAuthenticated: true,
          user: result.user,
          conversationId: result.conversationId,
          sessionId: result.sessionId
        });
      } else {
        setError(result.message);
        if (result.needsMoreInfo) {
          setInput(''); // Limpiar para que reintenten
        }
      }
    } catch (err) {
      setError('Error de conexión. Intentá nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAuth();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            AI Assistant
          </h1>
          <p className="text-gray-600 text-sm">
            Para comenzar, decime tu nombre y código de acceso
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
            💡 <strong>Ejemplo:</strong>Soy María, mi código es DEMO123
          </div>

          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu nombre y código aquí..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              disabled={isProcessing}
            />
            <button
              onClick={handleAuth}
              disabled={!input.trim() || isProcessing}
              className="absolute bottom-3 right-3 p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">
          🔐 Tu información está protegida y encriptada
        </div>
      </div>
    </div>
  );
}