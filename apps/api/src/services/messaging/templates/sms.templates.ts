/**
 * SMS texts registered with DLT for sender "ASTRO SUSHIL PRIVATE LIMITED".
 *
 * COPIED CHARACTER FOR CHARACTER from the website backend (src/service/otp.js and
 * src/utils/smsTemplates.js), including its double spaces, missing spaces and the
 * "Thank for ordering" wording. DLT rejects any message whose fixed text differs
 * from the registered template, so DO NOT "fix" anything here. The only variable
 * parts are the {#var#} placeholders, filled in order.
 *
 * The website's code holds no DLT template ids (SMSLane matches on the text), so
 * there are none to configure here.
 */

const VAR = '{#var#}';

const fillTemplate = (template: string, values: Array<string | number>): string =>
  // A function replacer keeps "$" sequences in customer data literal.
  values.reduce<string>((msg, value) => msg.replace(VAR, () => String(value)), template);

export const SMS_TEMPLATE_TEXT = {
  OTP_SIGNUP: `Hello {#var#}, Your Signup OTP is {#var#}. ASTRO SUSHIL PRIVATE LIMITED`,
  OTP_LOGIN: `Hello {#var#}, Your login OTP is {#var#}. ASTRO SUSHIL PRIVATE LIMITED`,
  OTP_RESET: `Hello {#var#}, Your password reset OTP is {#var#}. ASTRO SUSHIL PRIVATE LIMITED`,
  BOOKING_CONFIRMED: `Hello {#var#}, Your consultation has been booked. We look forward to connecting with you. Service Name: {#var#} Date: {#var#} Service Mode: {#var#} Time: {#var#} Amount: {#var#} Thank you for choosing ASTRO SUSHIL PRIVATE LIMITED`,
  BOOKING_RESCHEDULED: `Hello  {#var#}, Your Consultation has been rescheduled. We look forward to connecting with you. Service Name:  {#var#} Date:  {#var#} Service Mode:  {#var#} Time:  {#var#} Amount: ₹ {#var#} Thank you for choosing ASTRO SUSHIL PRIVATE LIMITED`,
  ORDER_UPDATE: `Hello {#var#}, Your order update is here Order ID-{#var#} Product Name-{#var#}Order Status-{#var#} Thank for ordering. ASTRO SUSHIL PRIVATE LIMITED`,
  REPORT_PURCHASE: `Hello {#var#}Thank you for purchasing your Kundali Report with us 🙏 We have successfully received your request. Your detailed Kundali report is currently being prepared and will be delivered to you within the next 48 hours. If you have any questions in the meantime, feel free to reach out to us. We appreciate your trust!  ✨. ASTRO SUSHIL PRIVATE LIMITED`,
} as const;

export type OtpSmsPurpose = 'signup' | 'login' | 'reset';

export interface BookingSmsData {
  userName: string;
  consultationTitle: string;
  date: string;
  mode: string;
  slot: string;
  amount: string | number;
}

export const smsTemplates = {
  /** Two variables: name, then OTP. Unknown purposes fall back to the login text, as on the website. */
  OTP: ({ purpose, name, otp }: { purpose: OtpSmsPurpose; name: string; otp: string }): string => {
    const template =
      purpose === 'signup'
        ? SMS_TEMPLATE_TEXT.OTP_SIGNUP
        : purpose === 'reset'
          ? SMS_TEMPLATE_TEXT.OTP_RESET
          : SMS_TEMPLATE_TEXT.OTP_LOGIN;
    return fillTemplate(template, [name, otp]);
  },

  BOOKING_CONFIRMED: ({ userName, consultationTitle, date, mode, slot, amount }: BookingSmsData): string =>
    fillTemplate(SMS_TEMPLATE_TEXT.BOOKING_CONFIRMED, [userName, consultationTitle, date, mode, slot, amount]),

  BOOKING_RESCHEDULED: ({ userName, consultationTitle, date, mode, slot, amount }: BookingSmsData): string =>
    fillTemplate(SMS_TEMPLATE_TEXT.BOOKING_RESCHEDULED, [userName, consultationTitle, date, mode, slot, amount]),

  ORDER_UPDATE: ({
    userName,
    orderId,
    productName,
    orderStatus,
  }: {
    userName: string;
    orderId: string;
    productName: string;
    orderStatus: string;
  }): string => fillTemplate(SMS_TEMPLATE_TEXT.ORDER_UPDATE, [userName, orderId, productName, orderStatus]),

  REPORT_PURCHASE: ({ userName }: { userName: string }): string =>
    fillTemplate(SMS_TEMPLATE_TEXT.REPORT_PURCHASE, [userName]),
};
