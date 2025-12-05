export const errorBoundaryStyles = {
  container: "min-h-screen flex items-center justify-center bg-gray-50 p-4",
  card: "max-w-md w-full bg-white rounded-xl shadow-lg p-6 text-center",
  iconWrapper: "w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4",
  icon: "w-8 h-8 text-red-500",
  title: "text-xl font-bold text-gray-800 mb-2",
  description: "text-gray-600 mb-6",
  reloadButton: "inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors",
  reloadIcon: "w-4 h-4",
  errorDetails: {
    container: "mt-4 text-left",
    summary: "text-sm text-gray-500 cursor-pointer",
    pre: "mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto"
  }
} as const;