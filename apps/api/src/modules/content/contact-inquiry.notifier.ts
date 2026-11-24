import { NotificationEvents, notificationEvents } from '../notifications/notification.events';
import { ContactInquiryNotifier, setContactInquiryNotifier } from './content.ports';

/**
 * The real `ContactInquiryNotifier`: the website's two e-mails for a contact form inquiry,
 * CONTACT_ADMIN to the admin address (ADMIN_EMAIL) always and CONTACT_USER to the sender when an
 * e-mail address was given.
 *
 * The messages are put in the messaging outbox (`notificationEvents.contactInquiryReceived`),
 * keyed by the inquiry id: delivery, retries and "at most once per inquiry" are the outbox's job,
 * and the e-mail provider is whichever one the messaging module has configured.
 */
export function createContactInquiryNotifier(events: NotificationEvents = notificationEvents): ContactInquiryNotifier {
  return {
    async notifyInquiryReceived(inquiry): Promise<void> {
      await events.contactInquiryReceived({
        inquiryId: inquiry.id,
        name: inquiry.name,
        email: inquiry.email,
        phone: inquiry.phone,
        subject: inquiry.subject,
        message: inquiry.message,
      });
    },
  };
}

/** Start-up registration (API process, where the contact form is served). */
export function registerContactInquiryNotifier(events: NotificationEvents = notificationEvents): void {
  setContactInquiryNotifier(createContactInquiryNotifier(events));
}
