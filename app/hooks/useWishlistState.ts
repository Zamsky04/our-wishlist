import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { WISHES_TABLE } from '../lib/constants';
import { createWishID, mapRow, sortNewest } from '../lib/helpers';
import { isSupabaseReady, supabase } from '../lib/supabaseClient';
import type { WishlistSupabaseClient } from '../lib/supabaseClient';
import type { SortBy, StatusFilter, WishCategory, WishInsert, WishItem, WishRow, WishUpdate } from '../types';

interface UseWishlistStateOptions {
  roomID: string;
  notify: (message: string) => void;
}

export function useWishlistState({ roomID, notify }: UseWishlistStateOptions) {
  const [wishes, setWishes] = useState<WishItem[]>([]);
  const [newWish, setNewWish] = useState('');
  const [activeTab, setActiveTab] = useState<WishCategory>('together');
  const [isLoading, setIsLoading] = useState(isSupabaseReady);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!roomID) return undefined;

    const client = supabase;

    if (!client) {
      window.setTimeout(() => {
        notify('Supabase belum dikonfigurasi');
      }, 0);

      return undefined;
    }

    let active = true;

    async function loadWishes(db: WishlistSupabaseClient) {
      const { data, error } = await db.from(WISHES_TABLE).select('*').eq('room_id', roomID).order('created_at', { ascending: false });

      if (!active) return;

      if (error) {
        console.error('Supabase load wishes error:', error);
        notify(error.message || 'Gagal memuat wishlist');
        setIsLoading(false);
        return;
      }

      setWishes((data || []).map((row) => mapRow(row as WishRow)));
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
  const allWishlistCount = wishes.length;
  const allWishlistDoneCount = useMemo(() => wishes.filter((wish) => wish.is_checked).length, [wishes]);
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

  return {
    inputRef,
    wishes,
    newWish,
    activeTab,
    isLoading,
    exitingIds,
    searchQuery,
    statusFilter,
    sortBy,
    counts,
    categoryWishes,
    visibleWishes,
    checkedCount,
    totalCount,
    allWishlistCount,
    allWishlistDoneCount,
    progressPercentage,
    shouldShowTools,
    setNewWish,
    setActiveTab,
    setSearchQuery,
    setStatusFilter,
    setSortBy,
    handleAdd,
    handleToggle,
    handleDelete,
  };
}
