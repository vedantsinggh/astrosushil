export function getPasswordResetEmailTemplate(otp: string, expiresMinutes: number = 10): { subject: string; text: string; html: string } {
  const subject = 'Reset your Astro Sushil password';
  const text = `A password reset was requested for your Astro Sushil account.\n\nYour reset code is: ${otp}\n\nThis code will expire in ${expiresMinutes} minutes.\n\nIf you did not request a password reset, please ignore this email and your password will remain unchanged.`;
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #121440; padding: 40px 20px; color: #ffffff;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 32px; color: #121440; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #121440; margin: 0; font-size: 26px; font-weight: bold; letter-spacing: 0.5px;">Astro Sushil</h2>
          <p style="color: #61568C; font-size: 13px; margin-top: 4px;">Your journey, written in the stars.</p>
        </div>
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin-bottom: 24px;" />
        <h3 style="color: #121440; font-size: 18px; margin-bottom: 12px;">Password Reset Request</h3>
        <p style="font-size: 14px; color: #4A5568; line-height: 1.5; margin-bottom: 24px;">
          We received a request to reset the password for your Astro Sushil account. Use the 6-digit reset code below to proceed:
        </p>
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #121440; background-color: #F7FAFC; border: 2px dashed #824661; border-radius: 12px; padding: 12px 24px;">
            ${otp}
          </span>
        </div>
        <p style="font-size: 12px; color: #718096; text-align: center; margin-bottom: 24px;">
          This code is valid for <strong>${expiresMinutes} minutes</strong>. If you did not request a password reset, you can safely ignore this message.
        </p>
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin-bottom: 20px;" />
        <p style="font-size: 11px; color: #A0AEC0; text-align: center; margin: 0;">
          © ${new Date().getFullYear()} Astro Sushil. All rights reserved.
        </p>
      </div>
    </div>
  `;
  return { subject, text, html };
}
