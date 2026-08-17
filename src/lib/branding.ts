/** Picks one photo per page deterministically, so it's stable across reloads
 * but can differ between pages without needing a unique upload per page. */
export function pickPhotoForPage(photoUrls: string[], pageKey: string): string | null {
  if (photoUrls.length === 0) return null;
  let hash = 0;
  for (let i = 0; i < pageKey.length; i++) {
    hash = (hash * 31 + pageKey.charCodeAt(i)) >>> 0;
  }
  return photoUrls[hash % photoUrls.length];
}
