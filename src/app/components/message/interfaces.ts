import { Message as MessageType, ToolCall } from '../../types/chat';

export interface MessageProps {
  message: MessageType;
  isLast?: boolean;
}

export interface MessageStatusProps {
  status?: MessageType['status'];
}

export interface ToolCallDisplayProps {
  toolCall: ToolCall;
}

export interface ToolCallStatusProps {
  status: ToolCall['status'];
}