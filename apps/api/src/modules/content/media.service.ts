import { MediaItem, Prisma } from '@prisma/client';
import { prisma } from '../../services/prisma.service';
import { NotFoundError, ValidationError } from '../../errors/app-error';
import { AdminActor, auditContentAction, changedFields } from './content.audit';
import { acceptFile, deleteStoredFiles, FileRefInput, FileView, replacedKey, toFileView } from './content.ports';
import { isYoutubeUrl, youtubeVideoId } from './content.sanitizer';
import { AdminMediaQuery, CreateMediaInput, MediaSection, MediaType, UpdateMediaInput } from './content.schemas';

interface MediaBase {
  id: string;
  title: string;
  description: string;
  section: string;
  type: string;
  /** podcast: the YouTube link. celebrity: the uploaded video's URL. wishes: null. */
  mediaUrl: string | null;
  tag: string;
  personName: string;
  background: string;
  order: number;
  createdAt: Date;
}

/** Public shape: `thumbnail` is the image URL, as on the website. */
export interface PublicMediaView extends MediaBase {
  thumbnail: string | null;
}

export interface AdminMediaView extends MediaBase {
  /** The uploaded video of a celebrity item; null for a podcast (YouTube) or wishes item. */
  media: FileView | null;
  thumbnail: FileView | null;
  isActive: boolean;
  createdById: string | null;
  updatedById: string | null;
  updatedAt: Date;
}

export interface MediaFileState {
  type: MediaType;
  mediaUrl: string | null;
  mediaKey: string | null;
  thumbnailUrl: string | null;
  thumbnailKey: string | null;
}

interface ExistingMediaState {
  section: string;
  personName: string;
  mediaUrl: string | null;
  mediaKey: string | null;
  thumbnailUrl: string | null;
  thumbnailKey: string | null;
}

interface MediaFileInput {
  mediaUrl?: string | null;
  media?: FileRefInput | null;
  thumbnail?: FileRefInput | null;
  personName?: string;
}

const DISPLAY_ORDER: Prisma.MediaItemOrderByWithRelationInput[] = [{ order: 'asc' }, { createdAt: 'desc' }];
const YOUTUBE_THUMBNAIL_PREFIX = 'https://img.youtube.com/vi/';

function fail(field: string, message: string): never {
  throw new ValidationError(message, [{ field, message }]);
}

export function youtubeThumbnailUrl(mediaUrl: string): string | null {
  const id = youtubeVideoId(mediaUrl);
  return id ? `${YOUTUBE_THUMBNAIL_PREFIX}${id}/hqdefault.jpg` : null;
}

/**
 * Applies the website's per-section rules and returns the media and thumbnail to store.
 *
 *   podcast    video; a YouTube link in mediaUrl, never an uploaded file; the thumbnail is optional
 *              and defaults to YouTube's own thumbnail of the video.
 *   celebrity  video; an uploaded video (`media`) and an uploaded thumbnail are both required.
 *   wishes     image; the uploaded image is stored as the thumbnail; personName is required.
 *
 * On create (`existing` null) and when the section changes, the section's required fields must be
 * present. On an ordinary update only the fields that were sent are checked, so a migrated record
 * that predates a rule can still be edited or toggled.
 */
export function resolveMediaFiles(section: MediaSection, input: MediaFileInput, existing: ExistingMediaState | null): MediaFileState {
  const fresh = existing === null || existing.section !== section;
  // Files of a previous section are not carried into a new one.
  const current = fresh ? null : existing;

  if (section === 'podcast') {
    if (input.media) fail('media', 'Podcast only supports Youtube URL');
    if (input.mediaUrl === null) fail('mediaUrl', 'Youtube URL is required');
    if (input.mediaUrl !== undefined && !isYoutubeUrl(input.mediaUrl)) fail('mediaUrl', 'Only Youtube URL allowed');
    const mediaUrl = input.mediaUrl ?? current?.mediaUrl ?? null;
    if (!mediaUrl) fail('mediaUrl', 'Youtube URL is required');

    const thumbnail = acceptFile(input.thumbnail, 'media', 'thumbnail');
    if (thumbnail) {
      return { type: 'video', mediaUrl, mediaKey: null, thumbnailUrl: thumbnail.url, thumbnailKey: thumbnail.key };
    }
    // An uploaded thumbnail is kept until the admin replaces or removes it; otherwise the
    // thumbnail follows the video.
    const keepsUpload = thumbnail === undefined && Boolean(current?.thumbnailKey) && Boolean(current?.thumbnailUrl);
    if (keepsUpload && current) {
      return { type: 'video', mediaUrl, mediaKey: null, thumbnailUrl: current.thumbnailUrl, thumbnailKey: current.thumbnailKey };
    }
    // A link without a video id (a channel, a playlist) has no YouTube thumbnail: whatever is
    // stored stays, unless the admin asked for the thumbnail to be removed.
    const derived = youtubeThumbnailUrl(mediaUrl) ?? (thumbnail === undefined ? current?.thumbnailUrl ?? null : null);
    return { type: 'video', mediaUrl, mediaKey: null, thumbnailUrl: derived, thumbnailKey: null };
  }

  if (section === 'celebrity') {
    if (typeof input.mediaUrl === 'string') fail('mediaUrl', 'Celebrity media is an uploaded video; send it as "media"');
    if (input.media === null) fail('media', 'Video upload is required');
    if (input.thumbnail === null) fail('thumbnail', 'Thumbnail is required');
    const media = acceptFile(input.media, 'media-video', 'media');
    const thumbnail = acceptFile(input.thumbnail, 'media', 'thumbnail');

    if (fresh && !media) fail('media', 'Video upload is required');
    if (fresh && !thumbnail) fail('thumbnail', 'Thumbnail is required');

    return {
      type: 'video',
      mediaUrl: media ? media.url : current?.mediaUrl ?? null,
      mediaKey: media ? media.key : current?.mediaKey ?? null,
      thumbnailUrl: thumbnail ? thumbnail.url : current?.thumbnailUrl ?? null,
      thumbnailKey: thumbnail ? thumbnail.key : current?.thumbnailKey ?? null,
    };
  }

  // wishes
  if (input.media) fail('media', 'Wishes take an image; send it as "thumbnail"');
  if (typeof input.mediaUrl === 'string') fail('mediaUrl', 'Wishes take an image; send it as "thumbnail"');
  if (input.thumbnail === null) fail('thumbnail', 'Image is required for wishes');
  const image = acceptFile(input.thumbnail, 'media', 'thumbnail');
  if (fresh && !image) fail('thumbnail', 'Image is required for wishes');

  const personName = input.personName ?? existing?.personName ?? '';
  if ((fresh || input.personName !== undefined) && personName.length === 0) fail('personName', 'Person name is required');

  return {
    type: 'image',
    mediaUrl: null,
    mediaKey: null,
    thumbnailUrl: image ? image.url : current?.thumbnailUrl ?? null,
    thumbnailKey: image ? image.key : current?.thumbnailKey ?? null,
  };
}

function base(item: MediaItem): MediaBase {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    section: item.section,
    type: item.type,
    mediaUrl: item.mediaUrl,
    tag: item.tag,
    personName: item.personName,
    background: item.background,
    order: item.order,
    createdAt: item.createdAt,
  };
}

function toPublicView(item: MediaItem): PublicMediaView {
  return { ...base(item), thumbnail: item.thumbnailUrl };
}

function toAdminView(item: MediaItem): AdminMediaView {
  return {
    ...base(item),
    media: item.mediaKey ? toFileView(item.mediaUrl, item.mediaKey) : null,
    thumbnail: toFileView(item.thumbnailUrl, item.thumbnailKey),
    isActive: item.isActive,
    createdById: item.createdById,
    updatedById: item.updatedById,
    updatedAt: item.updatedAt,
  };
}

export class MediaService {
  // -------------------------------------------------------------------------
  // Public: active items only
  // -------------------------------------------------------------------------

  public async listPublic(section?: MediaSection): Promise<PublicMediaView[]> {
    const where: Prisma.MediaItemWhereInput = { isActive: true };
    if (section) where.section = section;
    const items = await prisma.mediaItem.findMany({ where, orderBy: DISPLAY_ORDER });
    return items.map(toPublicView);
  }

  public async getPublicById(id: string): Promise<PublicMediaView> {
    const item = await prisma.mediaItem.findFirst({ where: { id, isActive: true } });
    if (!item) throw new NotFoundError('Media not found');
    return toPublicView(item);
  }

  // -------------------------------------------------------------------------
  // Admin
  // -------------------------------------------------------------------------

  public async list(query: AdminMediaQuery): Promise<AdminMediaView[]> {
    const where: Prisma.MediaItemWhereInput = {};
    if (query.section) where.section = query.section;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    const items = await prisma.mediaItem.findMany({ where, orderBy: DISPLAY_ORDER });
    return items.map(toAdminView);
  }

  public async getById(id: string): Promise<AdminMediaView> {
    return toAdminView(await this.requireMedia(id));
  }

  public async create(input: CreateMediaInput, actor: AdminActor): Promise<AdminMediaView> {
    const files = resolveMediaFiles(input.section, input, null);
    const item = await prisma.mediaItem.create({
      data: {
        title: input.title,
        description: input.description,
        section: input.section,
        tag: input.tag,
        personName: input.personName,
        background: input.background,
        isActive: input.isActive,
        order: input.order,
        ...files,
        createdById: actor.id,
      },
    });
    await auditContentAction(actor, 'MEDIA_CREATE', `MediaItem:${item.id}`, `${item.section} item`);
    return toAdminView(item);
  }

  public async update(id: string, input: UpdateMediaInput, actor: AdminActor): Promise<AdminMediaView> {
    const existing = await this.requireMedia(id);
    const section = input.section ?? (existing.section as MediaSection);
    const files = resolveMediaFiles(section, input, existing);

    const data: Prisma.MediaItemUpdateInput = { ...files, section, updatedById: actor.id };
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.tag !== undefined) data.tag = input.tag;
    if (input.personName !== undefined) data.personName = input.personName;
    if (input.background !== undefined) data.background = input.background;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.order !== undefined) data.order = input.order;

    const item = await prisma.mediaItem.update({ where: { id }, data });
    await deleteStoredFiles([
      replacedKey(existing.mediaKey, item.mediaKey),
      replacedKey(existing.thumbnailKey, item.thumbnailKey),
    ]);
    await auditContentAction(actor, 'MEDIA_UPDATE', `MediaItem:${id}`, changedFields(input));
    return toAdminView(item);
  }

  public async toggle(id: string, actor: AdminActor): Promise<AdminMediaView> {
    const existing = await this.requireMedia(id);
    const item = await prisma.mediaItem.update({
      where: { id },
      data: { isActive: !existing.isActive, updatedById: actor.id },
    });
    await auditContentAction(actor, 'MEDIA_TOGGLE', `MediaItem:${id}`, item.isActive ? 'Activated' : 'Deactivated');
    return toAdminView(item);
  }

  public async remove(id: string, actor: AdminActor): Promise<void> {
    const existing = await this.requireMedia(id);
    await prisma.mediaItem.delete({ where: { id } });
    await deleteStoredFiles([existing.mediaKey, existing.thumbnailKey]);
    await auditContentAction(actor, 'MEDIA_DELETE', `MediaItem:${id}`, `${existing.section} item`);
  }

  private async requireMedia(id: string): Promise<MediaItem> {
    const item = await prisma.mediaItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Media not found');
    return item;
  }
}

export const mediaService = new MediaService();
