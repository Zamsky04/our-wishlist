import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { SAVINGS_ENTRIES_TABLE, SAVINGS_GOALS_TABLE } from '../lib/constants';
import {
  createSavingsEntryID,
  createSavingsGoalID,
  mapSavingsEntry,
  mapSavingsGoal,
  parsePriceInput,
} from '../lib/helpers';
import { isSupabaseReady, supabase } from '../lib/supabaseClient';
import type { WishlistSupabaseClient } from '../lib/supabaseClient';
import type {
  SavingsContributor,
  SavingsEntry,
  SavingsEntryInsert,
  SavingsEntryRow,
  SavingsGoal,
  SavingsGoalInsert,
  SavingsGoalRow,
  SavingsPageMode,
} from '../types';

interface UseSavingsStateOptions {
  roomID: string;
  notify: (message: string) => void;
}

export interface SavingsGoalSummary {
  goal: SavingsGoal;
  totalSaved: number;
  remaining: number;
  progressPercentage: number;
  boyTotal: number;
  girlTotal: number;
  entryCount: number;
  latestEntryAt: number | null;
}

function sortGoals(items: SavingsGoal[]) {
  return [...items].sort((a, b) => b.created_at - a.created_at);
}

function sortEntries(items: SavingsEntry[]) {
  return [...items].sort((a, b) => b.created_at - a.created_at);
}

export function useSavingsState({ roomID, notify }: UseSavingsStateOptions) {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [entries, setEntries] = useState<SavingsEntry[]>([]);
  const [isLoading, setIsLoading] = useState(isSupabaseReady);
  const [pageMode, setPageMode] = useState<SavingsPageMode>('list');
  const [selectedGoalID, setSelectedGoalID] = useState('');

  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');

  const [newEntryContributor, setNewEntryContributor] = useState<SavingsContributor>('boy');
  const [newEntryAmount, setNewEntryAmount] = useState('');
  const [newEntryNote, setNewEntryNote] = useState('');
  const [deletingEntryIDs, setDeletingEntryIDs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!roomID) return undefined;

    const client = supabase;
    if (!client) {
      setIsLoading(false);
      return undefined;
    }

    let active = true;

    async function loadSavings(db: WishlistSupabaseClient) {
      setIsLoading(true);

      const [goalsResult, entriesResult] = await Promise.all([
        db.from(SAVINGS_GOALS_TABLE).select('*').eq('room_id', roomID).order('created_at', { ascending: false }),
        db.from(SAVINGS_ENTRIES_TABLE).select('*').eq('room_id', roomID).order('created_at', { ascending: false }),
      ]);

      if (!active) return;

      if (goalsResult.error || entriesResult.error) {
        console.error('Supabase load savings error:', goalsResult.error || entriesResult.error);
        notify('Gagal memuat data tabungan');
        setIsLoading(false);
        return;
      }

      setGoals(sortGoals(((goalsResult.data || []) as SavingsGoalRow[]).map(mapSavingsGoal)));
      setEntries(sortEntries(((entriesResult.data || []) as SavingsEntryRow[]).map(mapSavingsEntry)));
      setIsLoading(false);
    }

    void loadSavings(client);

    const goalsChannel = client
      .channel(`savings-goals-${roomID}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: SAVINGS_GOALS_TABLE,
          filter: `room_id=eq.${roomID}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const goal = mapSavingsGoal(payload.new as SavingsGoalRow);
            setGoals((current) => (current.some((item) => item.id === goal.id) ? current : sortGoals([goal, ...current])));
          }

          if (payload.eventType === 'UPDATE') {
            const goal = mapSavingsGoal(payload.new as SavingsGoalRow);
            setGoals((current) => sortGoals(current.map((item) => (item.id === goal.id ? goal : item))));
          }

          if (payload.eventType === 'DELETE') {
            const deleted = payload.old as Pick<SavingsGoalRow, 'id'>;
            setGoals((current) => current.filter((item) => item.id !== deleted.id));
            setEntries((current) => current.filter((item) => item.goal_id !== deleted.id));
            setSelectedGoalID((current) => {
              if (current !== deleted.id) return current;
              setPageMode('list');
              return '';
            });
          }
        },
      )
      .subscribe();

    const entriesChannel = client
      .channel(`savings-entries-${roomID}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: SAVINGS_ENTRIES_TABLE,
          filter: `room_id=eq.${roomID}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const entry = mapSavingsEntry(payload.new as SavingsEntryRow);
            setEntries((current) => (current.some((item) => item.id === entry.id) ? current : sortEntries([entry, ...current])));
          }

          if (payload.eventType === 'UPDATE') {
            const entry = mapSavingsEntry(payload.new as SavingsEntryRow);
            setEntries((current) => sortEntries(current.map((item) => (item.id === entry.id ? entry : item))));
          }

          if (payload.eventType === 'DELETE') {
            const deleted = payload.old as Pick<SavingsEntryRow, 'id'>;
            setDeletingEntryIDs((current) => {
              const next = new Set(current);
              next.delete(deleted.id);
              return next;
            });
            setEntries((current) => current.filter((item) => item.id !== deleted.id));
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      void client.removeChannel(goalsChannel);
      void client.removeChannel(entriesChannel);
    };
  }, [notify, roomID]);

  const goalSummaries = useMemo<SavingsGoalSummary[]>(() => {
    const groupedEntries = new Map<string, SavingsEntry[]>();

    entries.forEach((entry) => {
      const current = groupedEntries.get(entry.goal_id) || [];
      current.push(entry);
      groupedEntries.set(entry.goal_id, current);
    });

    return goals.map((goal) => {
      const goalEntries = groupedEntries.get(goal.id) || [];
      const boyTotal = goalEntries.reduce((total, entry) => total + (entry.contributor === 'boy' ? entry.amount : 0), 0);
      const girlTotal = goalEntries.reduce((total, entry) => total + (entry.contributor === 'girl' ? entry.amount : 0), 0);
      const totalSaved = boyTotal + girlTotal;
      const progressPercentage = goal.target_amount > 0 ? Math.min(100, Math.round((totalSaved / goal.target_amount) * 100)) : 0;

      return {
        goal,
        totalSaved,
        remaining: Math.max(goal.target_amount - totalSaved, 0),
        progressPercentage,
        boyTotal,
        girlTotal,
        entryCount: goalEntries.length,
        latestEntryAt: goalEntries[0]?.created_at || null,
      };
    });
  }, [entries, goals]);

  const selectedSummary = useMemo(
    () => goalSummaries.find((summary) => summary.goal.id === selectedGoalID) || null,
    [goalSummaries, selectedGoalID],
  );

  const selectedEntries = useMemo(
    () => entries.filter((entry) => entry.goal_id === selectedGoalID),
    [entries, selectedGoalID],
  );

  const totalTarget = useMemo(() => goalSummaries.reduce((total, item) => total + item.goal.target_amount, 0), [goalSummaries]);
  const totalSaved = useMemo(() => goalSummaries.reduce((total, item) => total + item.totalSaved, 0), [goalSummaries]);
  const totalRemaining = useMemo(() => goalSummaries.reduce((total, item) => total + item.remaining, 0), [goalSummaries]);
  const achievedGoalCount = useMemo(() => goalSummaries.filter((item) => item.totalSaved >= item.goal.target_amount).length, [goalSummaries]);
  const overallProgressPercentage = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

  const resetGoalForm = () => {
    setNewGoalName('');
    setNewGoalTarget('');
    setNewGoalDescription('');
  };

  const resetEntryForm = () => {
    setNewEntryAmount('');
    setNewEntryNote('');
  };

  const handleOpenGoalList = () => {
    setPageMode('list');
    setSelectedGoalID('');
    resetEntryForm();
  };

  const handleOpenAddGoal = () => {
    setPageMode('add');
    setSelectedGoalID('');
    resetGoalForm();
  };

  const handleOpenGoalDetail = (goalID: string) => {
    setSelectedGoalID(goalID);
    setPageMode('detail');
    resetEntryForm();
  };

  const handleAddGoal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = newGoalName.trim();
    const targetAmount = parsePriceInput(newGoalTarget);

    if (!name) {
      notify('Nama tabungan wajib diisi');
      return;
    }

    if (!targetAmount || targetAmount <= 0) {
      notify('Target tabungan harus lebih dari Rp 0');
      return;
    }

    if (goals.some((goal) => goal.name.toLowerCase() === name.toLowerCase())) {
      notify('Nama tabungan itu sudah ada');
      return;
    }

    const client = supabase;
    if (!roomID || !client) {
      notify('Koneksi belum siap');
      return;
    }

    const now = Date.now();
    const goal: SavingsGoal = {
      id: createSavingsGoalID(),
      room_id: roomID,
      name,
      target_amount: targetAmount,
      description: newGoalDescription.trim() || null,
      created_at: now,
      updated_at: now,
    };

    const payload: SavingsGoalInsert = goal;
    setGoals((current) => sortGoals([goal, ...current]));
    resetGoalForm();

    const { error } = await client.from(SAVINGS_GOALS_TABLE).insert(payload);

    if (error) {
      console.error('Supabase add savings goal error:', error);
      setGoals((current) => current.filter((item) => item.id !== goal.id));
      notify('Gagal membuat tabungan');
      return;
    }

    setSelectedGoalID(goal.id);
    setPageMode('detail');
    notify('Tabungan berhasil dibuat');
  };

  const handleAddEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const amount = parsePriceInput(newEntryAmount);

    if (!selectedSummary) {
      notify('Tabungan tidak ditemukan');
      return;
    }

    if (!amount || amount <= 0) {
      notify('Nominal setoran harus lebih dari Rp 0');
      return;
    }

    const client = supabase;
    if (!roomID || !client) {
      notify('Koneksi belum siap');
      return;
    }

    const entry: SavingsEntry = {
      id: createSavingsEntryID(),
      room_id: roomID,
      goal_id: selectedSummary.goal.id,
      contributor: newEntryContributor,
      amount,
      note: newEntryNote.trim() || null,
      created_at: Date.now(),
    };

    const payload: SavingsEntryInsert = entry;
    setEntries((current) => sortEntries([entry, ...current]));
    resetEntryForm();

    const { error } = await client.from(SAVINGS_ENTRIES_TABLE).insert(payload);

    if (error) {
      console.error('Supabase add savings entry error:', error);
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      notify('Gagal menyimpan setoran');
      return;
    }

    notify('Setoran berhasil ditambahkan');
  };

  const handleDeleteEntry = async (entry: SavingsEntry) => {
    const client = supabase;
    if (!client) {
      notify('Koneksi belum siap');
      return;
    }

    const shouldDelete = window.confirm(`Hapus setoran sebesar Rp ${new Intl.NumberFormat('id-ID').format(entry.amount)}?`);
    if (!shouldDelete) return;

    setDeletingEntryIDs((current) => new Set(current).add(entry.id));
    const previousEntries = entries;
    setEntries((current) => current.filter((item) => item.id !== entry.id));

    const { error } = await client.from(SAVINGS_ENTRIES_TABLE).delete().eq('id', entry.id).eq('room_id', roomID);

    if (error) {
      console.error('Supabase delete savings entry error:', error);
      setEntries(previousEntries);
      setDeletingEntryIDs((current) => {
        const next = new Set(current);
        next.delete(entry.id);
        return next;
      });
      notify('Gagal menghapus setoran');
      return;
    }

    setDeletingEntryIDs((current) => {
      const next = new Set(current);
      next.delete(entry.id);
      return next;
    });
    notify('Setoran dihapus');
  };

  const handleDeleteGoal = async () => {
    if (!selectedSummary) return;

    const client = supabase;
    if (!client) {
      notify('Koneksi belum siap');
      return;
    }

    const shouldDelete = window.confirm(
      `Hapus tabungan “${selectedSummary.goal.name}” beserta seluruh riwayat setorannya?`,
    );
    if (!shouldDelete) return;

    const goalID = selectedSummary.goal.id;
    const previousGoals = goals;
    const previousEntries = entries;

    setGoals((current) => current.filter((item) => item.id !== goalID));
    setEntries((current) => current.filter((item) => item.goal_id !== goalID));
    handleOpenGoalList();

    const { error } = await client.from(SAVINGS_GOALS_TABLE).delete().eq('id', goalID).eq('room_id', roomID);

    if (error) {
      console.error('Supabase delete savings goal error:', error);
      setGoals(previousGoals);
      setEntries(previousEntries);
      setSelectedGoalID(goalID);
      setPageMode('detail');
      notify('Gagal menghapus tabungan');
      return;
    }

    notify('Tabungan dihapus');
  };

  return {
    goals,
    entries,
    goalSummaries,
    selectedSummary,
    selectedEntries,
    isLoading,
    pageMode,
    selectedGoalID,
    totalTarget,
    totalSaved,
    totalRemaining,
    achievedGoalCount,
    overallProgressPercentage,
    newGoalName,
    newGoalTarget,
    newGoalDescription,
    newEntryContributor,
    newEntryAmount,
    newEntryNote,
    deletingEntryIDs,
    setPageMode,
    setNewGoalName,
    setNewGoalTarget,
    setNewGoalDescription,
    setNewEntryContributor,
    setNewEntryAmount,
    setNewEntryNote,
    handleOpenGoalList,
    handleOpenAddGoal,
    handleOpenGoalDetail,
    handleAddGoal,
    handleAddEntry,
    handleDeleteEntry,
    handleDeleteGoal,
  };
}

export type SavingsState = ReturnType<typeof useSavingsState>;
