import styles from '../../WishlistPage.module.css';
import type { GiftItem } from '../../types';
import { formatCompactCurrency } from '../../lib/helpers';
import GiftLinkBadge from './GiftLinkBadge';
import type { GiftListGroup } from './types';

interface SeserahanListProps {
  roomID: string;
  giftItems: GiftItem[];
  giftDoneCount: number;
  giftTotalBudget: number;
  giftDoneBudget: number;
  giftProgressPercentage: number;
  giftListGroups: GiftListGroup[];
  isGiftLoading: boolean;
  giftExitingIds: Set<string>;
  onAddClick: () => void;
  onEditGift: (gift: GiftItem) => void;
  onToggleGift: (id: string, currentValue: boolean) => void;
  onDeleteGift: (id: string) => void;
}

function CheckIcon() {
  return (
    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
      <path d="M1 3.5L3.8 6.5L9 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

export default function SeserahanList({
  roomID,
  giftItems,
  giftDoneCount,
  giftTotalBudget,
  giftDoneBudget,
  giftProgressPercentage,
  giftListGroups,
  isGiftLoading,
  giftExitingIds,
  onAddClick,
  onEditGift,
  onToggleGift,
  onDeleteGift,
}: SeserahanListProps) {
  return (
    <>
      <section className={styles.giftBoard} aria-label="Daftar seserahan">
        <div className={styles.giftBoardHeader}>
          <div>
            <p className={styles.progressLabel}>Seserahan</p>
            <h2 className={styles.giftBoardTitle}>Daftar barang akad & nikah</h2>
            <p className={styles.giftBoardSubtitle}>
              {giftItems.length} barang · {giftDoneCount} sudah dibeli
            </p>
          </div>

          <button className={styles.giftPrimaryAction} type="button" onClick={onAddClick} disabled={!roomID}>
            + Tambah Barang
          </button>
        </div>

        <div className={styles.giftBoardStats} aria-label="Ringkasan seserahan">
          <div className={styles.giftBoardStat}>
            <span>Siap</span>
            <strong>
              {giftDoneCount}/{giftItems.length}
            </strong>
          </div>
          <div className={styles.giftBoardStat}>
            <span>Total estimasi</span>
            <strong>{formatCompactCurrency(giftTotalBudget)}</strong>
          </div>
          <div className={styles.giftBoardStat}>
            <span>Sudah dibeli</span>
            <strong>{formatCompactCurrency(giftDoneBudget)}</strong>
          </div>
        </div>

        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${giftProgressPercentage}%` }} />
        </div>
      </section>

      <section className={styles.giftListBoard} aria-live="polite">
        {isGiftLoading ? (
          [0, 1, 2].map((index) => <div key={index} className={styles.giftTableSkeleton} style={{ animationDelay: `${index * 100}ms` }} />)
        ) : giftItems.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyGlyph}>✦</p>
            <p className={styles.emptyText}>
              Belum ada barang seserahan.
              <br />
              Klik Tambah Barang untuk mulai isi kategori, harga, dan link.
            </p>
          </div>
        ) : (
          giftListGroups.map((group) => {
            const doneInCategory = group.items.filter((item) => item.is_checked).length;

            return (
              <article key={group.category.id} className={styles.giftCategoryTable}>
                <header className={styles.giftCategoryHeader}>
                  <div className={styles.giftCategoryTitleWrap}>
                    <span className={styles.giftCategoryDot} />
                    <h3>{group.category.name}</h3>
                  </div>
                  <span className={styles.giftCategoryCount}>
                    {doneInCategory}/{group.items.length}
                  </span>
                </header>

                <div className={styles.giftTableHeader} aria-hidden="true">
                  <span />
                  <span>Nama Barang</span>
                  <span>Harga</span>
                  <span>Link</span>
                  <span />
                </div>

                <div className={styles.giftRows}>
                  {group.items.map((item, index) => (
                    <div
                      key={item.id}
                      className={`${styles.giftListRow} ${item.is_checked ? styles.giftListRowDone : ''} ${giftExitingIds.has(item.id) ? styles.itemExiting : ''}`}
                      style={{ animationDelay: `${index * 24}ms` }}
                    >
                      <button
                        type="button"
                        aria-label={item.is_checked ? 'Tandai belum dibeli' : 'Tandai sudah dibeli'}
                        aria-pressed={item.is_checked}
                        className={`${styles.checkbox} ${item.is_checked ? styles.checkboxActive : ''}`}
                        onClick={() => onToggleGift(item.id, item.is_checked)}
                      >
                        {item.is_checked && <CheckIcon />}
                      </button>

                      <button className={styles.giftNameCell} type="button" onClick={() => onToggleGift(item.id, item.is_checked)}>
                        <span>
                          {index + 1}. {item.title}
                        </span>
                        <small>{item.is_checked ? 'Sudah dibeli' : 'Belum dibeli'}</small>
                      </button>

                      <strong className={styles.giftPriceCell}>{formatCompactCurrency(item.price)}</strong>

                      {item.link_url ? <GiftLinkBadge url={item.link_url} /> : <span className={styles.giftLinkEmpty}>Belum diisi</span>}

                      <div className={styles.giftRowActions}>
                        <button type="button" className={styles.giftRowEditButton} aria-label="Edit barang seserahan" onClick={() => onEditGift(item)}>
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          className={styles.giftRowDeleteButton}
                          aria-label="Hapus barang seserahan"
                          disabled={giftExitingIds.has(item.id)}
                          onClick={() => onDeleteGift(item.id)}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })
        )}
      </section>
    </>
  );
}
