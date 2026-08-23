import { config } from '../config';
import { getVerificationEmailTemplate } from './emails/verification';
import { getPasswordResetEmailTemplate } from './emails/password-reset';

export class EmailService {
  private transporter: any = null;
  private isInitialized = false;

  private async getTransporter(): Promise<any> {
    if (this.isInitialized) return this.transporter;
    this.isInitialized = true;

    if (config.EMAIL_HOST && config.EMAIL_USER && config.EMAIL_PASSWORD) {
      try {
        // Dynamic import to avoid hard dependency error if nodemailer is not installed
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const nodemailer = require('nodemailer');
        this.transporter = nodemailer.createTransport({
          host: config.EMAIL_HOST,
          port: config.EMAIL_PORT || 587,
          secure: config.EMAIL_PORT === 465,
          auth: {
            user: config.EMAIL_USER,
            pass: config.EMAIL_PASSWORD,
          },
        });
      } catch (err) {
        console.warn('[EmailService] SMTP credentials provided but "nodemailer" module is not installed. Defaulting to development log mode.');
        this.transporter = null;
      }
    }
    return this.transporter;
  }

  /**
   * Send email verification OTP to user.
   */
  public async sendVerificationEmail(toEmail: string, otp: string): Promise<void> {
    const { subject, text, html } = getVerificationEmailTemplate(otp, 10);
    const transporter = await this.getTransporter();

    if (transporter) {
      await transporter.sendMail({
        from: config.EMAIL_FROM,
        to: toEmail,
        subject,
        text,
        html,
      });
    } else {
      // Development mode log without printing production secrets
      console.log(`[EmailService] [DEV] Verification Email queued for: ${toEmail}`);
    }
  }

  /**
   * Send password reset OTP to user.
   */
  public async sendPasswordResetEmail(toEmail: string, otp: string): Promise<void> {
    const { subject, text, html } = getPasswordResetEmailTemplate(otp, 10);
    const transporter = await this.getTransporter();

    if (transporter) {
      await transporter.sendMail({
        from: config.EMAIL_FROM,
        to: toEmail,
        subject,
        text,
        html,
      });
    } else {
      // Development mode log without printing production secrets
      console.log(`[EmailService] [DEV] Password Reset Email queued for: ${toEmail}`);
    }
  }
}

export const emailService = new EmailService();
