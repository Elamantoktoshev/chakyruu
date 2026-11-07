import { useState } from 'react';
import { safeUrl } from '../../lib/format';

/** Safe photo URL that disappears if the image fails to load. */
export function usePhoto(photoUrl: string | null): { src: string | undefined; onError: () => void } {
  const [failed, setFailed] = useState<string | null>(null);
  return { src: photoUrl === failed ? undefined : safeUrl(photoUrl), onError: () => setFailed(photoUrl) };
}
