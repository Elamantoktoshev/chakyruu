import { useState, type ImgHTMLAttributes } from 'react';
import { safeUrl } from '../../lib/format';
import type { InvitationViewMode } from '../types';

type PhotoProps = Pick<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError' | 'loading' | 'decoding' | 'fetchPriority'>;

/**
 * Safe hero photo that disappears if the image fails to load.
 * On the live page it is the largest element (LCP), so it is fetched first; template cards load it lazily.
 */
export function usePhoto(photoUrl: string | null, mode: InvitationViewMode): { src: string | undefined; props: PhotoProps } {
  const [failed, setFailed] = useState<string | null>(null);
  const src = photoUrl === failed ? undefined : safeUrl(photoUrl);
  const isLive = mode === 'live';
  return {
    src,
    props: {
      src,
      onError: () => setFailed(photoUrl),
      loading: mode === 'thumbnail' ? 'lazy' : 'eager',
      decoding: isLive ? 'sync' : 'async',
      fetchPriority: isLive ? 'high' : 'low',
    },
  };
}
