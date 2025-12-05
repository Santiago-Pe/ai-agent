import type { ToolArgs } from '@/lib/tools';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  status?: 'sending' | 'sent' | 'error';
}

export interface ToolResult {
  success: boolean;
  message: string;
  error?: string;
  details?: string;
  [key: string]: unknown;
}

export interface ToolCall {
  name: string;
  args: ToolArgs;
  result?: ToolResult;
  status: 'pending' | 'executing' | 'completed' | 'error';
  displayName?: string;
}

export interface StreamData {
  type: 'status' | 'content' | 'tool_call' | 'error';
  content: string;
  toolCall?: ToolCall;
  finished: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user?: {
    id: string;
    name: string;
    displayName: string;
  };
  conversationId?: string;
  sessionId?: string;
}