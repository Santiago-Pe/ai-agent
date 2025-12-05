import { StatusIndicatorProps } from './interfaces';
import { statusIndicatorStyles } from './styles';

export function StatusIndicator({ status, isVisible }: StatusIndicatorProps) {
  if (!isVisible || !status) return null;

  return (
    <div className={statusIndicatorStyles.container}>
      <div className={statusIndicatorStyles.innerContainer}>
        <div className={statusIndicatorStyles.contentWrapper}>
          <div className={statusIndicatorStyles.statusWrapper}>
            <div className={statusIndicatorStyles.dot} />
            <span>{status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}