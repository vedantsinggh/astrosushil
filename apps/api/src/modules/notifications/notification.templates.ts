import { NotificationType } from './notification.types';

export interface RenderedTemplate {
  title: string;
  body: string;
  emailSubject: string;
  emailHtml: string;
  emailText: string;
  route?: string;
}

export function renderNotificationTemplate(
  type: NotificationType,
  data: Record<string, any> = {}
): RenderedTemplate {
  const userName = data.userName || 'Valued User';

  switch (type) {
    case 'REPORT_READY': {
      const reportName = data.reportName || 'Astrology Intelligence Report';
      const reportId = data.reportId || '';
      return {
        title: '✨ Your Career Report is Ready!',
        body: `Your detailed ${reportName} has been calculated and compiled. Tap to view your report.`,
        emailSubject: `✨ Your Astro Sushil ${reportName} is Ready`,
        emailText: `Hello ${userName},\n\nYour ${reportName} is now ready to view in the Astro Sushil app.\n\nThank you for choosing Astro Sushil.`,
        emailHtml: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0F172A; color: #F8FAFC; border-radius: 8px;">
            <h2 style="color: #F59E0B; margin-top: 0;">✨ Your Report is Ready</h2>
            <p>Hello <strong>${userName}</strong>,</p>
            <p>Your comprehensive <strong>${reportName}</strong> has been generated and compiled with full astronomical precision.</p>
            <div style="margin: 25px 0;">
              <a href="https://astrosushil.com/reports/${reportId}" style="background: #F59E0B; color: #0F172A; font-weight: bold; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Career Report</a>
            </div>
            <p style="font-size: 12px; color: #94A3B8;">Astro Sushil Platform — Deterministic Vedic Astrology & Nadi Intelligence</p>
          </div>
        `,
        route: 'OPEN_REPORT',
      };
    }

    case 'PAYMENT_SUCCESS': {
      const amountRupees = data.amountRupees || '0';
      const orderId = data.orderId || '';
      return {
        title: '💳 Payment Verified Successfully',
        body: `Your payment of ₹${amountRupees} for ${data.reportName || 'Report Access'} was verified. Order #${orderId.substring(0, 8)}.`,
        emailSubject: `💳 Payment Confirmation - Astro Sushil Order #${orderId.substring(0, 8)}`,
        emailText: `Hello ${userName},\n\nWe have received your payment of ₹${amountRupees}.\nOrder ID: ${orderId}\n\nThank you!`,
        emailHtml: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0F172A; color: #F8FAFC; border-radius: 8px;">
            <h2 style="color: #10B981; margin-top: 0;">💳 Payment Confirmation</h2>
            <p>Hello <strong>${userName}</strong>,</p>
            <p>Your payment of <strong>₹${amountRupees}</strong> has been successfully processed and verified.</p>
            <p><strong>Order ID:</strong> ${orderId}</p>
            <p style="font-size: 12px; color: #94A3B8; margin-top: 30px;">Astro Sushil Billing System</p>
          </div>
        `,
        route: 'OPEN_PAYMENTS',
      };
    }

    case 'SECURITY_ALERT': {
      const eventDetails = data.eventDetails || 'Account security event detected.';
      return {
        title: '🔒 Security Alert',
        body: eventDetails,
        emailSubject: '🔒 Security Alert - Astro Sushil Account',
        emailText: `Hello ${userName},\n\nSecurity Notice: ${eventDetails}\n\nIf you did not initiate this, please secure your account.`,
        emailHtml: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0F172A; color: #F8FAFC; border-radius: 8px;">
            <h2 style="color: #EF4444; margin-top: 0;">🔒 Account Security Notice</h2>
            <p>Hello <strong>${userName}</strong>,</p>
            <p>${eventDetails}</p>
            <p style="font-size: 12px; color: #94A3B8;">Astro Sushil Security Team</p>
          </div>
        `,
        route: 'OPEN_SETTINGS',
      };
    }

    case 'ASTROLOGY_REMINDER': {
      const topic = data.topic || 'Daily planetary transit & Gochar insights are ready.';
      return {
        title: '🌟 Astrology Insight Reminder',
        body: topic,
        emailSubject: '🌟 Astro Sushil - Daily Insight Reminder',
        emailText: `Hello ${userName},\n\n${topic}\n\nCheck your active birth profile in the app.`,
        emailHtml: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0F172A; color: #F8FAFC; border-radius: 8px;">
            <h2 style="color: #3B82F6; margin-top: 0;">🌟 Planetary Transit Insight</h2>
            <p>Hello <strong>${userName}</strong>,</p>
            <p>${topic}</p>
          </div>
        `,
        route: 'OPEN_BIRTH_PROFILE',
      };
    }

    case 'WELCOME_EMAIL': {
      return {
        title: '✨ Welcome to Astro Sushil',
        body: 'Welcome to Astro Sushil! Your account is active.',
        emailSubject: '✨ Welcome to Astro Sushil - Vedic Astrology & Career Intelligence',
        emailText: `Hello ${userName},\n\nWelcome to Astro Sushil! Start by creating your Birth Profile to receive accurate planetary calculations.`,
        emailHtml: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0F172A; color: #F8FAFC; border-radius: 8px;">
            <h2 style="color: #F59E0B; margin-top: 0;">✨ Welcome to Astro Sushil</h2>
            <p>Hello <strong>${userName}</strong>,</p>
            <p>We are excited to have you on board! Create your birth profile now for deterministic Kundli & Nadi intelligence.</p>
          </div>
        `,
        route: 'OPEN_HOME',
      };
    }

    case 'PASSWORD_RESET': {
      const otp = data.otp || '';
      return {
        title: '🔑 Password Reset Requested',
        body: `Use code ${otp} to reset your password. Code expires in 10 minutes.`,
        emailSubject: '🔑 Password Reset Verification Code - Astro Sushil',
        emailText: `Hello ${userName},\n\nYour password reset OTP code is: ${otp}\nThis code expires in 10 minutes.`,
        emailHtml: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0F172A; color: #F8FAFC; border-radius: 8px;">
            <h2 style="color: #F59E0B; margin-top: 0;">🔑 Password Reset Code</h2>
            <p>Hello <strong>${userName}</strong>,</p>
            <p>Use the 6-digit code below to reset your password:</p>
            <div style="background: #1E293B; border: 1px solid #334155; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #F59E0B; border-radius: 6px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="font-size: 12px; color: #94A3B8;">Code valid for 10 minutes. If you did not request a reset, please ignore this email.</p>
          </div>
        `,
        route: 'OPEN_LOGIN',
      };
    }

    case 'BOOKING_CONFIRMED': {
      const title = data.consultationTitle || 'Consultation with Astro Sushil';
      const date = data.date || '';
      const time = data.startTime || '';
      const mode = data.mode || 'Audio';
      const meetingLink = data.meetingLink || '';
      return {
        title: `🗓️ Consultation Confirmed: ${title}`,
        body: `Your appointment is confirmed for ${date} at ${time} (${mode}). Tap for details.`,
        emailSubject: `🗓️ Appointment Confirmed: ${title} on ${date}`,
        emailText: `Hello ${userName},\n\nYour consultation "${title}" has been confirmed for ${date} at ${time} IST (${mode}).\n${meetingLink ? `Meeting link: ${meetingLink}\n` : ''}\nThank you for choosing Astro Sushil.`,
        emailHtml: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0F172A; color: #F8FAFC; border-radius: 8px;">
            <h2 style="color: #10B981; margin-top: 0;">🗓️ Consultation Confirmed</h2>
            <p>Hello <strong>${userName}</strong>,</p>
            <p>Your session with <strong>Astro Sushil</strong> has been confirmed.</p>
            <div style="background: #1E293B; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0 0 8px 0;"><strong>Service:</strong> ${title}</p>
              <p style="margin: 0 0 8px 0;"><strong>Date:</strong> ${date}</p>
              <p style="margin: 0 0 8px 0;"><strong>Time:</strong> ${time} IST</p>
              <p style="margin: 0;"><strong>Mode:</strong> ${mode}</p>
            </div>
            ${meetingLink ? `<p><a href="${meetingLink}" style="background: #10B981; color: #0F172A; font-weight: bold; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Join Consultation</a></p>` : ''}
            <p style="font-size: 12px; color: #94A3B8;">Astro Sushil Platform — Dedicated Astrological Guidance</p>
          </div>
        `,
        route: 'OPEN_CONSULTATIONS',
      };
    }

    case 'BOOKING_RESCHEDULED': {
      const title = data.consultationTitle || 'Consultation with Astro Sushil';
      const date = data.date || '';
      const time = data.startTime || '';
      return {
        title: `🔄 Consultation Rescheduled: ${title}`,
        body: `Your appointment has been rescheduled to ${date} at ${time} IST.`,
        emailSubject: `🔄 Consultation Rescheduled: ${title}`,
        emailText: `Hello ${userName},\n\nYour appointment "${title}" has been rescheduled to ${date} at ${time} IST.\n\nThank you for choosing Astro Sushil.`,
        emailHtml: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0F172A; color: #F8FAFC; border-radius: 8px;">
            <h2 style="color: #F59E0B; margin-top: 0;">🔄 Consultation Rescheduled</h2>
            <p>Hello <strong>${userName}</strong>,</p>
            <p>Your session has been rescheduled to <strong>${date}</strong> at <strong>${time} IST</strong>.</p>
          </div>
        `,
        route: 'OPEN_CONSULTATIONS',
      };
    }

    case 'BOOKING_CANCELLED': {
      const title = data.consultationTitle || 'Consultation with Astro Sushil';
      const reason = data.reason || 'Requested by user or administrator';
      return {
        title: `❌ Consultation Cancelled: ${title}`,
        body: `Your appointment has been cancelled. Reason: ${reason}`,
        emailSubject: `❌ Consultation Cancelled: ${title}`,
        emailText: `Hello ${userName},\n\nYour appointment "${title}" has been cancelled.\nReason: ${reason}`,
        emailHtml: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0F172A; color: #F8FAFC; border-radius: 8px;">
            <h2 style="color: #EF4444; margin-top: 0;">❌ Consultation Cancelled</h2>
            <p>Hello <strong>${userName}</strong>,</p>
            <p>Your session "${title}" has been cancelled. ${reason ? `Reason: ${reason}` : ''}</p>
          </div>
        `,
        route: 'OPEN_CONSULTATIONS',
      };
    }

    case 'CONSULTATION_REMINDER': {
      const title = data.consultationTitle || 'Consultation with Astro Sushil';
      const time = data.startTime || '';
      return {
        title: `⏰ Upcoming Consultation Reminder`,
        body: `Your session "${title}" starts in 30 minutes at ${time} IST.`,
        emailSubject: `⏰ Reminder: Upcoming Consultation in 30 Minutes`,
        emailText: `Hello ${userName},\n\nReminder that your session "${title}" starts in 30 minutes at ${time} IST.`,
        emailHtml: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0F172A; color: #F8FAFC; border-radius: 8px;">
            <h2 style="color: #38BDF8; margin-top: 0;">⏰ Upcoming Session Reminder</h2>
            <p>Hello <strong>${userName}</strong>,</p>
            <p>Your consultation with <strong>Astro Sushil</strong> starts soon at <strong>${time} IST</strong>.</p>
          </div>
        `,
        route: 'OPEN_CONSULTATIONS',
      };
    }

    case 'PROMOTIONAL':
    case 'SYSTEM':
    default: {
      const title = data.title || 'Notification from Astro Sushil';
      const body = data.body || 'You have a new update in the Astro Sushil app.';
      return {
        title,
        body,
        emailSubject: title,
        emailText: `Hello ${userName},\n\n${body}`,
        emailHtml: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0F172A; color: #F8FAFC; border-radius: 8px;">
            <h2 style="color: #F59E0B; margin-top: 0;">${title}</h2>
            <p>Hello <strong>${userName}</strong>,</p>
            <p>${body}</p>
          </div>
        `,
        route: data.route || 'OPEN_HOME',
      };
    }
  }
}
