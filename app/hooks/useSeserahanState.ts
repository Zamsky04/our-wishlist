import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { GIFT_CATEGORIES_TABLE, GIFT_ITEMS_TABLE } from '../lib/constants';
import {
  buildDefaultGiftCategories,
  createGiftCategoryID,
  createGiftID,
  formatPriceInput,
  mapGiftCategory,
  mapGiftItem,
  normalizeUrl,
  parsePriceInput,
  sortGiftCategories,
  sortGiftNewest,
} from '../lib/helpers';
import { isSupabaseReady, supabase } from '../lib/supabaseClient';
import type { WishlistSupabaseClient } from '../lib/supabaseClient';
import type {
  GiftCategoryInsert,
  GiftCategoryItem,
  GiftCategoryRow,
  GiftItem,
  GiftItemInsert,
  GiftItemRow,
  GiftItemUpdate,
} from '../types';
import type { GiftListGroup, GiftPageMode } from '../components/seserahan/types';

interface UseSeserahanStateOptions {
  roomID: string;
  notify: (message: string) => void;
}

export function useSeserahanState({ roomID, notify }: UseSeserahanStateOptions) {
  const [giftCategories, setGiftCategories] = useState<GiftCategoryItem[]>([]);
  const [giftItems, setGiftItems] = useState<GiftItem[]>([]);
  const [isGiftLoading, setIsGiftLoading] = useState(isSupabaseReady);
  const [newGiftCategoryName, setNewGiftCategoryName] = useState('');
  const [newGiftCategoryId, setNewGiftCategoryId] = useState('');
  const [newGiftTitle, setNewGiftTitle] = useState('');
  const [newGiftPrice, setNewGiftPrice] = useState('');
  const [newGiftLink, setNewGiftLink] = useState('');
  const [giftPageMode, setGiftPageMode] = useState<GiftPageMode>('list');
  const [editingGiftId, setEditingGiftId] = useState('');
  const [editGiftCategoryId, setEditGiftCategoryId] = useState('');
  const [editGiftCategoryName, setEditGiftCategoryName] = useState('');
  const [editGiftTitle, setEditGiftTitle] = useState('');
  const [editGiftPrice, setEditGiftPrice] = useState('');
  const [editGiftLink, setEditGiftLink] = useState('');
  const [giftExitingIds, setGiftExitingIds] = useState<Set<string>>(new Set());

  const giftInputRef = useRef<HTMLInputElement>(null);
  const giftEditInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!roomID) return undefined;

    const client = supabase;
    if (!client) return undefined;

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
    if (!roomID) return undefined;

    const client = supabase;
    if (!client) return undefined;

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

  const giftDoneCount = useMemo(() => giftItems.filter((item) => item.is_checked).length, [giftItems]);
  const giftTotalBudget = useMemo(() => giftItems.reduce((total, item) => total + (item.price || 0), 0), [giftItems]);
  const giftDoneBudget = useMemo(() => giftItems.reduce((total, item) => total + (item.is_checked ? item.price || 0 : 0), 0), [giftItems]);
  const giftProgressPercentage = giftItems.length > 0 ? Math.round((giftDoneCount / giftItems.length) * 100) : 0;

  const giftListGroups = useMemo<GiftListGroup[]>(() => {
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
    const uncategorizedItems = giftItems.filter((item) => !knownCategoryIds.has(item.category_id)).sort((a, b) => a.created_at - b.created_at);

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

  const clearGiftAddForm = () => {
    setNewGiftTitle('');
    setNewGiftPrice('');
    setNewGiftLink('');
    setNewGiftCategoryName('');
  };

  const clearGiftEditForm = () => {
    setEditingGiftId('');
    setEditGiftTitle('');
    setEditGiftPrice('');
    setEditGiftLink('');
    setEditGiftCategoryId('');
    setEditGiftCategoryName('');
  };

  const handleCloseGiftAddPage = () => {
    setGiftPageMode('list');
    clearGiftAddForm();
  };

  const handleOpenGiftEditPage = (gift: GiftItem) => {
    const categoryExists = giftCategories.some((category) => category.id === gift.category_id);

    setEditingGiftId(gift.id);
    setEditGiftTitle(gift.title);
    setEditGiftPrice(formatPriceInput(String(gift.price ?? '')));
    setEditGiftLink(gift.link_url ?? '');
    setEditGiftCategoryId(categoryExists ? gift.category_id : giftCategories[0]?.id || '');
    setEditGiftCategoryName('');
    setGiftPageMode('edit');
    window.setTimeout(() => giftEditInputRef.current?.focus(), 0);
  };

  const handleCloseGiftEditPage = () => {
    setGiftPageMode('list');
    clearGiftEditForm();
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

  const handleUpdateGiftItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const currentItem = giftItems.find((gift) => gift.id === editingGiftId);
    const title = editGiftTitle.trim();
    const requestedCategoryName = editGiftCategoryName.trim();
    const matchedCategory = requestedCategoryName
      ? giftCategories.find((category) => category.name.toLowerCase() === requestedCategoryName.toLowerCase())
      : null;
    const shouldCreateCategory = Boolean(requestedCategoryName && !matchedCategory);
    const selectedCategoryID = matchedCategory?.id || (requestedCategoryName ? '' : editGiftCategoryId || currentItem?.category_id || giftCategories[0]?.id || '');

    if (!currentItem || !title) return;
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

    if (createdCategory) {
      setGiftCategories((prev) => sortGiftCategories([...prev, createdCategory]));
      setEditGiftCategoryId(createdCategory.id);

      const { error: categoryError } = await client.from(GIFT_CATEGORIES_TABLE).insert(createdCategory as GiftCategoryInsert);

      if (categoryError) {
        setGiftCategories((prev) => prev.filter((category) => category.id !== createdCategory.id));
        notify('Gagal menyimpan kategori baru');
        return;
      }
    }

    const updatePayload: GiftItemUpdate = {
      category_id: finalCategoryID,
      title,
      link_url: normalizeUrl(editGiftLink),
      price: parsePriceInput(editGiftPrice),
    };

    const updatedItem: GiftItem = {
      ...currentItem,
      category_id: updatePayload.category_id || currentItem.category_id,
      title: updatePayload.title || currentItem.title,
      link_url: updatePayload.link_url ?? null,
      price: updatePayload.price ?? null,
    };

    setGiftItems((prev) => sortGiftNewest(prev.map((gift) => (gift.id === currentItem.id ? updatedItem : gift))));
    setGiftPageMode('list');
    clearGiftEditForm();

    const { error } = await client.from(GIFT_ITEMS_TABLE).update(updatePayload).eq('id', currentItem.id);

    if (error) {
      setGiftItems((prev) => sortGiftNewest(prev.map((gift) => (gift.id === currentItem.id ? currentItem : gift))));
      notify('Gagal memperbarui barang seserahan');
      return;
    }

    notify('Barang seserahan diperbarui');
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

  return {
    giftInputRef,
    giftEditInputRef,
    giftCategories,
    giftItems,
    isGiftLoading,
    newGiftCategoryName,
    newGiftCategoryId,
    newGiftTitle,
    newGiftPrice,
    newGiftLink,
    giftPageMode,
    editGiftCategoryId,
    editGiftCategoryName,
    editGiftTitle,
    editGiftPrice,
    editGiftLink,
    giftExitingIds,
    giftDoneCount,
    giftTotalBudget,
    giftDoneBudget,
    giftProgressPercentage,
    giftListGroups,
    setNewGiftCategoryName,
    setNewGiftCategoryId,
    setNewGiftTitle,
    setNewGiftPrice,
    setNewGiftLink,
    setEditGiftCategoryId,
    setEditGiftCategoryName,
    setEditGiftTitle,
    setEditGiftPrice,
    setEditGiftLink,
    setGiftPageMode,
    handleOpenGiftAddPage,
    handleCloseGiftAddPage,
    handleOpenGiftEditPage,
    handleCloseGiftEditPage,
    handleAddGiftCategory,
    handleAddGiftItem,
    handleUpdateGiftItem,
    handleToggleGift,
    handleDeleteGift,
  };
}
