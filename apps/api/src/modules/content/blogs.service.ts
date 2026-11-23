import { BlogPost, Prisma } from '@prisma/client';
import { prisma } from '../../services/prisma.service';
import { ConflictError, NotFoundError, ValidationError } from '../../errors/app-error';
import { AdminActor, auditContentAction, changedFields } from './content.audit';
import { acceptFile, deleteStoredFiles, FileRefInput, FileView, replacedKey, StoredFile, toFileView } from './content.ports';
import { hasVisibleContent, sanitizeRichText, slugify } from './content.sanitizer';
import { AdminBlogQuery, CreateBlogInput, PublicBlogQuery, UpdateBlogInput } from './content.schemas';

const MIN_SLUG_LENGTH = 3;
const MAX_SLUG_ATTEMPTS = 200;

export interface AdminBlogView {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  content: string;
  category: string;
  tags: string[];
  author: { name: string | null; avatar: FileView | null };
  thumbnail: FileView | null;
  images: FileView[];
  seo: { metaTitle: string | null; metaDescription: string | null; keywords: string[] };
  status: string;
  isFeatured: boolean;
  views: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** What the public site gets: the same post without storage keys. Only published posts are ever returned. */
export interface PublicBlogView {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  content: string;
  category: string;
  tags: string[];
  author: { name: string | null; avatar: { url: string } | null };
  thumbnail: { url: string } | null;
  images: { url: string }[];
  seo: { metaTitle: string | null; metaDescription: string | null; keywords: string[] };
  status: string;
  isFeatured: boolean;
  views: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function readImages(value: Prisma.JsonValue): FileView[] {
  if (!Array.isArray(value)) return [];
  const images: FileView[] = [];
  for (const item of value) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const { url, key } = item as Record<string, unknown>;
      if (typeof url === 'string' && url.length > 0) {
        images.push({ url, key: typeof key === 'string' && key.length > 0 ? key : null });
      }
    }
  }
  return images;
}

function toAdminView(blog: BlogPost): AdminBlogView {
  return {
    id: blog.id,
    title: blog.title,
    slug: blog.slug,
    shortDescription: blog.shortDescription,
    content: blog.content,
    category: blog.category,
    tags: blog.tags,
    author: { name: blog.authorName, avatar: toFileView(blog.authorAvatarUrl, blog.authorAvatarKey) },
    thumbnail: toFileView(blog.thumbnailUrl, blog.thumbnailKey),
    images: readImages(blog.images),
    seo: { metaTitle: blog.seoMetaTitle, metaDescription: blog.seoMetaDescription, keywords: blog.seoKeywords },
    status: blog.status,
    isFeatured: blog.isFeatured,
    views: blog.views,
    publishedAt: blog.publishedAt,
    createdAt: blog.createdAt,
    updatedAt: blog.updatedAt,
  };
}

function toPublicView(blog: BlogPost): PublicBlogView {
  return {
    id: blog.id,
    title: blog.title,
    slug: blog.slug,
    shortDescription: blog.shortDescription,
    content: blog.content,
    category: blog.category,
    tags: blog.tags,
    author: { name: blog.authorName, avatar: blog.authorAvatarUrl ? { url: blog.authorAvatarUrl } : null },
    thumbnail: blog.thumbnailUrl ? { url: blog.thumbnailUrl } : null,
    images: readImages(blog.images).map((image) => ({ url: image.url })),
    seo: { metaTitle: blog.seoMetaTitle, metaDescription: blog.seoMetaDescription, keywords: blog.seoKeywords },
    status: blog.status,
    isFeatured: blog.isFeatured,
    views: blog.views,
    publishedAt: blog.publishedAt,
    createdAt: blog.createdAt,
    updatedAt: blog.updatedAt,
  };
}

function listWhere(query: PublicBlogQuery | AdminBlogQuery): Prisma.BlogPostWhereInput {
  const where: Prisma.BlogPostWhereInput = {};
  if (query.search) where.title = { contains: query.search, mode: 'insensitive' };
  if (query.category) where.category = query.category;
  if (query.tag) where.tags = { has: query.tag };
  if (query.isFeatured !== undefined) where.isFeatured = query.isFeatured;
  return where;
}

function cleanContent(html: string): string {
  const content = sanitizeRichText(html);
  if (!hasVisibleContent(content)) {
    throw new ValidationError('Blog content is empty', [{ field: 'content', message: 'Blog content is empty' }]);
  }
  return content;
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

export class BlogsService {
  // -------------------------------------------------------------------------
  // Public: published posts only
  // -------------------------------------------------------------------------

  public async listPublished(query: PublicBlogQuery): Promise<{ blogs: PublicBlogView[]; total: number }> {
    const where: Prisma.BlogPostWhereInput = { ...listWhere(query), status: 'published' };
    const [blogs, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.blogPost.count({ where }),
    ]);
    return { blogs: blogs.map(toPublicView), total };
  }

  /** A published post by slug. Counts one view. Drafts answer 404, exactly like a missing post. */
  public async getPublishedBySlug(slug: string): Promise<PublicBlogView> {
    return this.readPublished({ slug: slug.toLowerCase(), status: 'published' });
  }

  /** A published post by id (the website's `GET /blogs/:id`). Counts one view. */
  public async getPublishedById(id: string): Promise<PublicBlogView> {
    return this.readPublished({ id, status: 'published' });
  }

  private async readPublished(where: Prisma.BlogPostWhereInput): Promise<PublicBlogView> {
    const blog = await prisma.blogPost.findFirst({ where, select: { id: true } });
    if (!blog) throw new NotFoundError('Blog not found');
    // Atomic increment: concurrent readers never lose a view (the website read, added one and saved).
    const updated = await prisma.blogPost.update({ where: { id: blog.id }, data: { views: { increment: 1 } } });
    return toPublicView(updated);
  }

  // -------------------------------------------------------------------------
  // Admin
  // -------------------------------------------------------------------------

  public async list(query: AdminBlogQuery): Promise<{ blogs: AdminBlogView[]; total: number; page: number; limit: number }> {
    const where = listWhere(query);
    if (query.status) where.status = query.status;
    const [blogs, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.blogPost.count({ where }),
    ]);
    return { blogs: blogs.map(toAdminView), total, page: query.page, limit: query.limit };
  }

  /** Admin read of any post, draft or published. Does not count a view. */
  public async getById(id: string): Promise<AdminBlogView> {
    return toAdminView(await this.requireBlog(id));
  }

  public async create(input: CreateBlogInput, actor: AdminActor): Promise<AdminBlogView> {
    const content = cleanContent(input.content);
    const slug = await this.resolveSlug(input.slug, input.title, null);
    const thumbnail = acceptFile(input.thumbnail, 'blog', 'thumbnail');
    const avatar = acceptFile(input.author?.avatar, 'blog', 'author.avatar');
    const images = this.acceptImages(input.images);

    const status = input.status;
    // As on the website: a post gets its publish date when it is first published.
    const publishedAt = status === 'published' ? input.publishedAt ?? new Date() : null;

    let blog: BlogPost;
    try {
      blog = await prisma.blogPost.create({
        data: {
          title: input.title,
          slug,
          shortDescription: input.shortDescription,
          content,
          category: input.category,
          tags: input.tags,
          authorName: input.author?.name ?? null,
          authorAvatarUrl: avatar?.url ?? null,
          authorAvatarKey: avatar?.key ?? null,
          thumbnailUrl: thumbnail?.url ?? null,
          thumbnailKey: thumbnail?.key ?? null,
          images: images.map((image) => ({ url: image.url, key: image.key })),
          seoMetaTitle: input.seo?.metaTitle ?? null,
          seoMetaDescription: input.seo?.metaDescription ?? null,
          seoKeywords: input.seo?.keywords ?? [],
          status,
          isFeatured: input.isFeatured,
          publishedAt,
        },
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictError('A blog with this slug already exists');
      throw err;
    }

    await auditContentAction(actor, 'BLOG_CREATE', `BlogPost:${blog.id}`, `Created "${blog.slug}" as ${blog.status}`);
    return toAdminView(blog);
  }

  public async update(id: string, input: UpdateBlogInput, actor: AdminActor): Promise<AdminBlogView> {
    const existing = await this.requireBlog(id);
    const data: Prisma.BlogPostUpdateInput = {};

    if (input.title !== undefined) data.title = input.title;
    if (input.shortDescription !== undefined) data.shortDescription = input.shortDescription;
    if (input.content !== undefined) data.content = cleanContent(input.content);
    if (input.category !== undefined) data.category = input.category;
    if (input.tags !== undefined) data.tags = input.tags;
    if (input.isFeatured !== undefined) data.isFeatured = input.isFeatured;

    // The slug is the post's public address: it changes only when the admin sends a new one.
    if (input.slug !== undefined) {
      const slug = await this.resolveSlug(input.slug, existing.title, id);
      if (slug !== existing.slug) data.slug = slug;
    }

    if (input.author) {
      if (input.author.name !== undefined) data.authorName = input.author.name;
      const avatar = acceptFile(input.author.avatar, 'blog', 'author.avatar');
      if (avatar !== undefined) {
        data.authorAvatarUrl = avatar?.url ?? null;
        data.authorAvatarKey = avatar?.key ?? null;
      }
    }

    if (input.seo) {
      if (input.seo.metaTitle !== undefined) data.seoMetaTitle = input.seo.metaTitle;
      if (input.seo.metaDescription !== undefined) data.seoMetaDescription = input.seo.metaDescription;
      if (input.seo.keywords !== undefined) data.seoKeywords = input.seo.keywords;
    }

    const thumbnail = acceptFile(input.thumbnail, 'blog', 'thumbnail');
    if (thumbnail !== undefined) {
      data.thumbnailUrl = thumbnail?.url ?? null;
      data.thumbnailKey = thumbnail?.key ?? null;
    }

    let nextImages: StoredFile[] | undefined;
    if (input.images !== undefined) {
      nextImages = this.acceptImages(input.images);
      data.images = nextImages.map((image) => ({ url: image.url, key: image.key }));
    }

    if (input.status !== undefined) data.status = input.status;
    if (input.publishedAt !== undefined) data.publishedAt = input.publishedAt;
    const nextStatus = input.status ?? existing.status;
    const nextPublishedAt = input.publishedAt !== undefined ? input.publishedAt : existing.publishedAt;
    if (nextStatus === 'published' && !nextPublishedAt) data.publishedAt = new Date();

    let blog: BlogPost;
    try {
      blog = await prisma.blogPost.update({ where: { id }, data });
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictError('A blog with this slug already exists');
      throw err;
    }

    const orphaned: Array<string | null> = [
      replacedKey(existing.thumbnailKey, blog.thumbnailKey),
      replacedKey(existing.authorAvatarKey, blog.authorAvatarKey),
    ];
    if (nextImages) {
      const kept = new Set(nextImages.map((image) => image.key));
      for (const image of readImages(existing.images)) {
        if (image.key && !kept.has(image.key)) orphaned.push(image.key);
      }
    }
    await deleteStoredFiles(orphaned);

    await auditContentAction(actor, 'BLOG_UPDATE', `BlogPost:${id}`, changedFields(input));
    return toAdminView(blog);
  }

  public async remove(id: string, actor: AdminActor): Promise<void> {
    const existing = await this.requireBlog(id);
    await prisma.blogPost.delete({ where: { id } });

    await deleteStoredFiles([
      existing.thumbnailKey,
      existing.authorAvatarKey,
      ...readImages(existing.images).map((image) => image.key),
    ]);
    await auditContentAction(actor, 'BLOG_DELETE', `BlogPost:${id}`, `Deleted "${existing.slug}"`);
  }

  private acceptImages(images: FileRefInput[]): StoredFile[] {
    const accepted: StoredFile[] = [];
    images.forEach((image, index) => {
      const file = acceptFile(image, 'blog', `images.${index}`);
      if (file) accepted.push(file);
    });
    return accepted;
  }

  private async requireBlog(id: string): Promise<BlogPost> {
    const blog = await prisma.blogPost.findUnique({ where: { id } });
    if (!blog) throw new NotFoundError('Blog not found');
    return blog;
  }

  /**
   * The slug to store. A slug typed by the admin is normalised and must be free (409 otherwise).
   * Without one it is derived from the title and made unique with a numeric suffix.
   */
  private async resolveSlug(requested: string | undefined, title: string, ownId: string | null): Promise<string> {
    if (requested !== undefined) {
      const slug = slugify(requested);
      if (slug.length < MIN_SLUG_LENGTH) {
        throw new ValidationError('Invalid slug', [
          { field: 'slug', message: 'Slug must contain at least 3 letters or digits (a-z, 0-9)' },
        ]);
      }
      const taken = await prisma.blogPost.findUnique({ where: { slug }, select: { id: true } });
      if (taken && taken.id !== ownId) throw new ConflictError('A blog with this slug already exists');
      return slug;
    }

    const base = slugify(title);
    if (base.length < MIN_SLUG_LENGTH) {
      throw new ValidationError('A slug is required', [
        { field: 'slug', message: 'A slug could not be derived from the title; enter one using a-z and 0-9' },
      ]);
    }
    for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
      const candidate = attempt === 0 ? base : `${base}-${attempt}`;
      const taken = await prisma.blogPost.findUnique({ where: { slug: candidate }, select: { id: true } });
      if (!taken || taken.id === ownId) return candidate;
    }
    throw new ConflictError('Could not find a free slug for this title; enter one manually');
  }
}

export const blogsService = new BlogsService();
