import { useCallback, useEffect, useRef, useState } from 'react';

export interface NotificationState {
  message: string;
  key: number;
}

export function useNotification() {
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((message: string) => {
    setNotification({ message, key: Date.now() });

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setNotification(null), 2800);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { notification, notify };
}
