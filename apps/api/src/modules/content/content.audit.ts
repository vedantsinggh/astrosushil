import { adminService } from '../admin/admin.service';

/** The staff member performing an admin action, as needed for the audit log. */
export interface AdminActor {
  id: string;
  email: string;
  ipAddress?: string;
  userAgent?: string;
}

export type ContentAuditAction =
  | 'BANNER_CREATE'
  | 'BANNER_UPDATE'
  | 'BANNER_TOGGLE'
  | 'BANNER_DELETE'
  | 'BLOG_CREATE'
  | 'BLOG_UPDATE'
  | 'BLOG_DELETE'
  | 'FAQ_CREATE'
  | 'FAQ_UPDATE'
  | 'FAQ_DELETE'
  | 'TESTIMONIAL_CREATE'
  | 'TESTIMONIAL_UPDATE'
  | 'TESTIMONIAL_TOGGLE'
  | 'TESTIMONIAL_DELETE'
  | 'MEDIA_CREATE'
  | 'MEDIA_UPDATE'
  | 'MEDIA_TOGGLE'
  | 'MEDIA_DELETE'
  | 'CONTACT_INQUIRY_REMARKS_UPDATE'
  | 'CONTACT_INQUIRY_DELETE'
  | 'SEO_CREATE'
  | 'SEO_UPDATE'
  | 'SEO_DELETE'
  | 'SITE_SETTINGS_UPDATE';

/**
 * Writes one audit-log entry for a state-changing content action (AGENTS.md section 6.3).
 * `details` names what changed (field names, a title or slug); it never carries the personal
 * data of a contact inquiry or the body of a rich-text field.
 */
export async function auditContentAction(
  actor: AdminActor,
  action: ContentAuditAction,
  resource: string,
  details?: string
): Promise<void> {
  await adminService.logAction({
    adminId: actor.id,
    adminEmail: actor.email,
    action,
    resource,
    details,
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });
}

/** "title, order, image" for an update payload: the keys that were sent, without their values. */
export function changedFields(input: object): string {
  const keys = Object.entries(input)
    .filter(([, value]) => value !== undefined)
    .map(([key]) => key);
  return keys.length > 0 ? `Changed: ${keys.join(', ')}` : 'No fields changed';
}
