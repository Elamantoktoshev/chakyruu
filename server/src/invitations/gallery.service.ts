import { GALLERY_MAX_PHOTOS } from '@chakyruu/shared';
import type { Prisma } from '@prisma/client';
import type { SessionUser } from '../auth/auth.service.js';
import { HttpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { removeQuietly } from '../storage/audioUpload.js';
import { storeImage } from '../storage/imageUpload.js';
import type { StorageProvider } from '../storage/storage.provider.js';
import { findManagedInvitation } from './access.js';

/** Selected with every invitation (public page, builder). */
export const gallerySelect = {
  gallery: {
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
    select: { id: true, url: true, width: true, height: true },
  },
} satisfies Prisma.InvitationSelect;

const tooManyPhotos = () => new HttpError(400, `The gallery holds at most ${GALLERY_MAX_PHOTOS} photos`);

export async function listGallery(invitationId: string) {
  const { gallery } = await prisma.invitation.findUniqueOrThrow({ where: { id: invitationId }, select: gallerySelect });
  return gallery;
}

/**
 * Adds a photo. The image is processed before the transaction (sharp is slow); the limit is
 * checked under a row lock so two parallel uploads cannot make a seventh photo.
 */
export async function addGalleryPhoto(id: string, user: SessionUser, data: Buffer, storage: StorageProvider) {
  await findManagedInvitation(id, user);
  if ((await prisma.invitationPhoto.count({ where: { invitationId: id } })) >= GALLERY_MAX_PHOTOS) throw tooManyPhotos();

  const stored = await storeImage(storage, data);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Invitation" WHERE id = ${id} FOR UPDATE`;
      const count = await tx.invitationPhoto.count({ where: { invitationId: id } });
      if (count >= GALLERY_MAX_PHOTOS) throw tooManyPhotos();
      await tx.invitationPhoto.create({
        data: { invitationId: id, url: stored.url, key: stored.key, width: stored.width, height: stored.height, sortOrder: count },
      });
    });
  } catch (error: unknown) {
    await removeQuietly(storage, stored.key);
    throw error;
  }
  return listGallery(id);
}

export async function removeGalleryPhoto(id: string, user: SessionUser, photoId: string, storage: StorageProvider) {
  await findManagedInvitation(id, user);
  const photo = await prisma.invitationPhoto.findFirst({ where: { id: photoId, invitationId: id }, select: { key: true } });
  if (!photo) throw new HttpError(404, 'Photo not found');
  await prisma.invitationPhoto.delete({ where: { id: photoId } });
  await removeQuietly(storage, photo.key);
  return listGallery(id);
}

/** New order: exactly the invitation's photo ids. */
export async function reorderGallery(id: string, user: SessionUser, photoIds: readonly string[]) {
  await findManagedInvitation(id, user);
  const current = await listGallery(id);
  const isSameSet = current.length === photoIds.length && current.every((photo) => photoIds.includes(photo.id));
  if (!isSameSet) throw new HttpError(400, 'Send every photo of the gallery exactly once');
  await prisma.$transaction(
    photoIds.map((photoId, sortOrder) => prisma.invitationPhoto.update({ where: { id: photoId }, data: { sortOrder } })),
  );
  return listGallery(id);
}
