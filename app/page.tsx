import { Cormorant, DM_Sans } from 'next/font/google';
import WeddingWishlistApp from './components/WeddingWishlistApp';

const serifFont = Cormorant({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--wishlist-serif',
  display: 'swap',
});

const sansFont = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--wishlist-sans',
  display: 'swap',
});

export default function Page() {
  return <WeddingWishlistApp fontClassName={`${serifFont.variable} ${sansFont.variable}`} />;
}
