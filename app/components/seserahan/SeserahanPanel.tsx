import styles from '../../WishlistPage.module.css';
import type { useSeserahanState } from '../../hooks/useSeserahanState';
import SeserahanAddPage from './SeserahanAddPage';
import SeserahanEditPage from './SeserahanEditPage';
import SeserahanList from './SeserahanList';

interface SeserahanPanelProps {
  roomID: string;
  seserahan: ReturnType<typeof useSeserahanState>;
}

export default function SeserahanPanel({ roomID, seserahan }: SeserahanPanelProps) {
  return (
    <div className={styles.contentShellWide}>
      {seserahan.giftPageMode === 'add' ? (
        <SeserahanAddPage
          roomID={roomID}
          inputRef={seserahan.giftInputRef}
          giftCategories={seserahan.giftCategories}
          title={seserahan.newGiftTitle}
          price={seserahan.newGiftPrice}
          link={seserahan.newGiftLink}
          categoryId={seserahan.newGiftCategoryId}
          categoryName={seserahan.newGiftCategoryName}
          onTitleChange={seserahan.setNewGiftTitle}
          onPriceChange={seserahan.setNewGiftPrice}
          onLinkChange={seserahan.setNewGiftLink}
          onCategoryIdChange={seserahan.setNewGiftCategoryId}
          onCategoryNameChange={seserahan.setNewGiftCategoryName}
          onSubmit={seserahan.handleAddGiftItem}
          onSubmitCategory={seserahan.handleAddGiftCategory}
          onBack={seserahan.handleCloseGiftAddPage}
        />
      ) : seserahan.giftPageMode === 'edit' ? (
        <SeserahanEditPage
          roomID={roomID}
          inputRef={seserahan.giftEditInputRef}
          giftCategories={seserahan.giftCategories}
          title={seserahan.editGiftTitle}
          price={seserahan.editGiftPrice}
          link={seserahan.editGiftLink}
          categoryId={seserahan.editGiftCategoryId}
          categoryName={seserahan.editGiftCategoryName}
          onTitleChange={seserahan.setEditGiftTitle}
          onPriceChange={seserahan.setEditGiftPrice}
          onLinkChange={seserahan.setEditGiftLink}
          onCategoryIdChange={seserahan.setEditGiftCategoryId}
          onCategoryNameChange={seserahan.setEditGiftCategoryName}
          onSubmit={seserahan.handleUpdateGiftItem}
          onBack={seserahan.handleCloseGiftEditPage}
        />
      ) : (
        <SeserahanList
          roomID={roomID}
          giftItems={seserahan.giftItems}
          giftDoneCount={seserahan.giftDoneCount}
          giftTotalBudget={seserahan.giftTotalBudget}
          giftDoneBudget={seserahan.giftDoneBudget}
          giftProgressPercentage={seserahan.giftProgressPercentage}
          giftListGroups={seserahan.giftListGroups}
          isGiftLoading={seserahan.isGiftLoading}
          giftExitingIds={seserahan.giftExitingIds}
          onAddClick={seserahan.handleOpenGiftAddPage}
          onEditGift={seserahan.handleOpenGiftEditPage}
          onToggleGift={seserahan.handleToggleGift}
          onDeleteGift={seserahan.handleDeleteGift}
        />
      )}
    </div>
  );
}
