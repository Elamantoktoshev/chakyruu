import type { TrackCreateData, TrackPatchInput } from '@chakyruu/shared';
import { HttpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { replaceAudio, type AudioCompressor } from '../storage/audioUpload.js';
import type { StorageProvider } from '../storage/storage.provider.js';

const publicTrackSelect = { id: true, title: true, category: true, file: true, durationSec: true } as const;
const adminTrackSelect = { ...publicTrackSelect, active: true, sortOrder: true, fileKey: true, updatedAt: true } as const;

/** Builder catalogue: enabled tracks that actually have a file. */
export async function listActiveTracks() {
  return prisma.track.findMany({
    where: { active: true, file: { not: null } },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { title: 'asc' }],
    select: publicTrackSelect,
  });
}

export async function listAllTracks() {
  const tracks = await prisma.track.findMany({
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { title: 'asc' }],
    select: { ...adminTrackSelect, _count: { select: { invitations: true } } },
  });
  return tracks.map(({ _count, fileKey, ...track }) => ({ ...track, isUploaded: fileKey !== null, usedBy: _count.invitations }));
}

export async function createTrack(input: TrackCreateData) {
  return prisma.track.create({ data: input, select: adminTrackSelect });
}

async function findTrack(id: string) {
  const track = await prisma.track.findUnique({ where: { id }, select: { id: true, file: true, fileKey: true } });
  if (!track) throw new HttpError(404, 'Track not found');
  return track;
}

export async function updateTrack(id: string, patch: TrackPatchInput) {
  const track = await findTrack(id);
  if (patch.active && !track.file) throw new HttpError(400, 'Upload the mp3 before enabling the track');
  return prisma.track.update({ where: { id }, data: patch, select: adminTrackSelect });
}

interface TrackFileUpload {
  data: Buffer;
  durationSec?: number;
  storage: StorageProvider;
  compress: AudioCompressor;
}

/** Uploads (or replaces) the track's mp3; the old uploaded file is deleted. */
export async function setTrackFile(id: string, { data, durationSec, storage, compress }: TrackFileUpload) {
  const track = await findTrack(id);
  await replaceAudio(storage, compress, data, track.fileKey, async ({ url, key }) => {
    await prisma.track.update({
      where: { id },
      data: { file: url, fileKey: key, ...(durationSec ? { durationSec } : {}) },
    });
  });
  return prisma.track.findUniqueOrThrow({ where: { id }, select: adminTrackSelect });
}
