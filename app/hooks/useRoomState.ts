import { useCallback, useEffect, useState } from 'react';
import { ROOMS_TABLE } from '../lib/constants';
import { copyText, getInitialRoomID, mapRoom, readStorage, writeStorage } from '../lib/helpers';
import { supabase } from '../lib/supabaseClient';
import type { WishlistSupabaseClient } from '../lib/supabaseClient';
import type { RoomInsert, RoomRow } from '../types';

interface UseRoomStateOptions {
  notify: (message: string) => void;
}

export function useRoomState({ notify }: UseRoomStateOptions) {
  const [roomID, setRoomID] = useState('');
  const [boyName, setBoyName] = useState('Dia');
  const [girlName, setGirlName] = useState('Kamu');
  const [tempBoyName, setTempBoyName] = useState('Dia');
  const [tempGirlName, setTempGirlName] = useState('Kamu');
  const [editingNames, setEditingNames] = useState(false);

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
    if (!roomID) return undefined;

    const client = supabase;
    if (!client) return undefined;

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

  return {
    roomID,
    boyName,
    girlName,
    tempBoyName,
    tempGirlName,
    editingNames,
    setTempBoyName,
    setTempGirlName,
    handleStartEditNames,
    handleCancelEditNames,
    handleSaveNames,
    handleCopyLink,
  };
}
