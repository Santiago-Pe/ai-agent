export const messageStyles = {
  container: {
    base: 'flex gap-3 p-4',
    user: 'bg-blue-50',
    system: 'bg-yellow-50 border-l-4 border-yellow-400'
  },
  avatar: {
    base: 'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
    user: 'bg-blue-500',
    assistant: 'bg-gray-600',
    icon: 'w-4 h-4 text-white'
  },
  content: {
    wrapper: 'flex-1 min-w-0',
    header: 'flex items-center gap-2 mb-1',
    username: 'text-sm font-medium text-gray-900',
    timestamp: 'text-xs text-gray-500',
    prose: 'prose prose-sm max-w-none',
    text: 'whitespace-pre-wrap text-gray-800'
  },
  toolCalls: {
    container: 'space-y-2 mb-3'
  },
  typingIndicator: {
    container: 'flex items-center gap-1 text-gray-500',
    dotsWrapper: 'flex space-x-1',
    dot: 'w-2 h-2 bg-gray-400 rounded-full animate-bounce',
    text: 'text-sm'
  },
  messageStatus: {
    icon: {
      sending: 'w-3 h-3 text-gray-400',
      sent: 'w-3 h-3 text-green-500',
      error: 'w-3 h-3 text-red-500'
    }
  },
  toolCallDisplay: {
    container: {
      base: 'border rounded-lg p-3 text-sm',
      pending: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      executing: 'text-blue-600 bg-blue-50 border-blue-200',
      completed: 'text-green-600 bg-green-50 border-green-200',
      error: 'text-red-600 bg-red-50 border-red-200'
    },
    header: 'flex items-center gap-2 mb-1',
    icon: 'text-base',
    name: 'font-medium',
    params: 'text-xs opacity-75 mb-1',
    result: 'text-xs'
  },
  toolCallStatus: {
    text: 'text-xs'
  }
} as const;