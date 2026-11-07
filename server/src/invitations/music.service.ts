import type { InvitationDraftInput } from '@chakyruu/shared';
import type { SessionUser } from '../auth/auth.service.js';
import { HttpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { removeQuietly, replaceAudio, type AudioCompressor } from '../storage/audioUpload.js';
import type { StorageProvider } from '../storage/storage.provider.js';
import { findManagedInvitation } from './access.js';

/** Selected with every invitation; turned into `music` by toMusicView. */
export const invitationMusicSelect = {
  musicTrackId: true,
  musicStartSec: true,
  customMusicUrl: true,
  customMusicDurationSec: true,
  musicTrack: { select: { title: true, file: true, durationSec: true, active: true } },
} as const;

interface MusicRow {
  musicTrackId: string | null;
  musicStartSec: number;
  customMusicUrl: string | null;
  customMusicDurationSec: number | null;
  musicTrack: { title: string; file: string | null; durationSec: number | null; active: boolean } | null;
}

export interface MusicView {
  src: string;
  /** Catalogue title; null for the owner's own file. */
  title: string | null;
  durationSec: number | null;
  startSec: number;
  isCustom: boolean;
}

/** What the player needs. A track the admin switched off stops playing everywhere. */
export function toMusicView(row: MusicRow): MusicView | null {
  const { musicStartSec: startSec } = row;
  if (row.customMusicUrl) {
    return { src: row.customMusicUrl, title: null, durationSec: row.customMusicDurationSec, startSec, isCustom: true };
  }
  const track = row.musicTrack;
  if (!track?.file || !track.active) return null;
  return { src: track.file, title: track.title, durationSec: track.durationSec, startSec, isCustom: false };
}

/** Replaces the raw music columns of a selected row with `music`. */
export function withMusicView<T extends MusicRow>(row: T) {
  const { musicTrack: _track, customMusicUrl: _url, customMusicDurationSec: _duration, ...rest } = row;
  return { ...rest, music: toMusicView(row) };
}

export interface MusicChoice {
  data: { customMusicUrl?: null; customMusicKey?: null; customMusicDurationSec?: null };
  /** Own mp3 to delete once the update is saved. */
  staleKey: string | null;
}

/**
 * Autosave of `musicTrackId`: picking a track (or "no music") drops the owner's own mp3.
 * A track must be enabled, unless the invitation already uses it.
 */
export async function resolveMusicChoice(invitationId: string, input: InvitationDraftInput): Promise<MusicChoice> {
  if (input.musicTrackId === undefined) return { data: {}, staleKey: null };
  const current = await prisma.invitation.findUniqueOrThrow({
    where: { id: invitationId },
    select: { musicTrackId: true, customMusicKey: true },
  });
  if (input.musicTrackId !== null && input.musicTrackId !== current.musicTrackId) {
    const track = await prisma.track.findUnique({ where: { id: input.musicTrackId }, select: { active: true, file: true } });
    if (!track?.active || !track.file) throw new HttpError(400, 'Unknown music track');
  }
  return {
    data: { customMusicUrl: null, customMusicKey: null, customMusicDurationSec: null },
    staleKey: current.customMusicKey,
  };
}

interface CustomMusicUpload {
  data: Buffer;
  durationSec?: number;
  storage: StorageProvider;
  compress: AudioCompressor;
}

/** Owner's own mp3: replaces the catalogue track and starts from the beginning. */
export async function setCustomMusic(id: string, user: SessionUser, upload: CustomMusicUpload) {
  await findManagedInvitation(id, user);
  const { customMusicKey } = await prisma.invitation.findUniqueOrThrow({ where: { id }, select: { customMusicKey: true } });
  await replaceAudio(upload.storage, upload.compress, upload.data, customMusicKey, async ({ url, key }) => {
    await prisma.invitation.update({
      where: { id },
      data: {
        customMusicUrl: url,
        customMusicKey: key,
        customMusicDurationSec: upload.durationSec ?? null,
        musicTrackId: null,
        musicStartSec: 0,
      },
    });
  });
  return getMusic(id);
}

export async function removeCustomMusic(id: string, user: SessionUser, storage: StorageProvider) {
  await findManagedInvitation(id, user);
  const { customMusicKey } = await prisma.invitation.findUniqueOrThrow({ where: { id }, select: { customMusicKey: true } });
  await prisma.invitation.update({
    where: { id },
    data: { customMusicUrl: null, customMusicKey: null, customMusicDurationSec: null, musicStartSec: 0 },
  });
  if (customMusicKey) await removeQuietly(storage, customMusicKey);
  return getMusic(id);
}

async function getMusic(id: string) {
  const row = await prisma.invitation.findUniqueOrThrow({ where: { id }, select: invitationMusicSelect });
  return withMusicView(row);
}
