import styles from '../../WishlistPage.module.css';

interface WeddingFooterProps {
  roomID: string;
}

export default function WeddingFooter({ roomID }: WeddingFooterProps) {
  return (
    <footer className={styles.footer}>
      <p className={styles.footerQuote}>“Every dream begins with a single wish.”</p>
      <p className={styles.footerRoom}>{roomID ? roomID.slice(5, 17).toUpperCase() : 'ROOM'}</p>
    </footer>
  );
}
