import { defaultGiftCategoryNames } from './constants';
import type { GiftCategoryItem, GiftCategoryRow, GiftItem, GiftItemRow, RoomRow, WishItem, WishRow } from '../types';

export function createRoomID() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `room_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  }

  return `room_${Math.random().toString(36).slice(2, 14)}`;
}

export function createWishID() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `wish_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createGiftID() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `gift_${crypto.randomUUID().replace(/-/g, '').slice(0, 18)}`;
  }

  return `gift_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 20);
}

export function createGiftCategoryID(roomID: string, name: string, index?: number) {
  const safeRoomID = roomID.replace(/[^a-zA-Z0-9]/g, '').slice(0, 22);
  const suffix = typeof index === 'number' ? `${index + 1}-` : '';
  return `giftcat_${safeRoomID}_${suffix}${slugify(name) || Date.now()}`;
}

export function buildDefaultGiftCategories(roomID: string): GiftCategoryItem[] {
  return defaultGiftCategoryNames.map((name, index) => ({
    id: createGiftCategoryID(roomID, name, index),
    room_id: roomID,
    name,
    sort_order: index,
    created_at: Date.now() + index,
  }));
}

export function readStorage(key: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;

  try {
    return window.localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key: string, value: string) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // localStorage bisa diblokir di private mode.
  }
}

export function getInitialRoomID() {
  if (typeof window === 'undefined') return '';

  const params = new URLSearchParams(window.location.search);
  return params.get('room') || readStorage('wishlist_room_id', '') || createRoomID();
}

export function mapRow(row: WishRow): WishItem {
  return {
    id: row.id,
    room_id: row.room_id,
    text: row.text,
    category: row.category,
    is_checked: row.is_checked,
    created_at: row.created_at,
  };
}

export function mapGiftCategory(row: GiftCategoryRow): GiftCategoryItem {
  return {
    id: row.id,
    room_id: row.room_id,
    name: row.name,
    sort_order: Number(row.sort_order || 0),
    created_at: Number(row.created_at || Date.now()),
  };
}

export function mapGiftItem(row: GiftItemRow): GiftItem {
  const price = row.price === null || row.price === undefined || row.price === '' ? null : Number(row.price);

  return {
    id: row.id,
    room_id: row.room_id,
    category_id: row.category_id,
    title: row.title,
    link_url: row.link_url || null,
    price: Number.isFinite(price as number) ? (price as number) : null,
    is_checked: row.is_checked,
    created_at: row.created_at,
  };
}

export function mapRoom(row: RoomRow) {
  return {
    boyName: row.boy_name?.trim() || 'Dia',
    girlName: row.girl_name?.trim() || 'Kamu',
  };
}

export function sortNewest(items: WishItem[]) {
  return [...items].sort((a, b) => b.created_at - a.created_at);
}

export function sortGiftNewest(items: GiftItem[]) {
  return [...items].sort((a, b) => b.created_at - a.created_at);
}

export function sortGiftCategories(items: GiftCategoryItem[]) {
  return [...items].sort((a, b) => a.sort_order - b.sort_order || a.created_at - b.created_at || a.name.localeCompare(b.name, 'id-ID'));
}

export function formatDateTime(value: number) {
  const date = new Date(value);

  const dateText = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);

  const timeText = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace('.', ':');

  return `${dateText}, ${timeText}`;
}

export function formatCurrency(value: number | null) {
  if (!value) return 'Belum diisi';

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompactCurrency(value: number | null) {
  if (value === null || value === undefined) return '—';

  return `Rp ${new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
  }).format(Math.round(value))}`;
}

export function formatPriceInput(value: string) {
  const numberOnly = value.replace(/[^0-9]/g, '');
  if (!numberOnly) return '';

  return numberOnly.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function parsePriceInput(value: string) {
  const numberOnly = value.replace(/[^0-9]/g, '');
  if (!numberOnly) return null;

  const parsed = Number(numberOnly);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function getLinkLabel(value: string | null) {
  if (!value) return 'Belum ada link';

  try {
    const hostname = new URL(value).hostname.replace(/^www\./, '').toLowerCase();

    if (hostname.includes('shopee')) return 'Shopee';
    if (hostname.includes('tiktok')) return 'TikTok';
    if (hostname.includes('tokopedia')) return 'Tokopedia';
    if (hostname.includes('lazada')) return 'Lazada';
    if (hostname.includes('blibli')) return 'Blibli';

    return 'Website';
  } catch {
    return 'Buka link';
  }
}

export async function copyText(value: string) {
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
