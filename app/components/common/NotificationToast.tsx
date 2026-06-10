import styles from '../../WishlistPage.module.css';
import type { NotificationState } from '../../hooks/useNotification';

interface NotificationToastProps {
  notification: NotificationState | null;
}

export default function NotificationToast({ notification }: NotificationToastProps) {
  if (!notification) return null;

  return (
    <div key={notification.key} className={styles.notification} role="status" aria-live="polite">
      <span className={styles.notificationDot} />
      {notification.message}
    </div>
  );
}
