import styles from '../../WishlistPage.module.css';
import type { MainMenu } from '../../types';

interface MainMenuTabsProps {
  activeMenu: MainMenu;
  wishlistDoneCount: number;
  wishlistCount: number;
  giftDoneCount: number;
  giftCount: number;
  savingsDoneCount: number;
  savingsCount: number;
  onMenuChange: (menu: MainMenu) => void;
}

export default function MainMenuTabs({ activeMenu, wishlistDoneCount, wishlistCount, giftDoneCount, giftCount, savingsDoneCount, savingsCount, onMenuChange }: MainMenuTabsProps) {
  return (
    <nav className={styles.mainMenuTabs} role="tablist" aria-label="Menu utama">
      <button
        type="button"
        role="tab"
        aria-selected={activeMenu === 'wishlist'}
        className={`${styles.mainMenuTab} ${activeMenu === 'wishlist' ? styles.mainMenuTabActive : ''}`}
        onClick={() => onMenuChange('wishlist')}
      >
        <span>Wishlist</span>
        <strong>
          {wishlistDoneCount}/{wishlistCount}
        </strong>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={activeMenu === 'seserahan'}
        className={`${styles.mainMenuTab} ${activeMenu === 'seserahan' ? styles.mainMenuTabActive : ''}`}
        onClick={() => onMenuChange('seserahan')}
      >
        <span>Seserahan</span>
        <strong>
          {giftDoneCount}/{giftCount}
        </strong>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={activeMenu === 'savings'}
        className={`${styles.mainMenuTab} ${activeMenu === 'savings' ? styles.mainMenuTabActive : ''}`}
        onClick={() => onMenuChange('savings')}
      >
        <span>Tabungan</span>
        <strong>
          {savingsDoneCount}/{savingsCount}
        </strong>
      </button>
    </nav>
  );
}
