import { useState, useRef, useEffect } from 'react';
import { Send, Square, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  onStopGeneration: () => void;
  disabled?: boolean;
  placeholder?: string;
}

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
      const newHeight = Math.min(textarea.scrollHeight, 120); // Max 120px
      textarea.style.height = `${newHeight}px`;
    }
  }, [input]);

  const handleSend = () => {
    const message = input.trim();
    if (!message || disabled || isLoading) return;

    onSendMessage(message);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStop = () => {
    onStopGeneration();
  };

  return (
    <div className="border-t bg-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative flex items-end gap-3">
          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              disabled={disabled}
              className={cn(
                "w-full p-3 pr-12 border border-gray-300 rounded-xl resize-none",
                "focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "min-h-[52px] max-h-[120px]"
              )}
              rows={1}
            />

            {/* Attachment button placeholder */}
            <button className="absolute right-3 top-3 p-1 text-gray-400 hover:text-gray-600 transition-colors">
              <Paperclip className="w-4 h-4" />
            </button>
          </div>

          {/* Send/Stop button */}
          {isLoading ? (
            <button
              onClick={handleStop}
              className="p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors flex-shrink-0"
              title="Detener generación"
            >
              <Square className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() || disabled}
              className={cn(
                "p-3 rounded-xl transition-colors flex-shrink-0",
                input.trim() && !disabled
                  ? "bg-blue-500 text-white hover:bg-blue-600"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              )}
              title="Enviar mensaje"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tips */}
        <div className="mt-2 text-xs text-gray-500 text-center">
          <span>Presiona Enter para enviar, Shift+Enter para nueva línea</span>
        </div>
      </div>
    </div>
  );
}