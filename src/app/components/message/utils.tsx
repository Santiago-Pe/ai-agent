import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MessageStatusProps, ToolCallDisplayProps, ToolCallStatusProps } from './interfaces';
import { messageStyles } from './styles';

export function MessageStatus({ status }: MessageStatusProps) {
  switch (status) {
    case 'sending':
      return <Clock className={messageStyles.messageStatus.icon.sending} />;
    case 'sent':
      return <CheckCircle className={messageStyles.messageStatus.icon.sent} />;
    case 'error':
      return <XCircle className={messageStyles.messageStatus.icon.error} />;
    default:
      return null;
  }
}

export function ToolCallDisplay({ toolCall }: ToolCallDisplayProps) {
  const getToolIcon = (name: string) => {
    switch (name) {
      case 'searchDocuments': return '🔍';
      case 'saveData': return '💾';
      case 'calculate': return '🧮';
      default: return '🔧';
    }
  };

  const getToolDisplayName = (name: string) => {
    switch (name) {
      case 'searchDocuments': return 'Búsqueda en documentos';
      case 'saveData': return 'Guardar información';
      case 'calculate': return 'Calculadora';
      default: return name;
    }
  };

  const getStatusColor = (status: ToolCallDisplayProps['toolCall']['status']) => {
    switch (status) {
      case 'pending': return messageStyles.toolCallDisplay.container.pending;
      case 'executing': return messageStyles.toolCallDisplay.container.executing;
      case 'completed': return messageStyles.toolCallDisplay.container.completed;
      case 'error': return messageStyles.toolCallDisplay.container.error;
    }
  };

  return (
    <div className={cn(
      messageStyles.toolCallDisplay.container.base,
      getStatusColor(toolCall.status)
    )}>
      <div className={messageStyles.toolCallDisplay.header}>
        <span className={messageStyles.toolCallDisplay.icon}>{getToolIcon(toolCall.name)}</span>
        <span className={messageStyles.toolCallDisplay.name}>{getToolDisplayName(toolCall.name)}</span>
        <ToolCallStatus status={toolCall.status} />
      </div>

      {toolCall.args && (
        <div className={messageStyles.toolCallDisplay.params}>
          <strong>Parámetros:</strong> {JSON.stringify(toolCall.args)}
        </div>
      )}

      {toolCall.result && (
        <div className={messageStyles.toolCallDisplay.result}>
          <strong>Resultado:</strong> {
            toolCall.result.message ||
            (typeof toolCall.result === 'string' ? toolCall.result : JSON.stringify(toolCall.result))
          }
        </div>
      )}
    </div>
  );
}

export function ToolCallStatus({ status }: ToolCallStatusProps) {
  switch (status) {
    case 'pending':
      return <span className={messageStyles.toolCallStatus.text}>⏳ Pendiente</span>;
    case 'executing':
      return <span className={messageStyles.toolCallStatus.text}>⚡ Ejecutando...</span>;
    case 'completed':
      return <span className={messageStyles.toolCallStatus.text}>✅ Completado</span>;
    case 'error':
      return <span className={messageStyles.toolCallStatus.text}>❌ Error</span>;
  }
}