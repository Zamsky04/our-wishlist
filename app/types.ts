export type MainMenu = 'wishlist' | 'seserahan' | 'savings';
export type WishCategory = 'boy' | 'together' | 'girl';
export type StatusFilter = 'all' | 'active' | 'done';
export type SortBy = 'newest' | 'oldest' | 'az' | 'doneFirst';
export type GiftSortBy = 'newest' | 'oldest' | 'priceLow' | 'priceHigh' | 'doneFirst';

export interface WishItem {
  id: string;
  room_id: string;
  text: string;
  category: WishCategory;
  is_checked: boolean;
  created_at: number;
}

export type WishRow = WishItem;

export type WishInsert = {
  id: string;
  room_id: string;
  text: string;
  category: WishCategory;
  is_checked?: boolean;
  created_at: number;
};

export type WishUpdate = Partial<Pick<WishItem, 'text' | 'category' | 'is_checked' | 'created_at'>>;

export interface GiftCategoryItem {
  id: string;
  room_id: string;
  name: string;
  sort_order: number;
  created_at: number;
}

export type GiftCategoryRow = GiftCategoryItem;
export type GiftCategoryInsert = GiftCategoryItem;

export interface GiftItem {
  id: string;
  room_id: string;
  category_id: string;
  title: string;
  link_url: string | null;
  price: number | null;
  is_checked: boolean;
  created_at: number;
}

export type GiftItemRow = Omit<GiftItem, 'price'> & {
  price: number | string | null;
};

export type GiftItemInsert = {
  id: string;
  room_id: string;
  category_id: string;
  title: string;
  link_url?: string | null;
  price?: number | null;
  is_checked?: boolean;
  created_at: number;
};

export type GiftItemUpdate = Partial<Pick<GiftItem, 'category_id' | 'title' | 'link_url' | 'price' | 'is_checked' | 'created_at'>>;

export interface RoomItem {
  room_id: string;
  boy_name: string;
  girl_name: string;
  updated_at: number;
}

export type RoomRow = RoomItem;
export type RoomInsert = RoomItem;

export type SavingsContributor = 'boy' | 'girl';
export type SavingsPageMode = 'list' | 'add' | 'detail';

export interface SavingsGoal {
  id: string;
  room_id: string;
  name: string;
  target_amount: number;
  description: string | null;
  created_at: number;
  updated_at: number;
}

export type SavingsGoalRow = Omit<SavingsGoal, 'target_amount'> & {
  target_amount: number | string;
};

export type SavingsGoalInsert = SavingsGoal;

export interface SavingsEntry {
  id: string;
  room_id: string;
  goal_id: string;
  contributor: SavingsContributor;
  amount: number;
  note: string | null;
  created_at: number;
}

export type SavingsEntryRow = Omit<SavingsEntry, 'amount'> & {
  amount: number | string;
};

export type SavingsEntryInsert = SavingsEntry;
