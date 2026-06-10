import type { GiftCategoryItem, GiftItem } from '../../types';

export type GiftPageMode = 'list' | 'add' | 'edit';

export interface GiftListGroup {
  category: GiftCategoryItem;
  items: GiftItem[];
}
