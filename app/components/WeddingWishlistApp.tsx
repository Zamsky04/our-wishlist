// src/components/WeddingWishlistApp.tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import styles from '../WishlistPage.module.css';
import type {
  GiftCategoryInsert,
  GiftCategoryItem,
  GiftCategoryRow,
  GiftItem,
  GiftItemInsert,
  GiftItemRow,
  GiftItemUpdate,
  MainMenu,
  RoomInsert,
  RoomRow,
  SortBy,
  StatusFilter,
  WishCategory,
  WishInsert,
  WishItem,
  WishRow,
  WishUpdate,
} from '../types';
import {
  GIFT_CATEGORIES_TABLE,
  GIFT_ITEMS_TABLE,
  ROOMS_TABLE,
  WISHES_TABLE,
  categories,
} from '../lib/constants';
import { isSupabaseReady, supabase } from '../lib/supabaseClient';
import type { WishlistSupabaseClient } from '../lib/supabaseClient';
import {
  buildDefaultGiftCategories,
  copyText,
  createGiftCategoryID,
  createGiftID,
  createWishID,
  formatCompactCurrency,
  formatDateTime,
  formatPriceInput,
  getInitialRoomID,
  getLinkLabel,
  mapGiftCategory,
  mapGiftItem,
  mapRoom,
  mapRow,
  normalizeUrl,
  parsePriceInput,
  readStorage,
  sortGiftCategories,
  sortGiftNewest,
  sortNewest,
  writeStorage,
} from '../lib/helpers';

export default function WeddingWishlistApp({ fontClassName = '' }: { fontClassName?: string }) {
  const [roomID, setRoomID] = useState('');
  const [boyName, setBoyName] = useState('Dia');
  const [girlName, setGirlName] = useState('Kamu');
  const [tempBoyName, setTempBoyName] = useState('Dia');
  const [tempGirlName, setTempGirlName] = useState('Kamu');

  const [mainMenu, setMainMenu] = useState<MainMenu>('wishlist');
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

  const [giftCategories, setGiftCategories] = useState<GiftCategoryItem[]>([]);
  const [giftItems, setGiftItems] = useState<GiftItem[]>([]);
  const [isGiftLoading, setIsGiftLoading] = useState(isSupabaseReady);
  const [newGiftCategoryName, setNewGiftCategoryName] = useState('');
  const [newGiftCategoryId, setNewGiftCategoryId] = useState('');
  const [newGiftTitle, setNewGiftTitle] = useState('');
  const [newGiftPrice, setNewGiftPrice] = useState('');
  const [newGiftLink, setNewGiftLink] = useState('');
  const [giftPageMode, setGiftPageMode] = useState<'list' | 'add'>('list');
  const [giftExitingIds, setGiftExitingIds] = useState<Set<string>>(new Set());

  const inputRef = useRef<HTMLInputElement>(null);
  const giftInputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    if (!roomID) return;

    const client = supabase;
    if (!client) return;

    let active = true;

    function applyNames(nextBoyName: string, nextGirlName: string) {
      if (!active) return;

      setBoyName(nextBoyName);
      setGirlName(nextGirlName);
      setTempBoyName(nextBoyName);
      setTempGirlName(nextGirlName);

      writeStorage('wishlist_boy_name', nextBoyName);
      writeStorage('wishlist_girl_name', nextGirlName);
    }

    async function loadRoomNames(db: WishlistSupabaseClient) {
      const { data, error } = await db.from(ROOMS_TABLE).select('*').eq('room_id', roomID).maybeSingle();

      if (!active) return;

      if (error) {
        console.error('Supabase load room names error:', error);
        return;
      }

      if (!data) return;

      const mapped = mapRoom(data as RoomRow);
      applyNames(mapped.boyName, mapped.girlName);
    }

    void loadRoomNames(client);

    const channel = client
      .channel(`wishlist-room-names-${roomID}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: ROOMS_TABLE,
          filter: `room_id=eq.${roomID}`,
        },
        (payload) => {
          if (payload.eventType !== 'INSERT' && payload.eventType !== 'UPDATE') return;

          const mapped = mapRoom(payload.new as RoomRow);
          applyNames(mapped.boyName, mapped.girlName);
        },
      )
      .subscribe();

    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, [roomID]);

  useEffect(() => {
    if (!roomID) return;

    const client = supabase;
    if (!client) return;

    let active = true;

    function applyCategories(nextCategories: GiftCategoryItem[]) {
      const sorted = sortGiftCategories(nextCategories);
      setGiftCategories(sorted);
      setNewGiftCategoryId((current) => (current && sorted.some((category) => category.id === current) ? current : sorted[0]?.id || ''));
    }

    async function loadGiftCategories(db: WishlistSupabaseClient) {
      const { data, error } = await db
        .from(GIFT_CATEGORIES_TABLE)
        .select('*')
        .eq('room_id', roomID)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (!active) return;

      if (error) {
        console.error('Supabase load gift categories error:', error);
        notify('Tabel seserahan belum siap. Jalankan SQL migration dulu.');
        setIsGiftLoading(false);
        return;
      }

      const mapped = (data || []).map((row) => mapGiftCategory(row as GiftCategoryRow));

      if (mapped.length > 0) {
        applyCategories(mapped);
        return;
      }

      const defaults = buildDefaultGiftCategories(roomID);
      applyCategories(defaults);

      const { error: insertError } = await db.from(GIFT_CATEGORIES_TABLE).upsert(defaults, { onConflict: 'id' });

      if (insertError) {
        console.error('Supabase create default gift categories error:', insertError);
        notify('Gagal membuat kategori seserahan awal');
      }
    }

    void loadGiftCategories(client);

    const channel = client
      .channel(`seserahan-categories-${roomID}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: GIFT_CATEGORIES_TABLE,
          filter: `room_id=eq.${roomID}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const item = mapGiftCategory(payload.new as GiftCategoryRow);
            setGiftCategories((prev) => (prev.some((category) => category.id === item.id) ? prev : sortGiftCategories([...prev, item])));
            setNewGiftCategoryId((current) => current || item.id);
          }

          if (payload.eventType === 'UPDATE') {
            const item = mapGiftCategory(payload.new as GiftCategoryRow);
            setGiftCategories((prev) => sortGiftCategories(prev.map((category) => (category.id === item.id ? item : category))));
          }

          if (payload.eventType === 'DELETE') {
            const old = payload.old as Pick<GiftCategoryRow, 'id'>;
            setGiftCategories((prev) => prev.filter((category) => category.id !== old.id));
            setNewGiftCategoryId((current) => (current === old.id ? '' : current));
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, [notify, roomID]);

  useEffect(() => {
    if (!roomID) return;

    const client = supabase;
    if (!client) return;

    let active = true;

    async function loadGiftItems(db: WishlistSupabaseClient) {
      const { data, error } = await db.from(GIFT_ITEMS_TABLE).select('*').eq('room_id', roomID).order('created_at', { ascending: false });

      if (!active) return;

      if (error) {
        console.error('Supabase load gift items error:', error);
        notify('Tabel barang seserahan belum siap. Jalankan SQL migration dulu.');
        setIsGiftLoading(false);
        return;
      }

      setGiftItems((data || []).map((row) => mapGiftItem(row as GiftItemRow)));
      setIsGiftLoading(false);
    }

    void loadGiftItems(client);

    const channel = client
      .channel(`seserahan-items-${roomID}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: GIFT_ITEMS_TABLE,
          filter: `room_id=eq.${roomID}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const item = mapGiftItem(payload.new as GiftItemRow);
            setGiftItems((prev) => (prev.some((gift) => gift.id === item.id) ? prev : sortGiftNewest([item, ...prev])));
          }

          if (payload.eventType === 'UPDATE') {
            const item = mapGiftItem(payload.new as GiftItemRow);
            setGiftItems((prev) => sortGiftNewest(prev.map((gift) => (gift.id === item.id ? item : gift))));
          }

          if (payload.eventType === 'DELETE') {
            const old = payload.old as Pick<GiftItemRow, 'id'>;

            setGiftExitingIds((prev) => {
              const next = new Set(prev);
              next.delete(old.id);
              return next;
            });

            setGiftItems((prev) => prev.filter((gift) => gift.id !== old.id));
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
  const allWishlistCount = wishes.length;
  const allWishlistDoneCount = useMemo(() => wishes.filter((wish) => wish.is_checked).length, [wishes]);
  const progressPercentage = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const shouldShowTools = Boolean(categoryWishes.length >= 4 || searchQuery || statusFilter !== 'all' || sortBy !== 'newest');

  const giftDoneCount = useMemo(() => giftItems.filter((item) => item.is_checked).length, [giftItems]);
  const giftTotalBudget = useMemo(() => giftItems.reduce((total, item) => total + (item.price || 0), 0), [giftItems]);
  const giftDoneBudget = useMemo(() => giftItems.reduce((total, item) => total + (item.is_checked ? item.price || 0 : 0), 0), [giftItems]);
  const giftProgressPercentage = giftItems.length > 0 ? Math.round((giftDoneCount / giftItems.length) * 100) : 0;
  const giftListGroups = useMemo(() => {
    const groupedItems = new Map<string, GiftItem[]>();

    giftItems.forEach((item) => {
      const currentItems = groupedItems.get(item.category_id) || [];
      currentItems.push(item);
      groupedItems.set(item.category_id, currentItems);
    });

    const sortedGroups = giftCategories
      .map((category) => ({
        category,
        items: [...(groupedItems.get(category.id) || [])].sort((a, b) => a.created_at - b.created_at),
      }))
      .filter((group) => group.items.length > 0);

    const knownCategoryIds = new Set(giftCategories.map((category) => category.id));
    const uncategorizedItems = giftItems
      .filter((item) => !knownCategoryIds.has(item.category_id))
      .sort((a, b) => a.created_at - b.created_at);

    if (uncategorizedItems.length > 0) {
      sortedGroups.push({
        category: {
          id: 'uncategorized',
          room_id: roomID,
          name: 'Tanpa Kategori',
          sort_order: 999,
          created_at: 0,
        },
        items: uncategorizedItems,
      });
    }

    return sortedGroups;
  }, [giftCategories, giftItems, roomID]);

  const handleOpenGiftAddPage = () => {
    setGiftPageMode('add');
    setNewGiftCategoryName('');
    window.setTimeout(() => giftInputRef.current?.focus(), 0);
  };

  const handleCloseGiftAddPage = () => {
    setGiftPageMode('list');
    setNewGiftCategoryName('');
  };

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

  const handleSaveNames = async () => {
    const nextBoyName = tempBoyName.trim() || 'Dia';
    const nextGirlName = tempGirlName.trim() || 'Kamu';
    const previousBoyName = boyName;
    const previousGirlName = girlName;

    setBoyName(nextBoyName);
    setGirlName(nextGirlName);
    setTempBoyName(nextBoyName);
    setTempGirlName(nextGirlName);
    writeStorage('wishlist_boy_name', nextBoyName);
    writeStorage('wishlist_girl_name', nextGirlName);
    setEditingNames(false);

    const client = supabase;

    if (!roomID || !client) {
      notify('Nama diperbarui di perangkat ini');
      return;
    }

    const payload: RoomInsert = {
      room_id: roomID,
      boy_name: nextBoyName,
      girl_name: nextGirlName,
      updated_at: Date.now(),
    };

    const { error } = await client.from(ROOMS_TABLE).upsert(payload, { onConflict: 'room_id' });

    if (error) {
      console.error('Supabase save room names error:', error);
      setBoyName(previousBoyName);
      setGirlName(previousGirlName);
      setTempBoyName(previousBoyName);
      setTempGirlName(previousGirlName);
      writeStorage('wishlist_boy_name', previousBoyName);
      writeStorage('wishlist_girl_name', previousGirlName);
      notify('Gagal menyimpan nama ke realtime');
      return;
    }

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

  const handleAddGiftCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = newGiftCategoryName.trim();
    if (!name) return;

    const client = supabase;

    if (!roomID || !client) {
      notify('Koneksi belum siap');
      return;
    }

    const alreadyExists = giftCategories.some((category) => category.name.toLowerCase() === name.toLowerCase());
    if (alreadyExists) {
      notify('Kategori itu sudah ada');
      return;
    }

    const item: GiftCategoryItem = {
      id: createGiftCategoryID(roomID, name),
      room_id: roomID,
      name,
      sort_order: giftCategories.length,
      created_at: Date.now(),
    };

    const insertPayload: GiftCategoryInsert = item;

    setNewGiftCategoryName('');
    setGiftCategories((prev) => sortGiftCategories([...prev, item]));
    setNewGiftCategoryId(item.id);

    const { error } = await client.from(GIFT_CATEGORIES_TABLE).insert(insertPayload);

    if (error) {
      setGiftCategories((prev) => prev.filter((category) => category.id !== item.id));
      setNewGiftCategoryId((current) => (current === item.id ? giftCategories[0]?.id || '' : current));
      notify('Gagal menyimpan kategori');
    }
  };

  const handleAddGiftItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = newGiftTitle.trim();
    const requestedCategoryName = newGiftCategoryName.trim();
    const matchedCategory = requestedCategoryName
      ? giftCategories.find((category) => category.name.toLowerCase() === requestedCategoryName.toLowerCase())
      : null;
    const shouldCreateCategory = Boolean(requestedCategoryName && !matchedCategory);
    const selectedCategoryID = matchedCategory?.id || (requestedCategoryName ? '' : newGiftCategoryId || giftCategories[0]?.id || '');

    if (!title) return;
    if (!selectedCategoryID && !shouldCreateCategory) {
      notify('Pilih kategori atau buat kategori baru dulu');
      return;
    }

    const client = supabase;

    if (!roomID || !client) {
      notify('Koneksi belum siap');
      return;
    }

    const createdCategory: GiftCategoryItem | null = shouldCreateCategory
      ? {
          id: createGiftCategoryID(roomID, requestedCategoryName),
          room_id: roomID,
          name: requestedCategoryName,
          sort_order: giftCategories.length,
          created_at: Date.now(),
        }
      : null;

    const finalCategoryID = createdCategory?.id || selectedCategoryID;

    const item: GiftItem = {
      id: createGiftID(),
      room_id: roomID,
      category_id: finalCategoryID,
      title,
      link_url: normalizeUrl(newGiftLink),
      price: parsePriceInput(newGiftPrice),
      is_checked: false,
      created_at: Date.now(),
    };

    const insertPayload: GiftItemInsert = {
      id: item.id,
      room_id: item.room_id,
      category_id: item.category_id,
      title: item.title,
      link_url: item.link_url,
      price: item.price,
      is_checked: item.is_checked,
      created_at: item.created_at,
    };

    if (createdCategory) {
      setGiftCategories((prev) => sortGiftCategories([...prev, createdCategory]));
      setNewGiftCategoryId(createdCategory.id);

      const { error: categoryError } = await client.from(GIFT_CATEGORIES_TABLE).insert(createdCategory as GiftCategoryInsert);

      if (categoryError) {
        setGiftCategories((prev) => prev.filter((category) => category.id !== createdCategory.id));
        notify('Gagal menyimpan kategori baru');
        return;
      }
    } else {
      setNewGiftCategoryId(finalCategoryID);
    }

    setNewGiftTitle('');
    setNewGiftPrice('');
    setNewGiftLink('');
    setNewGiftCategoryName('');
    setGiftItems((prev) => sortGiftNewest([item, ...prev]));

    const { error } = await client.from(GIFT_ITEMS_TABLE).insert(insertPayload);

    if (error) {
      setGiftItems((prev) => prev.filter((gift) => gift.id !== item.id));
      notify('Gagal menyimpan barang seserahan');
      return;
    }

    setGiftPageMode('list');
    notify('Barang seserahan ditambahkan');
  };

  const handleToggleGift = async (id: string, currentValue: boolean) => {
    const client = supabase;

    if (!client) {
      notify('Supabase belum dikonfigurasi');
      return;
    }

    const nextValue = !currentValue;
    const updatePayload: GiftItemUpdate = { is_checked: nextValue };

    setGiftItems((prev) => prev.map((gift) => (gift.id === id ? { ...gift, is_checked: nextValue } : gift)));

    const { error } = await client.from(GIFT_ITEMS_TABLE).update(updatePayload).eq('id', id);

    if (error) {
      setGiftItems((prev) => prev.map((gift) => (gift.id === id ? { ...gift, is_checked: currentValue } : gift)));
      notify('Gagal memperbarui barang seserahan');
    }
  };

  const handleDeleteGift = (id: string) => {
    const deletedItem = giftItems.find((gift) => gift.id === id);
    if (!deletedItem || giftExitingIds.has(id)) return;

    setGiftExitingIds((prev) => new Set([...prev, id]));

    setTimeout(async () => {
      setGiftItems((prev) => prev.filter((gift) => gift.id !== id));

      setGiftExitingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      const client = supabase;

      if (!client) {
        setGiftItems((prev) => (prev.some((gift) => gift.id === id) ? prev : sortGiftNewest([deletedItem, ...prev])));
        notify('Supabase belum dikonfigurasi');
        return;
      }

      const { error } = await client.from(GIFT_ITEMS_TABLE).delete().eq('id', id);

      if (error) {
        setGiftItems((prev) => (prev.some((gift) => gift.id === id) ? prev : sortGiftNewest([deletedItem, ...prev])));
        notify('Gagal menghapus barang seserahan');
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
      notify('Link room disalin');
    } catch {
      notify('Gagal menyalin link');
    }
  };

  return (
    <main className={`${styles.root} ${fontClassName}`}>
      <section className={styles.page} data-accent={mainMenu === 'seserahan' ? 'seserahan' : activeTab}>
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

          <p className={styles.tagline}>Wishlist & Seserahan Planner</p>

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
            Bagikan ke Pasangan
          </button>
        </header>

        <div className={styles.divider} />

        <nav className={styles.mainMenuTabs} role="tablist" aria-label="Menu utama">
          <button
            type="button"
            role="tab"
            aria-selected={mainMenu === 'wishlist'}
            className={`${styles.mainMenuTab} ${mainMenu === 'wishlist' ? styles.mainMenuTabActive : ''}`}
            onClick={() => setMainMenu('wishlist')}
          >
            <span>Wishlist</span>
            <strong>
              {allWishlistDoneCount}/{allWishlistCount}
            </strong>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mainMenu === 'seserahan'}
            className={`${styles.mainMenuTab} ${mainMenu === 'seserahan' ? styles.mainMenuTabActive : ''}`}
            onClick={() => {
              setMainMenu('seserahan');
              setGiftPageMode('list');
            }}
          >
            <span>Seserahan</span>
            <strong>
              {giftDoneCount}/{giftItems.length}
            </strong>
          </button>
        </nav>

        {mainMenu === 'wishlist' ? (
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
                    <option value="active">Belum Tercapai</option>
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
                        {item.is_checked ? 'Tercapai' : 'Belum tercapai'} · {formatDateTime(item.created_at)}
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
          </div>
        ) : (
          <div className={styles.contentShellWide}>
            {giftPageMode === 'list' ? (
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

                    <button className={styles.giftPrimaryAction} type="button" onClick={handleOpenGiftAddPage} disabled={!roomID}>
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
                                  onClick={() => handleToggleGift(item.id, item.is_checked)}
                                >
                                  {item.is_checked && (
                                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                                      <path d="M1 3.5L3.8 6.5L9 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}
                                </button>

                                <button className={styles.giftNameCell} type="button" onClick={() => handleToggleGift(item.id, item.is_checked)}>
                                  <span>
                                    {index + 1}. {item.title}
                                  </span>
                                  <small>{item.is_checked ? 'Sudah dibeli' : 'Belum dibeli'}</small>
                                </button>

                                <strong className={styles.giftPriceCell}>{formatCompactCurrency(item.price)}</strong>

                                {item.link_url ? (
                                  <a className={styles.giftLinkCell} href={item.link_url} target="_blank" rel="noreferrer">
                                    {getLinkLabel(item.link_url)} ↗
                                  </a>
                                ) : (
                                  <span className={styles.giftLinkEmpty}>Belum diisi</span>
                                )}

                                <button
                                  type="button"
                                  className={styles.giftRowDeleteButton}
                                  aria-label="Hapus barang seserahan"
                                  disabled={giftExitingIds.has(item.id)}
                                  onClick={() => handleDeleteGift(item.id)}
                                >
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
                                </button>
                              </div>
                            ))}
                          </div>
                        </article>
                      );
                    })
                  )}
                </section>
              </>
            ) : (
              <section className={styles.giftAddPage} aria-label="Tambah barang seserahan">
                <div className={styles.giftAddHeader}>
                  <button className={styles.backButton} type="button" onClick={handleCloseGiftAddPage}>
                    ← Kembali
                  </button>
                  <div>
                    <p className={styles.progressLabel}>Tambah Barang</p>
                    <h2>Isi detail seserahan</h2>
                    <p>Pilih kategori yang sudah ada, atau tulis kategori baru saat menambahkan barang.</p>
                  </div>
                </div>

                <form className={styles.giftAddForm} onSubmit={handleAddGiftItem}>
                  <div className={styles.formField}>
                    <label htmlFor="new-gift-title">Nama barang</label>
                    <input
                      ref={giftInputRef}
                      id="new-gift-title"
                      className={styles.input}
                      type="text"
                      value={newGiftTitle}
                      onChange={(event) => setNewGiftTitle(event.target.value)}
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
                        value={newGiftPrice}
                        onChange={(event) => setNewGiftPrice(formatPriceInput(event.target.value))}
                        placeholder="Contoh: 250.000"
                        autoComplete="off"
                      />
                    </div>

                    <div className={styles.formField}>
                      <label htmlFor="new-gift-category-select">Pilih kategori</label>
                      <select
                        id="new-gift-category-select"
                        className={styles.select}
                        value={newGiftCategoryId}
                        onChange={(event) => setNewGiftCategoryId(event.target.value)}
                        disabled={Boolean(newGiftCategoryName.trim())}
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
                    <label htmlFor="new-gift-category">Buat kategori baru <span>opsional</span></label>
                    <input
                      id="new-gift-category"
                      className={styles.input}
                      type="text"
                      value={newGiftCategoryName}
                      onChange={(event) => setNewGiftCategoryName(event.target.value)}
                      placeholder="Contoh: Perhiasan, Makeup, Pakaian & Ibadah"
                      maxLength={40}
                      autoComplete="off"
                    />
                    <small>Kalau kolom ini diisi, barang akan masuk ke kategori baru tersebut.</small>
                  </div>

                  <div className={styles.formField}>
                    <label htmlFor="new-gift-link">Link barang</label>
                    <input
                      id="new-gift-link"
                      className={styles.input}
                      type="text"
                      value={newGiftLink}
                      onChange={(event) => setNewGiftLink(event.target.value)}
                      placeholder="Link TikTok/Shopee/Tokopedia/website barang"
                      autoComplete="off"
                    />
                  </div>

                  <div className={styles.giftAddActions}>
                    <button className={styles.addButton} type="submit" disabled={!newGiftTitle.trim() || !roomID || (!newGiftCategoryId && !newGiftCategoryName.trim())}>
                      Simpan Barang
                    </button>
                    <button className={styles.secondaryButton} type="button" onClick={handleCloseGiftAddPage}>
                      Batal
                    </button>
                  </div>
                </form>

                <form className={styles.categoryOnlyForm} onSubmit={handleAddGiftCategory}>
                  <div>
                    <p className={styles.progressLabel}>Kategori saja</p>
                    <h3>Tambah kategori kosong</h3>
                    <small>Opsional, dipakai kalau mau menyiapkan kategori dulu sebelum isi barang.</small>
                  </div>
                  <button className={styles.secondaryButton} type="submit" disabled={!newGiftCategoryName.trim() || !roomID}>
                    Simpan Kategori
                  </button>
                </form>
              </section>
            )}
          </div>
        )}

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
