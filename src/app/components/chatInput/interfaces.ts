export interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  onStopGeneration: () => void;
  disabled?: boolean;
  placeholder?: string;
}