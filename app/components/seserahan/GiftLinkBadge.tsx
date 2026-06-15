// src/components/seserahan/GiftLinkBadge.tsx
'use client';

import styles from '../../WishlistPage.module.css';
import { getLinkMetadata } from '../../lib/helpers';

interface GiftLinkBadgeProps {
  url: string;
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.2 2.45 3.3 5.45 3.3 9S14.2 18.55 12 21M12 3C9.8 5.45 8.7 8.45 8.7 12S9.8 18.55 12 21" />
    </svg>
  );
}

export default function GiftLinkBadge({ url }: GiftLinkBadgeProps) {
  const metadata = getLinkMetadata(url);

  if (!metadata) return null;

  return (
    <a
      className={styles.giftLinkCell}
      href={metadata.url}
      target="_blank"
      rel="noopener noreferrer"
      title={`Buka ${metadata.label} (${metadata.hostname})`}
      aria-label={`Buka link ${metadata.label} di tab baru`}
      data-platform={metadata.platform}
    >
      <span className={styles.giftLinkLogo} aria-hidden="true">
        <span className={styles.giftLinkLogoFallback}>
          <GlobeIcon />
        </span>
        <img
          src={metadata.faviconUrl}
          alt=""
          width="32"
          height="32"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(event) => {
            const image = event.currentTarget;

            if (image.dataset.fallbackAttempted !== 'true') {
              image.dataset.fallbackAttempted = 'true';
              image.src = metadata.fallbackFaviconUrl;
              return;
            }

            image.hidden = true;
          }}
        />
      </span>
    </a>
  );
}
