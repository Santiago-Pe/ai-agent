export const authChatStyles = {
  mainContainer: "flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4",
  card: "w-full max-w-md bg-white rounded-xl shadow-lg p-6",
  header: {
    container: "text-center mb-6",
    iconWrapper: "w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4",
    icon: "w-8 h-8 text-white",
    title: "text-2xl font-bold text-gray-800 mb-2",
    subtitle: "text-gray-600 text-sm"
  },
  error: {
    container: "bg-red-50 border border-red-200 rounded-lg p-3 mb-4",
    text: "text-red-700 text-sm"
  },
  inputSection: {
    container: "space-y-4",
    exampleBox: "bg-gray-50 rounded-lg p-3 text-sm text-gray-600",
    inputWrapper: "relative",
    textarea: "w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900",
    button: "absolute bottom-3 right-3 p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
    spinner: "animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full",
    sendIcon: "w-4 h-4"
  },
  footer: "mt-6 text-center text-xs text-gray-500"
} as const;