import styles from '../../WishlistPage.module.css';

interface WeddingHeaderProps {
  boyName: string;
  girlName: string;
  tempBoyName: string;
  tempGirlName: string;
  editingNames: boolean;
  onTempBoyNameChange: (value: string) => void;
  onTempGirlNameChange: (value: string) => void;
  onStartEditNames: () => void;
  onCancelEditNames: () => void;
  onSaveNames: () => void;
  onCopyLink: () => void;
}

function EditIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export default function WeddingHeader({
  boyName,
  girlName,
  tempBoyName,
  tempGirlName,
  editingNames,
  onTempBoyNameChange,
  onTempGirlNameChange,
  onStartEditNames,
  onCancelEditNames,
  onSaveNames,
  onCopyLink,
}: WeddingHeaderProps) {
  return (
    <header className={styles.header}>
      {editingNames ? (
        <div className={styles.editNames}>
          <label className={styles.srOnly} htmlFor="boy-name">
            Nama pertama
          </label>
          <input
            id="boy-name"
            className={styles.nameInput}
            value={tempBoyName}
            maxLength={18}
            onChange={(event) => onTempBoyNameChange(event.target.value)}
          />

          <span className={styles.inlineAmp} aria-hidden="true">
            &
          </span>

          <label className={styles.srOnly} htmlFor="girl-name">
            Nama kedua
          </label>
          <input
            id="girl-name"
            className={styles.nameInput}
            value={tempGirlName}
            maxLength={18}
            onChange={(event) => onTempGirlNameChange(event.target.value)}
          />

          <div className={styles.editActions}>
            <button className={styles.saveButton} type="button" onClick={onSaveNames}>
              Simpan
            </button>
            <button className={styles.cancelButton} type="button" onClick={onCancelEditNames}>
              Batal
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.namesRow}>
          <h1 className={styles.namesTitle}>
            {boyName}
            <span className={styles.ampersand}>&</span>
            {girlName}
          </h1>

          <button className={styles.editTrigger} type="button" onClick={onStartEditNames} aria-label="Edit nama pasangan">
            <EditIcon />
          </button>
        </div>
      )}

      <p className={styles.tagline}>Wishlist & Seserahan Planner</p>

      <button className={styles.linkButton} type="button" onClick={onCopyLink}>
        <LinkIcon />
        Bagikan ke Pasangan
      </button>
    </header>
  );
}
