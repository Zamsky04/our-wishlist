'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Cormorant, DM_Sans } from 'next/font/google';
import styles from './WishlistPage.module.css';

type WishCategory = 'boy' | 'together' | 'girl';
type StatusFilter = 'all' | 'active' | 'done';
type SortBy = 'newest' | 'oldest' | 'az' | 'doneFirst';

interface WishItem {
  id: string;
  room_id: string;
  text: string;
  category: WishCategory;
  is_checked: boolean;
  created_at: number;
}

type WishRow = WishItem;

type WishInsert = {
  id: string;
  room_id: string;
  text: string;
  category: WishCategory;
  is_checked?: boolean;
  created_at: number;
};

type WishUpdate = Partial<Pick<WishItem, 'text' | 'category' | 'is_checked' | 'created_at'>>;

const serifFont = Cormorant({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--wishlist-serif',
  display: 'swap',
});

const sansFont = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--wishlist-sans',
  display: 'swap',
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
const isSupabaseReady = Boolean(supabaseUrl && supabaseAnonKey);

const supabase = isSupabaseReady ? createClient(supabaseUrl, supabaseAnonKey) : null;

type WishlistSupabaseClient = NonNullable<typeof supabase>;

const WISHES_TABLE = 'wishes';

const categories: WishCategory[] = ['boy', 'together', 'girl'];

function createRoomID() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `room_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  }

  return `room_${Math.random().toString(36).slice(2, 14)}`;
}

function createWishID() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `wish_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function readStorage(key: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;

  try {
    return window.localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: string) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // localStorage bisa diblokir di private mode.
  }
}

function getInitialRoomID() {
  if (typeof window === 'undefined') return '';

  const params = new URLSearchParams(window.location.search);
  return params.get('room') || readStorage('wishlist_room_id', '') || createRoomID();
}

function mapRow(row: WishRow): WishItem {
  return {
    id: row.id,
    room_id: row.room_id,
    text: row.text,
    category: row.category,
    is_checked: row.is_checked,
    created_at: row.created_at,
  };
}

function sortNewest(items: WishItem[]) {
  return [...items].sort((a, b) => b.created_at - a.created_at);
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

async function copyText(value: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

export default function WishlistPage() {
  const [roomID, setRoomID] = useState('');
  const [boyName, setBoyName] = useState('Dia');
  const [girlName, setGirlName] = useState('Kamu');
  const [tempBoyName, setTempBoyName] = useState('Dia');
  const [tempGirlName, setTempGirlName] = useState('Kamu');

  const [wishes, setWishes] = useState<WishItem[]>([]);
  const [newWish, setNewWish] = useState('');
  const [activeTab, setActiveTab] = useState<WishCategory>('together');
  const [editingNames, setEditingNames] = useState(false);
  const [notif, setNotif] = useState<{ message: string; key: number } | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseReady);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('newest');

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((message: string) => {
    setNotif({ message, key: Date.now() });

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setNotif(null), 2800);
  }, []);

  const initializeBrowserState = useCallback(() => {
    const nextRoomID = getInitialRoomID();
    const nextBoyName = readStorage('wishlist_boy_name', 'Dia');
    const nextGirlName = readStorage('wishlist_girl_name', 'Kamu');

    setRoomID(nextRoomID);
    setBoyName(nextBoyName);
    setGirlName(nextGirlName);
    setTempBoyName(nextBoyName);
    setTempGirlName(nextGirlName);

    if (nextRoomID) writeStorage('wishlist_room_id', nextRoomID);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const timeoutID = window.setTimeout(initializeBrowserState, 0);

    return () => window.clearTimeout(timeoutID);
  }, [initializeBrowserState]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!roomID) return;

    const client = supabase;

    if (!client) {
      window.setTimeout(() => {
        notify('Supabase belum dikonfigurasi');
      }, 0);

      return;
    }

    let active = true;

    async function loadWishes(db: WishlistSupabaseClient) {
      const { data, error } = await db
        .from(WISHES_TABLE)
        .select('*')
        .eq('room_id', roomID)
        .order('created_at', { ascending: false });

      if (!active) return;

      if (error) {
        console.error('Supabase load wishes error:', error);
        notify(error.message || 'Gagal memuat wishlist');
        setIsLoading(false);
        return;
      }

      setWishes((data || []).map(mapRow));
      setIsLoading(false);
    }

    void loadWishes(client);

    const channel = client
      .channel(`wishlist-room-${roomID}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: WISHES_TABLE,
          filter: `room_id=eq.${roomID}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const item = mapRow(payload.new as WishRow);
            setWishes((prev) => (prev.some((wish) => wish.id === item.id) ? prev : sortNewest([item, ...prev])));
          }

          if (payload.eventType === 'UPDATE') {
            const item = mapRow(payload.new as WishRow);
            setWishes((prev) => sortNewest(prev.map((wish) => (wish.id === item.id ? item : wish))));
          }

          if (payload.eventType === 'DELETE') {
            const old = payload.old as Pick<WishRow, 'id'>;

            setExitingIds((prev) => {
              const next = new Set(prev);
              next.delete(old.id);
              return next;
            });

            setWishes((prev) => prev.filter((wish) => wish.id !== old.id));
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, [notify, roomID]);

  const names = useMemo(
    () => ({
      boy: boyName,
      together: 'Bersama',
      girl: girlName,
    }),
    [boyName, girlName],
  );

  const counts = useMemo(() => {
    return wishes.reduce<Record<WishCategory, number>>(
      (acc, wish) => {
        acc[wish.category] += 1;
        return acc;
      },
      { boy: 0, together: 0, girl: 0 },
    );
  }, [wishes]);

  const categoryWishes = useMemo(() => wishes.filter((wish) => wish.category === activeTab), [activeTab, wishes]);

  const visibleWishes = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    return categoryWishes
      .filter((wish) => {
        const matchesSearch = !keyword || wish.text.toLowerCase().includes(keyword);
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'active' && !wish.is_checked) ||
          (statusFilter === 'done' && wish.is_checked);

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'oldest') return a.created_at - b.created_at;
        if (sortBy === 'az') return a.text.localeCompare(b.text, 'id-ID');
        if (sortBy === 'doneFirst') return Number(b.is_checked) - Number(a.is_checked) || b.created_at - a.created_at;
        return b.created_at - a.created_at;
      });
  }, [categoryWishes, searchQuery, sortBy, statusFilter]);

  const checkedCount = useMemo(() => categoryWishes.filter((wish) => wish.is_checked).length, [categoryWishes]);
  const totalCount = categoryWishes.length;
  const progressPercentage = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const shouldShowTools = Boolean(categoryWishes.length >= 4 || searchQuery || statusFilter !== 'all' || sortBy !== 'newest');

  const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const text = newWish.trim();
    if (!text) return;

    const client = supabase;

    if (!roomID || !client) {
      notify('Koneksi belum siap');
      return;
    }

    const item: WishItem = {
      id: createWishID(),
      room_id: roomID,
      text,
      category: activeTab,
      is_checked: false,
      created_at: Date.now(),
    };

    const insertPayload: WishInsert = {
      id: item.id,
      room_id: item.room_id,
      text: item.text,
      category: item.category,
      is_checked: item.is_checked,
      created_at: item.created_at,
    };

    setNewWish('');
    setWishes((prev) => sortNewest([item, ...prev]));

    const { error } = await client.from(WISHES_TABLE).insert(insertPayload);

    if (error) {
      setWishes((prev) => prev.filter((wish) => wish.id !== item.id));
      notify('Gagal menyimpan wishlist');
      return;
    }

    inputRef.current?.focus();
  };

  const handleStartEditNames = () => {
    setTempBoyName(boyName);
    setTempGirlName(girlName);
    setEditingNames(true);
  };

  const handleCancelEditNames = () => {
    setTempBoyName(boyName);
    setTempGirlName(girlName);
    setEditingNames(false);
  };

  const handleSaveNames = () => {
    const nextBoyName = tempBoyName.trim() || 'Dia';
    const nextGirlName = tempGirlName.trim() || 'Kamu';

    setBoyName(nextBoyName);
    setGirlName(nextGirlName);
    setTempBoyName(nextBoyName);
    setTempGirlName(nextGirlName);

    writeStorage('wishlist_boy_name', nextBoyName);
    writeStorage('wishlist_girl_name', nextGirlName);

    setEditingNames(false);
    notify('Nama diperbarui');
  };

  const handleToggle = async (id: string, currentValue: boolean) => {
    const client = supabase;

    if (!client) {
      notify('Supabase belum dikonfigurasi');
      return;
    }

    const nextValue = !currentValue;
    const updatePayload: WishUpdate = { is_checked: nextValue };

    setWishes((prev) => prev.map((wish) => (wish.id === id ? { ...wish, is_checked: nextValue } : wish)));

    const { error } = await client.from(WISHES_TABLE).update(updatePayload).eq('id', id);

    if (error) {
      setWishes((prev) => prev.map((wish) => (wish.id === id ? { ...wish, is_checked: currentValue } : wish)));
      notify('Gagal memperbarui status');
    }
  };

  const handleDelete = (id: string) => {
    const deletedItem = wishes.find((wish) => wish.id === id);
    if (!deletedItem || exitingIds.has(id)) return;

    setExitingIds((prev) => new Set([...prev, id]));

    setTimeout(async () => {
      setWishes((prev) => prev.filter((wish) => wish.id !== id));

      setExitingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      const client = supabase;

      if (!client) {
        setWishes((prev) => (prev.some((wish) => wish.id === id) ? prev : sortNewest([deletedItem, ...prev])));
        notify('Supabase belum dikonfigurasi');
        return;
      }

      const { error } = await client.from(WISHES_TABLE).delete().eq('id', id);

      if (error) {
        setWishes((prev) => (prev.some((wish) => wish.id === id) ? prev : sortNewest([deletedItem, ...prev])));
        notify('Gagal menghapus wishlist');
      }
    }, 260);
  };

  const handleCopyLink = async () => {
    if (!roomID) {
      notify('Room belum siap');
      return;
    }

    try {
      const url = new URL(window.location.href);
      url.searchParams.set('room', roomID);
      await copyText(url.toString());
      notify('Link disalin — kirim ke pasangan');
    } catch {
      notify('Gagal menyalin link');
    }
  };

  return (
    <main className={`${styles.root} ${serifFont.variable} ${sansFont.variable}`}>
      <section className={styles.page} data-accent={activeTab}>
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
                onChange={(event) => setTempBoyName(event.target.value)}
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
                onChange={(event) => setTempGirlName(event.target.value)}
              />

              <div className={styles.editActions}>
                <button className={styles.saveButton} type="button" onClick={handleSaveNames}>
                  Simpan
                </button>
                <button className={styles.cancelButton} type="button" onClick={handleCancelEditNames}>
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

              <button className={styles.editTrigger} type="button" onClick={handleStartEditNames} aria-label="Edit nama pasangan">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
          )}

          <p className={styles.tagline}>Our Private Wishlist</p>

          <button className={styles.linkButton} type="button" onClick={handleCopyLink}>
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
            Hubungkan ke HP Pasangan
          </button>
        </header>

        <div className={styles.divider} />

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
                onClick={() => setActiveTab(category)}
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

        <form className={styles.form} onSubmit={handleAdd}>
          <label className={styles.srOnly} htmlFor="new-wish">
            Tambah wishlist
          </label>
          <input
            ref={inputRef}
            id="new-wish"
            className={styles.input}
            type="text"
            value={newWish}
            onChange={(event) => setNewWish(event.target.value)}
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
              onChange={(event) => setSearchQuery(event.target.value)}
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
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              >
                <option value="all">Semua</option>
                <option value="active">Aktif</option>
                <option value="done">Tercapai</option>
              </select>

              <label className={styles.srOnly} htmlFor="sort-wish">
                Urutkan wishlist
              </label>
              <select id="sort-wish" className={styles.select} value={sortBy} onChange={(event) => setSortBy(event.target.value as SortBy)}>
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
              <p className={styles.emptyGlyph}>{activeTab === 'boy' ? '♟' : activeTab === 'girl' ? '♡' : '◈'}</p>
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
                  onClick={() => handleToggle(item.id, item.is_checked)}
                >
                  {item.is_checked && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                      <path d="M1 3.5L3.8 6.5L9 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>

                <button className={styles.itemTextButton} type="button" onClick={() => handleToggle(item.id, item.is_checked)}>
                  <span className={styles.itemText}>{item.text}</span>
                  <span className={styles.itemMeta}>
                    {item.is_checked ? 'Tercapai' : 'Aktif'} · {formatDate(item.created_at)}
                  </span>
                </button>

                <button
                  type="button"
                  className={styles.deleteButton}
                  aria-label="Hapus wishlist"
                  disabled={exitingIds.has(item.id)}
                  onClick={() => handleDelete(item.id)}
                >
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
                </button>
              </article>
            ))
          )}
        </section>

        <footer className={styles.footer}>
          <p className={styles.footerQuote}>“Every dream begins with a single wish.”</p>
          <p className={styles.footerRoom}>{roomID ? roomID.slice(5, 17).toUpperCase() : 'ROOM'}</p>
        </footer>
      </section>

      {notif && (
        <div key={notif.key} className={styles.notification} role="status" aria-live="polite">
          <span className={styles.notificationDot} />
          {notif.message}
        </div>
      )}
    </main>
  );
}