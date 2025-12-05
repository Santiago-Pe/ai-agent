import { cn } from '@/lib/utils';

export const chatInputStyles = {
  container: "border-t bg-white p-4",
  innerContainer: "max-w-4xl mx-auto",
  inputWrapper: "relative flex items-center gap-3",
  textareaWrapper: "flex-1 relative",
  textareaBase: cn(
    "w-full p-3 pr-12 border border-gray-300 rounded-xl resize-none",
    "text-gray-900",
    "focus:ring-2 focus:ring-blue-500 focus:border-transparent",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    "min-h-[52px] max-h-[120px]"
  ),
  attachmentButton: "absolute right-3 top-3 p-1 text-gray-400 hover:text-gray-600 transition-colors",
  stopButton: "p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors flex-shrink-0",
  sendButton: {
    base: "p-3 rounded-xl transition-colors flex-shrink-0",
    active: "bg-blue-500 text-white hover:bg-blue-600",
    disabled: "bg-gray-300 text-gray-500 cursor-not-allowed"
  },
  tipsContainer: "mt-2 text-xs text-gray-500 text-center"
} as const;