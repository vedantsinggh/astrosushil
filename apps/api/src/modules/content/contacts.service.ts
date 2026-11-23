import { createHash } from 'node:crypto';
import { ContactInquiry, Prisma } from '@prisma/client';
import { prisma } from '../../services/prisma.service';
import { NotFoundError, RateLimitError } from '../../errors/app-error';
import { istEndOfDay, istStartOfDay } from '../../utils/business-time';
import { AdminActor, auditContentAction } from './content.audit';
import { ContentCache, contentCache } from './content.cache';
import { notifyContactInquiry } from './content.ports';
import { AdminContactQuery, SubmitContactInput } from './content.schemas';

/**
 * The public contact form saves a row and sends two emails, so it is limited per client IP:
 * at most CONTACT_SUBMIT_MAX submissions in any CONTACT_SUBMIT_WINDOW_MS window.
 * (The website has no limit here.)
 */
export const CONTACT_SUBMIT_MAX = 5;
export const CONTACT_SUBMIT_WINDOW_MS = 15 * 60 * 1000;

/** What the person who submitted the form gets back: their own submission, without admin remarks. */
export interface SubmittedContactView {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  createdAt: Date;
}

export interface AdminContactView extends SubmittedContactView {
  remarks: string;
  updatedAt: Date;
}

function toSubmittedView(contact: ContactInquiry): SubmittedContactView {
  return {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    subject: contact.subject,
    message: contact.message,
    createdAt: contact.createdAt,
  };
}

function toAdminView(contact: ContactInquiry): AdminContactView {
  return { ...toSubmittedView(contact), remarks: contact.remarks, updatedAt: contact.updatedAt };
}

/** The counter key never contains the IP address itself. */
function rateLimitKey(ip: string): string {
  return `content:contact:submit:${createHash('sha256').update(ip).digest('hex').slice(0, 32)}`;
}

export class ContactsService {
  constructor(private readonly cache: ContentCache = contentCache) {}

  // -------------------------------------------------------------------------
  // Public
  // -------------------------------------------------------------------------

  public async submit(input: SubmitContactInput, clientIp: string): Promise<SubmittedContactView> {
    const count = await this.cache.hit(rateLimitKey(clientIp || 'unknown'), CONTACT_SUBMIT_WINDOW_MS);
    if (count > CONTACT_SUBMIT_MAX) {
      throw new RateLimitError('Too many messages sent. Please try again later.');
    }

    const contact = await prisma.contactInquiry.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone ? input.phone : null,
        subject: input.subject ? input.subject : null,
        message: input.message,
      },
    });

    // Not awaited: the inquiry is saved, and a slow or failing mail server must neither delay nor
    // fail the customer's request. notifyContactInquiry never rejects.
    void notifyContactInquiry({
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      subject: contact.subject,
      message: contact.message,
      createdAt: contact.createdAt,
    });

    return toSubmittedView(contact);
  }

  // -------------------------------------------------------------------------
  // Admin
  // -------------------------------------------------------------------------

  public async list(
    query: AdminContactQuery
  ): Promise<{ contacts: AdminContactView[]; total: number; page: number; pages: number }> {
    const where: Prisma.ContactInquiryWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { message: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.fromDate || query.toDate) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (query.fromDate) createdAt.gte = istStartOfDay(query.fromDate);
      if (query.toDate) createdAt.lte = istEndOfDay(query.toDate);
      where.createdAt = createdAt;
    }

    const [contacts, total] = await Promise.all([
      prisma.contactInquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.contactInquiry.count({ where }),
    ]);

    return {
      contacts: contacts.map(toAdminView),
      total,
      page: query.page,
      pages: Math.ceil(total / query.limit),
    };
  }

  public async getById(id: string): Promise<AdminContactView> {
    return toAdminView(await this.requireContact(id));
  }

  public async updateRemarks(id: string, remarks: string, actor: AdminActor): Promise<AdminContactView> {
    await this.requireContact(id);
    const contact = await prisma.contactInquiry.update({ where: { id }, data: { remarks } });
    await auditContentAction(actor, 'CONTACT_INQUIRY_REMARKS_UPDATE', `ContactInquiry:${id}`, 'Remarks updated');
    return toAdminView(contact);
  }

  public async remove(id: string, actor: AdminActor): Promise<void> {
    const existing = await this.requireContact(id);
    await prisma.contactInquiry.delete({ where: { id } });
    await auditContentAction(
      actor,
      'CONTACT_INQUIRY_DELETE',
      `ContactInquiry:${id}`,
      `Inquiry received ${existing.createdAt.toISOString()} deleted`
    );
  }

  private async requireContact(id: string): Promise<ContactInquiry> {
    const contact = await prisma.contactInquiry.findUnique({ where: { id } });
    if (!contact) throw new NotFoundError('Contact not found');
    return contact;
  }
}

export const contactsService = new ContactsService();
