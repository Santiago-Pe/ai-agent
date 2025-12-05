import { AuthState } from '../../types/chat';

export interface AuthChatProps {
  onAuth: (authState: AuthState) => void;
  isLoading: boolean;
}