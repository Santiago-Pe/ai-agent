import { useState, useRef, useEffect } from 'react';
import { Send, Square, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatInputProps } from './interfaces';
import { chatInputStyles } from './styles';

export function ChatInput({
  onSendMessage,
  isLoading,
  onStopGeneration,
  disabled = false,
  placeholder = "Escribe tu mensaje..."
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 120);
      textarea.style.height = `${newHeight}px`;
    }
  }, [input]);

  const handleSend = () => {
    const message = input.trim();
    if (!message || disabled || isLoading) return;

    onSendMessage(message);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStop = () => {
    onStopGeneration();
  };

  return (
    <div className={chatInputStyles.container}>
      <div className={chatInputStyles.innerContainer}>
        <div className={chatInputStyles.inputWrapper}>
          <div className={chatInputStyles.textareaWrapper}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className={chatInputStyles.textareaBase}
              rows={1}
            />

            <button className={chatInputStyles.attachmentButton}>
              <Paperclip className="w-4 h-4" />
            </button>
          </div>

          {/* TODO: modularizar button */}
          {isLoading ? (
            <button
              onClick={handleStop}
              className={chatInputStyles.stopButton}
              title="Detener generación"
            >
              <Square className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() || disabled}
              className={cn(
                chatInputStyles.sendButton.base,
                input.trim() && !disabled
                  ? chatInputStyles.sendButton.active
                  : chatInputStyles.sendButton.disabled
              )}
              title="Enviar mensaje"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* TODO: modularizar tips */}
        <div className={chatInputStyles.tipsContainer}>
          <span>Presiona Enter para enviar, Shift+Enter para nueva línea</span>
        </div>
      </div>
    </div>
  );
}