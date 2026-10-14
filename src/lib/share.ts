import { FaceCardData } from '@/types';

export interface ShareOptions {
  card: FaceCardData;
  format?: '9:16' | '4:5' | '1:1';
}

/**
 * Triggers native Web Share API with rich fallback to clipboard/download
 */
export async function shareFaceCard(options: ShareOptions): Promise<boolean> {
  const { card } = options;
  const shareText = `My Face Card never declines! Lethality ${card.score || 84}/100, ${card.tier} Tier. Check your face card: ${typeof window !== 'undefined' ? window.location.origin : ''}`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: 'My Face Card — Status Rating',
        text: shareText,
        url: window.location.href,
      });
      return true;
    } catch {
      // User cancelled share
      return false;
    }
  }

  // Fallback: Copy link
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(shareText);
    return true;
  }

  return false;
}
