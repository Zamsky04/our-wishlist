import { defaultGiftCategoryNames } from './constants';
import type { GiftCategoryItem, GiftCategoryRow, GiftItem, GiftItemRow, RoomRow, SavingsEntry, SavingsEntryRow, SavingsGoal, SavingsGoalRow, WishItem, WishRow } from '../types';

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

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(candidate);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname) return null;

    return url.toString();
  } catch {
    return null;
  }
}

export type LinkPlatform = 'shopee' | 'tiktok' | 'tokopedia' | 'lazada' | 'blibli' | 'bukalapak' | 'website';

export interface LinkMetadata {
  url: string;
  hostname: string;
  label: string;
  platform: LinkPlatform;
  faviconUrl: string;
  fallbackFaviconUrl: string;
}

const platformMatchers: Array<{
  platform: Exclude<LinkPlatform, 'website'>;
  label: string;
  domains: string[];
  iconDomain: string;
}> = [
  {
    platform: 'shopee',
    label: 'Shopee',
    domains: ['shopee.co.id', 'shopee.com', 'shope.ee'],
    iconDomain: 'shopee.co.id',
  },
  {
    platform: 'tiktok',
    label: 'TikTok Shop',
    domains: ['tiktok.com', 'tiktokshop.com'],
    iconDomain: 'tiktok.com',
  },
  {
    platform: 'tokopedia',
    label: 'Tokopedia',
    domains: ['tokopedia.com', 'tokopedia.link'],
    iconDomain: 'tokopedia.com',
  },
  {
    platform: 'lazada',
    label: 'Lazada',
    domains: ['lazada.co.id', 'lazada.com', 'lzd.co'],
    iconDomain: 'lazada.co.id',
  },
  {
    platform: 'blibli',
    label: 'Blibli',
    domains: ['blibli.com'],
    iconDomain: 'blibli.com',
  },
  {
    platform: 'bukalapak',
    label: 'Bukalapak',
    domains: ['bukalapak.com'],
    iconDomain: 'bukalapak.com',
  },
];

function matchesDomain(hostname: string, domain: string) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

export function getLinkMetadata(value: string | null): LinkMetadata | null {
  if (!value) return null;

  const normalizedUrl = normalizeUrl(value);
  if (!normalizedUrl) return null;

  try {
    const parsedUrl = new URL(normalizedUrl);
    const hostname = parsedUrl.hostname.replace(/^www\./i, '').toLowerCase();
    const marketplace = platformMatchers.find((item) => item.domains.some((domain) => matchesDomain(hostname, domain)));
    const label = marketplace?.label || hostname;
    const platform = marketplace?.platform || 'website';
    const faviconDomain = marketplace?.iconDomain || hostname;

    return {
      url: normalizedUrl,
      hostname,
      label,
      platform,
      faviconUrl: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(faviconDomain)}&sz=64`,
      fallbackFaviconUrl: new URL('/favicon.ico', parsedUrl.origin).toString(),
    };
  } catch {
    return null;
  }
}

export function getLinkLabel(value: string | null) {
  return getLinkMetadata(value)?.label || (value ? 'Buka link' : 'Belum ada link');
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

export function createSavingsGoalID() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `saving_${crypto.randomUUID().replace(/-/g, '').slice(0, 18)}`;
  }

  return `saving_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createSavingsEntryID() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `savingentry_${crypto.randomUUID().replace(/-/g, '').slice(0, 18)}`;
  }

  return `savingentry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}


export function mapSavingsGoal(row: SavingsGoalRow): SavingsGoal {
  return {
    ...row,
    target_amount: Number(row.target_amount || 0),
    created_at: Number(row.created_at || Date.now()),
    updated_at: Number(row.updated_at || row.created_at || Date.now()),
  };
}

export function mapSavingsEntry(row: SavingsEntryRow): SavingsEntry {
  return {
    ...row,
    amount: Number(row.amount || 0),
    created_at: Number(row.created_at || Date.now()),
  };
}

export function formatDateOnly(value: number) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatTimeOnly(value: number) {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .format(new Date(value))
    .replace(/\./g, ':');
}
