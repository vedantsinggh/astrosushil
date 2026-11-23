import { Faq, Prisma } from '@prisma/client';
import { prisma } from '../../services/prisma.service';
import { NotFoundError } from '../../errors/app-error';
import { AdminActor, auditContentAction, changedFields } from './content.audit';
import { AdminFaqQuery, CreateFaqInput, UpdateFaqInput } from './content.schemas';

export interface PublicFaqView {
  id: string;
  question: string;
  answer: string;
  page: string;
  order: number;
}

export interface AdminFaqView extends PublicFaqView {
  isActive: boolean;
  createdById: string | null;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const DISPLAY_ORDER: Prisma.FaqOrderByWithRelationInput[] = [{ order: 'asc' }, { createdAt: 'desc' }];

function toPublicView(faq: Faq): PublicFaqView {
  return { id: faq.id, question: faq.question, answer: faq.answer, page: faq.page, order: faq.order };
}

function toAdminView(faq: Faq): AdminFaqView {
  return {
    ...toPublicView(faq),
    isActive: faq.isActive,
    createdById: faq.createdById,
    updatedById: faq.updatedById,
    createdAt: faq.createdAt,
    updatedAt: faq.updatedAt,
  };
}

export class FaqsService {
  /** Active FAQs, optionally of one page, in display order. */
  public async listPublic(page?: string): Promise<PublicFaqView[]> {
    const where: Prisma.FaqWhereInput = { isActive: true };
    if (page) where.page = page;
    const faqs = await prisma.faq.findMany({ where, orderBy: DISPLAY_ORDER });
    return faqs.map(toPublicView);
  }

  public async list(query: AdminFaqQuery): Promise<AdminFaqView[]> {
    const where: Prisma.FaqWhereInput = {};
    if (query.page) where.page = query.page;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    const faqs = await prisma.faq.findMany({ where, orderBy: DISPLAY_ORDER });
    return faqs.map(toAdminView);
  }

  public async getById(id: string): Promise<AdminFaqView> {
    return toAdminView(await this.requireFaq(id));
  }

  public async create(input: CreateFaqInput, actor: AdminActor): Promise<AdminFaqView> {
    const faq = await prisma.faq.create({
      data: {
        question: input.question,
        answer: input.answer,
        page: input.page,
        isActive: input.isActive,
        order: input.order,
        createdById: actor.id,
      },
    });
    await auditContentAction(actor, 'FAQ_CREATE', `Faq:${faq.id}`, `FAQ on page "${faq.page}"`);
    return toAdminView(faq);
  }

  public async update(id: string, input: UpdateFaqInput, actor: AdminActor): Promise<AdminFaqView> {
    await this.requireFaq(id);
    const data: Prisma.FaqUpdateInput = { updatedById: actor.id };
    if (input.question !== undefined) data.question = input.question;
    if (input.answer !== undefined) data.answer = input.answer;
    if (input.page !== undefined) data.page = input.page;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.order !== undefined) data.order = input.order;

    const faq = await prisma.faq.update({ where: { id }, data });
    await auditContentAction(actor, 'FAQ_UPDATE', `Faq:${id}`, changedFields(input));
    return toAdminView(faq);
  }

  public async remove(id: string, actor: AdminActor): Promise<void> {
    const existing = await this.requireFaq(id);
    await prisma.faq.delete({ where: { id } });
    await auditContentAction(actor, 'FAQ_DELETE', `Faq:${id}`, `FAQ on page "${existing.page}"`);
  }

  private async requireFaq(id: string): Promise<Faq> {
    const faq = await prisma.faq.findUnique({ where: { id } });
    if (!faq) throw new NotFoundError('FAQ not found');
    return faq;
  }
}

export const faqsService = new FaqsService();
