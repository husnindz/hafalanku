import type { LastReadPosition, TilawahBookmark } from '@hafalanku/quran-types';

const BOOKMARKS_KEY = 'hafalanku_tilawah_bookmarks_v1';

export function listTilawahBookmarks(): TilawahBookmark[] {
  try {
    const raw = window.localStorage.getItem(BOOKMARKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as TilawahBookmark[]).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    );
  } catch {
    return [];
  }
}

function saveBookmarks(items: TilawahBookmark[]): void {
  try {
    window.localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(items));
  } catch {
    // Abaikan jika storage diblokir
  }
}

export function createTilawahBookmark(
  label: string,
  pos: Omit<LastReadPosition, 'updatedAt'>
): TilawahBookmark[] {
  const existing = listTilawahBookmarks();
  const cleanLabel = label.trim() || `Penanda Hal. ${pos.page}`;
  const now = new Date().toISOString();

  const created: TilawahBookmark = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: cleanLabel,
    mode: pos.mode,
    page: pos.page,
    surah: pos.surah,
    ayah: pos.ayah,
    surahName: pos.surahName,
    isPinned: existing.length === 0,
    updatedAt: now,
  };

  const next = [created, ...existing];
  saveBookmarks(next);
  return next;
}

export function updateTilawahBookmarkPosition(
  id: string,
  pos: Omit<LastReadPosition, 'updatedAt'>
): TilawahBookmark[] {
  const existing = listTilawahBookmarks();
  const now = new Date().toISOString();
  const next = existing.map((item) =>
    item.id === id
      ? {
          ...item,
          mode: pos.mode,
          page: pos.page,
          surah: pos.surah,
          ayah: pos.ayah,
          surahName: pos.surahName,
          updatedAt: now,
        }
      : item
  );
  saveBookmarks(next);
  return next;
}

export function togglePinTilawahBookmark(id: string): TilawahBookmark[] {
  const existing = listTilawahBookmarks();
  const target = existing.find((item) => item.id === id);
  const nextPinned = !(target?.isPinned ?? false);

  const next = existing.map((item) => ({
    ...item,
    isPinned: item.id === id ? nextPinned : false,
  }));
  saveBookmarks(next);
  return next;
}

export function deleteTilawahBookmark(id: string): TilawahBookmark[] {
  const next = listTilawahBookmarks().filter((item) => item.id !== id);
  saveBookmarks(next);
  return next;
}

export function getPinnedTilawahBookmark(): TilawahBookmark | null {
  return listTilawahBookmarks().find((item) => item.isPinned) ?? null;
}

