import { randomBytes } from 'node:crypto';
import { normalizeCity, slugify, type LeadStatus, type OrgType } from '@chakyruu/shared';
import { HttpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';

const LIST_LIMIT = 500;
const ORG_SLUG_SUFFIX_BYTES = 3;

export async function listOrganizations(type: OrgType | undefined) {
  const orgs = await prisma.organization.findMany({
    where: type ? { type } : undefined,
    orderBy: { createdAt: 'desc' },
    take: LIST_LIMIT,
    select: {
      id: true,
      type: true,
      name: true,
      city: true,
      phone: true,
      invitationCredits: true,
      catalogStatus: true,
      createdAt: true,
      users: { where: { role: 'ORG_ADMIN' }, select: { phone: true } },
      _count: { select: { giftCodes: true, venueInvitations: true, tamadaInvitations: true } },
    },
  });
  return orgs.map(({ users, _count, ...org }) => ({
    ...org,
    adminPhones: users.map((user) => user.phone),
    giftsIssued: _count.giftCodes,
    invitations: _count.venueInvitations + _count.tamadaInvitations,
  }));
}

/** Catalogue moderation: only PUBLISHED partners appear in /tamadalar and builder pickers. */
export async function setCatalogStatus(orgId: string, catalogStatus: 'HIDDEN' | 'PUBLISHED') {
  const { count } = await prisma.organization.updateMany({ where: { id: orgId }, data: { catalogStatus } });
  if (count === 0) throw new HttpError(404, 'Organization not found');
  return { id: orgId, catalogStatus };
}

/** Manual top-up (e.g. after a bank transfer), recorded with who granted it. */
export async function grantCredits(orgId: string, amount: number, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.organization.updateMany({ where: { id: orgId }, data: { invitationCredits: { increment: amount } } });
    if (count === 0) throw new HttpError(404, 'Organization not found');
    await tx.creditTransaction.create({ data: { organizationId: orgId, amount, reason: 'ADMIN_GRANT', createdById: adminId } });
    const org = await tx.organization.findUniqueOrThrow({ where: { id: orgId }, select: { invitationCredits: true } });
    return { balance: org.invitationCredits };
  });
}

export async function listLeads(status: LeadStatus | undefined) {
  return prisma.partnerLead.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    take: LIST_LIMIT,
  });
}

export async function setLeadStatus(leadId: string, status: 'NEW' | 'CONTACTED') {
  const { count } = await prisma.partnerLead.updateMany({ where: { id: leadId, status: { not: 'CONVERTED' } }, data: { status } });
  if (count === 0) throw new HttpError(404, 'Lead not found or already converted');
  return prisma.partnerLead.findUniqueOrThrow({ where: { id: leadId } });
}

function organizationSlug(name: string): string {
  const base = slugify(name) || 'partner';
  return `${base}-${randomBytes(ORG_SLUG_SUFFIX_BYTES).toString('hex')}`;
}

/**
 * Creates the organization from a lead and makes the lead's phone its ORG_ADMIN.
 * Refuses to take over a phone that already administers something, so nobody loses access by accident.
 */
export async function convertLead(leadId: string, nameOverride: string | undefined) {
  return prisma.$transaction(async (tx) => {
    const lead = await tx.partnerLead.findUnique({ where: { id: leadId } });
    if (!lead) throw new HttpError(404, 'Lead not found');
    if (lead.status === 'CONVERTED') throw new HttpError(409, 'This lead is already converted');

    const existing = await tx.user.findUnique({ where: { phone: lead.phone }, select: { role: true, organizationId: true } });
    if (existing && (existing.role === 'ADMIN' || existing.organizationId)) {
      throw new HttpError(409, 'This phone already belongs to another organization or an admin');
    }

    const name = nameOverride ?? lead.venueName;
    const org = await tx.organization.create({
      data: {
        type: lead.type,
        name,
        slug: organizationSlug(name),
        city: lead.city ? normalizeCity(lead.city) : null,
        phone: lead.phone,
        whatsapp: lead.phone,
        ...(lead.type === 'TAMADA'
          ? { tamadaProfile: { create: { displayName: lead.name, languages: [], videoUrls: [] } } }
          : {}),
      },
      select: { id: true, name: true, type: true },
    });
    await tx.user.upsert({
      where: { phone: lead.phone },
      update: { role: 'ORG_ADMIN', organizationId: org.id },
      create: { phone: lead.phone, name: lead.name, role: 'ORG_ADMIN', organizationId: org.id },
    });
    // Guarded update: a parallel convert of the same lead fails here and rolls back.
    const converted = await tx.partnerLead.updateMany({
      where: { id: leadId, status: { not: 'CONVERTED' } },
      data: { status: 'CONVERTED', organizationId: org.id },
    });
    if (converted.count === 0) throw new HttpError(409, 'This lead is already converted');
    return org;
  });
}
