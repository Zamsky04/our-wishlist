import type { FormEvent, RefObject } from 'react';
import styles from '../../WishlistPage.module.css';
import type { GiftCategoryItem } from '../../types';
import { formatPriceInput } from '../../lib/helpers';

interface SeserahanEditPageProps {
  roomID: string;
  inputRef: RefObject<HTMLInputElement | null>;
  giftCategories: GiftCategoryItem[];
  title: string;
  price: string;
  link: string;
  categoryId: string;
  categoryName: string;
  onTitleChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onLinkChange: (value: string) => void;
  onCategoryIdChange: (value: string) => void;
  onCategoryNameChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
}

export default function SeserahanEditPage({
  roomID,
  inputRef,
  giftCategories,
  title,
  price,
  link,
  categoryId,
  categoryName,
  onTitleChange,
  onPriceChange,
  onLinkChange,
  onCategoryIdChange,
  onCategoryNameChange,
  onSubmit,
  onBack,
}: SeserahanEditPageProps) {
  const isNewCategoryFilled = Boolean(categoryName.trim());
  const isSubmitDisabled = !title.trim() || !roomID || (!categoryId && !isNewCategoryFilled);

  return (
    <section className={styles.giftAddPage} aria-label="Edit barang seserahan">
      <div className={styles.giftAddHeader}>
        <button className={styles.backButton} type="button" onClick={onBack}>
          ← Kembali
        </button>
        <div>
          <p className={styles.progressLabel}>Edit Barang</p>
          <h2>Perbarui detail seserahan</h2>
          <p>Link barang boleh dikosongkan. Nanti tetap bisa diedit lagi dari daftar seserahan.</p>
        </div>
      </div>

      <form className={styles.giftAddForm} onSubmit={onSubmit}>
        <div className={styles.formField}>
          <label htmlFor="edit-gift-title">Nama barang</label>
          <input
            ref={inputRef}
            id="edit-gift-title"
            className={styles.input}
            type="text"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Contoh: Mukena satin putih"
            maxLength={120}
            autoComplete="off"
          />
        </div>

        <div className={styles.giftAddGrid}>
          <div className={styles.formField}>
            <label htmlFor="edit-gift-price">Harga</label>
            <input
              id="edit-gift-price"
              className={styles.input}
              type="text"
              inputMode="numeric"
              value={price}
              onChange={(event) => onPriceChange(formatPriceInput(event.target.value))}
              placeholder="Contoh: 250.000"
              autoComplete="off"
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor="edit-gift-category-select">Pilih kategori</label>
            <select
              id="edit-gift-category-select"
              className={styles.select}
              value={categoryId}
              onChange={(event) => onCategoryIdChange(event.target.value)}
              disabled={isNewCategoryFilled}
            >
              {giftCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.formField}>
          <label htmlFor="edit-gift-category">
            Buat kategori baru <span>opsional</span>
          </label>
          <input
            id="edit-gift-category"
            className={styles.input}
            type="text"
            value={categoryName}
            onChange={(event) => onCategoryNameChange(event.target.value)}
            placeholder="Contoh: Perhiasan, Makeup, Pakaian & Ibadah"
            maxLength={40}
            autoComplete="off"
          />
          <small>Kalau kolom ini diisi, barang akan dipindah ke kategori baru tersebut.</small>
        </div>

        <div className={styles.formField}>
          <label htmlFor="edit-gift-link">
            Link barang <span>opsional</span>
          </label>
          <input
            id="edit-gift-link"
            className={styles.input}
            type="text"
            value={link}
            onChange={(event) => onLinkChange(event.target.value)}
            placeholder="Kosongkan kalau barang belum punya link"
            autoComplete="off"
            inputMode="url"
            spellCheck={false}
            maxLength={2048}
          />
          <small>Logo marketplace atau favicon website akan tampil otomatis di halaman daftar.</small>
        </div>

        <div className={styles.giftAddActions}>
          <button className={styles.addButton} type="submit" disabled={isSubmitDisabled}>
            Simpan Perubahan
          </button>
          <button className={styles.secondaryButton} type="button" onClick={onBack}>
            Batal
          </button>
        </div>
      </form>
    </section>
  );
}
