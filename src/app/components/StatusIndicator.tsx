import { cn } from '@/lib/utils';

interface StatusIndicatorProps {
  status: string;
  isVisible: boolean;
}

export function StatusIndicator({ status, isVisible }: StatusIndicatorProps) {
  if (!isVisible || !status) return null;

  return (
    <div className="border-t bg-gray-50 p-3">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span>{status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}