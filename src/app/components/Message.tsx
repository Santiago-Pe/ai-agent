import { cn } from '@/lib/utils';
import { Message as MessageType, ToolCall } from '../types/chat';
import { User, Bot, Clock, CheckCircle, XCircle } from 'lucide-react';


interface MessageProps {
  message: MessageType;
  isLast?: boolean;
}

export function Message({ message, isLast }: MessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <div className={cn(
      'flex gap-3 p-4',
      isUser && 'bg-blue-50',
      isSystem && 'bg-yellow-50 border-l-4 border-yellow-400'
    )}>
      {/* Avatar */}
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
        isUser ? 'bg-blue-500' : 'bg-gray-600'
      )}>
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900">
            {isUser ? 'Tú' : 'Asistente'}
          </span>
          <span className="text-xs text-gray-500">
            {message.timestamp.toLocaleTimeString('es-AR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
          {isUser && <MessageStatus status={message.status} />}
        </div>

        {/* Tool Calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="space-y-2 mb-3">
            {message.toolCalls.map((tool, index) => (
              <ToolCallDisplay key={index} toolCall={tool} />
            ))}
          </div>
        )}

        {/* Message Content */}
        {message.content && (
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-gray-800">
              {message.content}
            </div>
          </div>
        )}

        {/* Typing indicator for last message */}
        {isLast && !isUser && !message.content && (
          <div className="flex items-center gap-1 text-gray-500">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
            </div>
            <span className="text-sm">Escribiendo...</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageStatus({ status }: { status?: MessageType['status'] }) {
  switch (status) {
    case 'sending':
      return <Clock className="w-3 h-3 text-gray-400" />;
    case 'sent':
      return <CheckCircle className="w-3 h-3 text-green-500" />;
    case 'error':
      return <XCircle className="w-3 h-3 text-red-500" />;
    default:
      return null;
  }
}

function ToolCallDisplay({ toolCall }: { toolCall: ToolCall }) {
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

  const getStatusColor = (status: ToolCall['status']) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'executing': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  return (
    <div className={cn(
      'border rounded-lg p-3 text-sm',
      getStatusColor(toolCall.status)
    )}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{getToolIcon(toolCall.name)}</span>
        <span className="font-medium">{getToolDisplayName(toolCall.name)}</span>
        <ToolCallStatus status={toolCall.status} />
      </div>
      
      {toolCall.args && (
        <div className="text-xs opacity-75 mb-1">
          <strong>Parámetros:</strong> {JSON.stringify(toolCall.args)}
        </div>
      )}
      
      {toolCall.result && (
        <div className="text-xs">
          <strong>Resultado:</strong> {
            toolCall.result.message || 
            (typeof toolCall.result === 'string' ? toolCall.result : JSON.stringify(toolCall.result))
          }
        </div>
      )}
    </div>
  );
}

function ToolCallStatus({ status }: { status: ToolCall['status'] }) {
  switch (status) {
    case 'pending':
      return <span className="text-xs">⏳ Pendiente</span>;
    case 'executing':
      return <span className="text-xs">⚡ Ejecutando...</span>;
    case 'completed':
      return <span className="text-xs">✅ Completado</span>;
    case 'error':
      return <span className="text-xs">❌ Error</span>;
  }
}