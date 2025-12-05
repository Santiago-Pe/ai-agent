import { useState } from 'react';
import { Send, Lock } from 'lucide-react';
import { AuthChatProps } from './interfaces';
import { authChatStyles } from './styles';

// TODO: crear custom hooks de:
// - inputs
// - errors
// - loading
// - procesing

export function AuthChat({ onAuth }: AuthChatProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAuth = async () => {
    if (!input.trim() || isProcessing) return;

    setIsProcessing(true);
    setError('');

    try {
      // TODO: mover este fetch a otro archivo
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
          setInput('');
        }
      }
    } catch (err) {
      console.log(err)
      // TODO: mejorar manejo de errores
      setError('Error de conexión. Intentá nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAuth();
    }
  };

  return (
    <div className={authChatStyles.mainContainer}>
      <div className={authChatStyles.card}>
        <div className={authChatStyles.header.container}>
          <div className={authChatStyles.header.iconWrapper}>
            <Lock className={authChatStyles.header.icon} />
          </div>
          <h1 className={authChatStyles.header.title}>
            AI Assistant
          </h1>
          <p className={authChatStyles.header.subtitle}>
            Para comenzar, decime tu nombre y código de acceso
          </p>
        </div>

        {error && (
          <div className={authChatStyles.error.container}>
            <p className={authChatStyles.error.text}>{error}</p>
          </div>
        )}

        <div className={authChatStyles.inputSection.container}>
          <div className={authChatStyles.inputSection.exampleBox}>
            💡 <strong>Ejemplo:</strong> Soy María, mi código es DEMO123
          </div>

          <div className={authChatStyles.inputSection.inputWrapper}>
            {/* TODO: modularizar textarea */}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu nombre y código aquí..."
              className={authChatStyles.inputSection.textarea}
              rows={3}
              disabled={isProcessing}
            />
            <button
              onClick={handleAuth}
              disabled={!input.trim() || isProcessing}
              className={authChatStyles.inputSection.button}
            >
              {isProcessing ? (
                <div className={authChatStyles.inputSection.spinner} />
              ) : (
                <Send className={authChatStyles.inputSection.sendIcon} />
              )}
            </button>
          </div>
        </div>

        <div className={authChatStyles.footer}>
          🔐 Tu información está protegida y encriptada
        </div>
      </div>
    </div>
  );
}