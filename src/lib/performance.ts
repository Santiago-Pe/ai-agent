import { useState, useEffect, useRef } from 'react';

// Hook para debounce
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Hook para throttle
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    // Si es la primera vez, inicializar y no throttlear
    if (lastRan.current === null) {
      lastRan.current = Date.now();
      return;
    }

    const now = Date.now();
    const timeSinceLastRan = now - lastRan.current;

    // Si ya pasó suficiente tiempo, actualizar inmediatamente
    if (timeSinceLastRan >= limit) {
      timeoutRef.current = setTimeout(() => {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }, 0);
    } else {
      // Programar actualización para cuando se cumpla el límite
      const timeToWait = limit - timeSinceLastRan;
      timeoutRef.current = setTimeout(() => {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }, timeToWait);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, limit]);

  return throttledValue;
}

// Optimización de scroll virtual para mensajes largos*
export function useVirtualScroll(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[], 
  itemHeight: number, 
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );
  
  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;
  
  return {
    visibleItems,
    offsetY,
    totalHeight: items.length * itemHeight,
    onScroll: (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    }
  };
}