import type { FormEvent, RefObject } from 'react';
import styles from '../../WishlistPage.module.css';
import type { GiftCategoryItem } from '../../types';
import { formatPriceInput } from '../../lib/helpers';

interface SeserahanAddPageProps {
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
  onSubmitCategory: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
}

export default function SeserahanAddPage({
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
  onSubmitCategory,
  onBack,
}: SeserahanAddPageProps) {
  const isNewCategoryFilled = Boolean(categoryName.trim());
  const isSubmitDisabled = !title.trim() || !roomID || (!categoryId && !isNewCategoryFilled);

  return (
    <section className={styles.giftAddPage} aria-label="Tambah barang seserahan">
      <div className={styles.giftAddHeader}>
        <button className={styles.backButton} type="button" onClick={onBack}>
          ← Kembali
        </button>
        <div>
          <p className={styles.progressLabel}>Tambah Barang</p>
          <h2>Isi detail seserahan</h2>
          <p>Pilih kategori yang sudah ada, atau tulis kategori baru saat menambahkan barang.</p>
        </div>
      </div>

      <form className={styles.giftAddForm} onSubmit={onSubmit}>
        <div className={styles.formField}>
          <label htmlFor="new-gift-title">Nama barang</label>
          <input
            ref={inputRef}
            id="new-gift-title"
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
            <label htmlFor="new-gift-price">Harga</label>
            <input
              id="new-gift-price"
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
            <label htmlFor="new-gift-category-select">Pilih kategori</label>
            <select
              id="new-gift-category-select"
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
          <label htmlFor="new-gift-category">
            Buat kategori baru <span>opsional</span>
          </label>
          <input
            id="new-gift-category"
            className={styles.input}
            type="text"
            value={categoryName}
            onChange={(event) => onCategoryNameChange(event.target.value)}
            placeholder="Contoh: Perhiasan, Makeup, Pakaian & Ibadah"
            maxLength={40}
            autoComplete="off"
          />
          <small>Kalau kolom ini diisi, barang akan masuk ke kategori baru tersebut.</small>
        </div>

        <div className={styles.formField}>
          <label htmlFor="new-gift-link">
            Link barang <span>opsional</span>
          </label>
          <input
            id="new-gift-link"
            className={styles.input}
            type="text"
            value={link}
            onChange={(event) => onLinkChange(event.target.value)}
            placeholder="Link TikTok/Shopee/Tokopedia/website barang"
            autoComplete="off"
          />
        </div>

        <div className={styles.giftAddActions}>
          <button className={styles.addButton} type="submit" disabled={isSubmitDisabled}>
            Simpan Barang
          </button>
          <button className={styles.secondaryButton} type="button" onClick={onBack}>
            Batal
          </button>
        </div>
      </form>

      <form className={styles.categoryOnlyForm} onSubmit={onSubmitCategory}>
        <div>
          <p className={styles.progressLabel}>Kategori saja</p>
          <h3>Tambah kategori kosong</h3>
          <small>Opsional, dipakai kalau mau menyiapkan kategori dulu sebelum isi barang.</small>
        </div>
        <button className={styles.secondaryButton} type="submit" disabled={!categoryName.trim() || !roomID}>
          Simpan Kategori
        </button>
      </form>
    </section>
  );
}
