import { cn } from '@/lib/utils';
import { User, Bot } from 'lucide-react';
import { MessageProps } from './interfaces';
import { messageStyles } from './styles';
import { MessageStatus, ToolCallDisplay } from './utils';

export function Message({ message, isLast }: MessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <div className={cn(
      messageStyles.container.base,
      isUser && messageStyles.container.user,
      isSystem && messageStyles.container.system
    )}>
      {/* TODO: modularizar avatar */}
      <div className={cn(
        messageStyles.avatar.base,
        isUser ? messageStyles.avatar.user : messageStyles.avatar.assistant
      )}>
        {isUser ? (
          <User className={messageStyles.avatar.icon} />
        ) : (
          <Bot className={messageStyles.avatar.icon} />
        )}
      </div>

      <div className={messageStyles.content.wrapper}>
        <div className={messageStyles.content.header}>
          <span className={messageStyles.content.username}>
            {isUser ? 'Tú' : 'Asistente'}
          </span>
          <span className={messageStyles.content.timestamp}>
            {message.timestamp.toLocaleTimeString('es-AR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
          {isUser && <MessageStatus status={message.status} />}
        </div>

        {/* TODO: modularizar tool calls display */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className={messageStyles.toolCalls.container}>
            {message.toolCalls.map((tool, index) => (
              <ToolCallDisplay key={index} toolCall={tool} />
            ))}
          </div>
        )}

        {/* TODO: modularizar message content */}
        {message.content && (
          <div className={messageStyles.content.prose}>
            <div className={messageStyles.content.text}>
              {message.content}
            </div>
          </div>
        )}

        {/* TODO: modularizar typing indicator */}
        {isLast && !isUser && !message.content && (
          <div className={messageStyles.typingIndicator.container}>
            <div className={messageStyles.typingIndicator.dotsWrapper}>
              <div className={messageStyles.typingIndicator.dot} />
              <div className={messageStyles.typingIndicator.dot} style={{animationDelay: '0.1s'}} />
              <div className={messageStyles.typingIndicator.dot} style={{animationDelay: '0.2s'}} />
            </div>
            <span className={messageStyles.typingIndicator.text}>Escribiendo...</span>
          </div>
        )}
      </div>
    </div>
  );
}