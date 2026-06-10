// src/components/WeddingWishlistApp.tsx
'use client';

import { useMemo, useState } from 'react';
import styles from '../WishlistPage.module.css';
import NotificationToast from './common/NotificationToast';
import SeserahanPanel from './seserahan/SeserahanPanel';
import MainMenuTabs from './wedding/MainMenuTabs';
import WeddingFooter from './wedding/WeddingFooter';
import WeddingHeader from './wedding/WeddingHeader';
import WishlistPanel from './wishlist/WishlistPanel';
import { useNotification } from '../hooks/useNotification';
import { useRoomState } from '../hooks/useRoomState';
import { useSeserahanState } from '../hooks/useSeserahanState';
import { useWishlistState } from '../hooks/useWishlistState';
import type { MainMenu, WishCategory } from '../types';

export default function WeddingWishlistApp({ fontClassName = '' }: { fontClassName?: string }) {
  const [mainMenu, setMainMenu] = useState<MainMenu>('wishlist');
  const { notification, notify } = useNotification();
  const room = useRoomState({ notify });
  const wishlist = useWishlistState({ roomID: room.roomID, notify });
  const seserahan = useSeserahanState({ roomID: room.roomID, notify });

  const names = useMemo<Record<WishCategory, string>>(
    () => ({
      boy: room.boyName,
      together: 'Bersama',
      girl: room.girlName,
    }),
    [room.boyName, room.girlName],
  );

  const handleMenuChange = (menu: MainMenu) => {
    setMainMenu(menu);

    if (menu === 'seserahan') {
      seserahan.setGiftPageMode('list');
    }
  };

  return (
    <main className={`${styles.root} ${fontClassName}`}>
      <section className={styles.page} data-accent={mainMenu === 'seserahan' ? 'seserahan' : wishlist.activeTab}>
        <WeddingHeader
          boyName={room.boyName}
          girlName={room.girlName}
          tempBoyName={room.tempBoyName}
          tempGirlName={room.tempGirlName}
          editingNames={room.editingNames}
          onTempBoyNameChange={room.setTempBoyName}
          onTempGirlNameChange={room.setTempGirlName}
          onStartEditNames={room.handleStartEditNames}
          onCancelEditNames={room.handleCancelEditNames}
          onSaveNames={room.handleSaveNames}
          onCopyLink={room.handleCopyLink}
        />

        <div className={styles.divider} />

        <MainMenuTabs
          activeMenu={mainMenu}
          wishlistDoneCount={wishlist.allWishlistDoneCount}
          wishlistCount={wishlist.allWishlistCount}
          giftDoneCount={seserahan.giftDoneCount}
          giftCount={seserahan.giftItems.length}
          onMenuChange={handleMenuChange}
        />

        {mainMenu === 'wishlist' ? (
          <WishlistPanel
            roomID={room.roomID}
            names={names}
            inputRef={wishlist.inputRef}
            newWish={wishlist.newWish}
            activeTab={wishlist.activeTab}
            counts={wishlist.counts}
            checkedCount={wishlist.checkedCount}
            totalCount={wishlist.totalCount}
            progressPercentage={wishlist.progressPercentage}
            categoryWishes={wishlist.categoryWishes}
            visibleWishes={wishlist.visibleWishes}
            searchQuery={wishlist.searchQuery}
            statusFilter={wishlist.statusFilter}
            sortBy={wishlist.sortBy}
            shouldShowTools={wishlist.shouldShowTools}
            isLoading={wishlist.isLoading}
            exitingIds={wishlist.exitingIds}
            onNewWishChange={wishlist.setNewWish}
            onActiveTabChange={wishlist.setActiveTab}
            onSearchQueryChange={wishlist.setSearchQuery}
            onStatusFilterChange={wishlist.setStatusFilter}
            onSortByChange={wishlist.setSortBy}
            onSubmit={wishlist.handleAdd}
            onToggle={wishlist.handleToggle}
            onDelete={wishlist.handleDelete}
          />
        ) : (
          <SeserahanPanel roomID={room.roomID} seserahan={seserahan} />
        )}

        <WeddingFooter roomID={room.roomID} />
      </section>

      <NotificationToast notification={notification} />
    </main>
  );
}
