import type { FormEvent, RefObject } from 'react';
import styles from '../../WishlistPage.module.css';
import { categories } from '../../lib/constants';
import { formatDateTime } from '../../lib/helpers';
import type { SortBy, StatusFilter, WishCategory, WishItem } from '../../types';

interface WishlistPanelProps {
  roomID: string;
  names: Record<WishCategory, string>;
  inputRef: RefObject<HTMLInputElement | null>;
  newWish: string;
  activeTab: WishCategory;
  counts: Record<WishCategory, number>;
  checkedCount: number;
  totalCount: number;
  progressPercentage: number;
  categoryWishes: WishItem[];
  visibleWishes: WishItem[];
  searchQuery: string;
  statusFilter: StatusFilter;
  sortBy: SortBy;
  shouldShowTools: boolean;
  isLoading: boolean;
  exitingIds: Set<string>;
  onNewWishChange: (value: string) => void;
  onActiveTabChange: (value: WishCategory) => void;
  onSearchQueryChange: (value: string) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  onSortByChange: (value: SortBy) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggle: (id: string, currentValue: boolean) => void;
  onDelete: (id: string) => void;
}

function CheckIcon() {
  return (
    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
      <path d="M1 3.5L3.8 6.5L9 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
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

function getEmptyGlyph(category: WishCategory) {
  if (category === 'boy') return '♟';
  if (category === 'girl') return '♡';
  return '◈';
}

export default function WishlistPanel({
  roomID,
  names,
  inputRef,
  newWish,
  activeTab,
  counts,
  checkedCount,
  totalCount,
  progressPercentage,
  categoryWishes,
  visibleWishes,
  searchQuery,
  statusFilter,
  sortBy,
  shouldShowTools,
  isLoading,
  exitingIds,
  onNewWishChange,
  onActiveTabChange,
  onSearchQueryChange,
  onStatusFilterChange,
  onSortByChange,
  onSubmit,
  onToggle,
  onDelete,
}: WishlistPanelProps) {
  return (
    <div className={styles.contentShell}>
      <nav className={styles.tabs} role="tablist" aria-label="Kategori wishlist">
        {categories.map((category) => {
          const isActive = activeTab === category;

          return (
            <button
              key={category}
              type="button"
              role="tab"
              data-category={category}
              aria-selected={isActive}
              className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
              onClick={() => onActiveTabChange(category)}
            >
              <span className={styles.tabNumber}>{counts[category]}</span>
              <span className={styles.tabLabel}>{names[category]}</span>
            </button>
          );
        })}
      </nav>

      <section className={styles.progressCard} aria-label="Progress wishlist">
        <div className={styles.progressHeader}>
          <div>
            <p className={styles.progressLabel}>Mimpi Tercapai</p>
            <p className={styles.progressNumber}>
              {checkedCount}
              <span> / {totalCount}</span>
            </p>
          </div>
          <p className={styles.progressPercent}>{progressPercentage}%</p>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progressPercentage}%` }} />
        </div>
      </section>

      <form className={styles.form} onSubmit={onSubmit}>
        <label className={styles.srOnly} htmlFor="new-wish">
          Tambah wishlist
        </label>
        <input
          ref={inputRef}
          id="new-wish"
          className={styles.input}
          type="text"
          value={newWish}
          onChange={(event) => onNewWishChange(event.target.value)}
          placeholder={`Tambahkan impian ${names[activeTab].toLowerCase()}…`}
          maxLength={120}
          autoComplete="off"
        />
        <button className={styles.addButton} type="submit" disabled={!newWish.trim() || !roomID}>
          Tambah
        </button>
      </form>

      {shouldShowTools && (
        <section className={styles.tools} aria-label="Filter wishlist">
          <label className={styles.srOnly} htmlFor="search-wish">
            Cari wishlist
          </label>
          <input
            id="search-wish"
            className={styles.searchInput}
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Cari wishlist..."
          />

          <div className={styles.selectGrid}>
            <label className={styles.srOnly} htmlFor="status-filter">
              Filter status
            </label>
            <select
              id="status-filter"
              className={styles.select}
              value={statusFilter}
              onChange={(event) => onStatusFilterChange(event.target.value as StatusFilter)}
            >
              <option value="all">Semua</option>
              <option value="active">Belum Tercapai</option>
              <option value="done">Tercapai</option>
            </select>

            <label className={styles.srOnly} htmlFor="sort-wish">
              Urutkan wishlist
            </label>
            <select id="sort-wish" className={styles.select} value={sortBy} onChange={(event) => onSortByChange(event.target.value as SortBy)}>
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
              <option value="az">A-Z</option>
              <option value="doneFirst">Tercapai dulu</option>
            </select>
          </div>
        </section>
      )}

      <section className={styles.list} aria-live="polite">
        {isLoading ? (
          [0, 1, 2].map((index) => <div key={index} className={styles.skeleton} style={{ animationDelay: `${index * 100}ms` }} />)
        ) : categoryWishes.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyGlyph}>{getEmptyGlyph(activeTab)}</p>
            <p className={styles.emptyText}>
              Belum ada wishlist {names[activeTab].toLowerCase()}.
              <br />
              Tulis impian pertamamu di atas.
            </p>
          </div>
        ) : visibleWishes.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyGlyph}>⌕</p>
            <p className={styles.emptyText}>
              Tidak ada wishlist yang cocok.
              <br />
              Coba ubah kata kunci atau filter.
            </p>
          </div>
        ) : (
          visibleWishes.map((item, index) => (
            <article
              key={item.id}
              className={`${styles.item} ${item.is_checked ? styles.itemDone : ''} ${exitingIds.has(item.id) ? styles.itemExiting : ''}`}
              style={{ animationDelay: `${index * 24}ms` }}
            >
              <button
                type="button"
                aria-label={item.is_checked ? 'Tandai belum tercapai' : 'Tandai sudah tercapai'}
                aria-pressed={item.is_checked}
                className={`${styles.checkbox} ${item.is_checked ? styles.checkboxActive : ''}`}
                onClick={() => onToggle(item.id, item.is_checked)}
              >
                {item.is_checked && <CheckIcon />}
              </button>

              <button className={styles.itemTextButton} type="button" onClick={() => onToggle(item.id, item.is_checked)}>
                <span className={styles.itemText}>{item.text}</span>
                <span className={styles.itemMeta}>
                  {item.is_checked ? 'Tercapai' : 'Belum tercapai'} · {formatDateTime(item.created_at)}
                </span>
              </button>

              <button
                type="button"
                className={styles.deleteButton}
                aria-label="Hapus wishlist"
                disabled={exitingIds.has(item.id)}
                onClick={() => onDelete(item.id)}
              >
                <TrashIcon />
              </button>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
