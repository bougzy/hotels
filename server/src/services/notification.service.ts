/**
 * NOTIFICATION SERVICE
 *
 * Handles email, SMS, and WhatsApp notifications.
 * Currently stubbed - integrate with providers when ready.
 *
 * REVENUE IMPACT:
 * - Booking confirmations reduce no-shows
 * - Check-in reminders improve guest experience
 * - Payment reminders reduce outstanding balances
 */

interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

interface SmsOptions {
  to: string;
  message: string;
}

interface WhatsAppOptions {
  to: string;
  message: string;
  templateName?: string;
  templateParams?: Record<string, string>;
}

/**
 * Send email notification
 * TODO: Integrate with SendGrid, Mailgun, or AWS SES
 */
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  console.log('[Notification] Email stub:', {
    to: options.to,
    subject: options.subject,
  });

  // In production, implement actual email sending:
  // Example with nodemailer:
  // const transporter = nodemailer.createTransport({...});
  // await transporter.sendMail({
  //   from: config.email.from,
  //   to: options.to,
  //   subject: options.subject,
  //   text: options.body,
  //   html: options.html,
  // });

  return true;
};

/**
 * Send SMS notification
 * TODO: Integrate with Twilio, Africa's Talking, or Termii
 */
export const sendSms = async (options: SmsOptions): Promise<boolean> => {
  console.log('[Notification] SMS stub:', {
    to: options.to,
    message: options.message.substring(0, 50) + '...',
  });

  // In production, implement actual SMS sending:
  // Example with Twilio:
  // const client = twilio(accountSid, authToken);
  // await client.messages.create({
  //   body: options.message,
  //   from: twilioNumber,
  //   to: options.to,
  // });

  return true;
};

/**
 * Send WhatsApp notification
 * TODO: Integrate with WhatsApp Business API or Twilio WhatsApp
 */
export const sendWhatsApp = async (options: WhatsAppOptions): Promise<boolean> => {
  console.log('[Notification] WhatsApp stub:', {
    to: options.to,
    template: options.templateName,
  });

  // In production, implement actual WhatsApp sending:
  // This is CRITICAL for African market where WhatsApp dominates

  return true;
};

// ==================== BOOKING NOTIFICATIONS ====================

interface BookingNotificationData {
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  hotelName: string;
  hotelPhone: string;
  bookingCode: string;
  confirmationCode: string;
  roomType: string;
  roomNumber?: string;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: string;
  currency: string;
}

/**
 * Send booking confirmation
 */
export const sendBookingConfirmation = async (
  data: BookingNotificationData
): Promise<void> => {
  const message = `
Hello ${data.guestName}!

Your booking at ${data.hotelName} is confirmed!

Confirmation Code: ${data.confirmationCode}
Check-in: ${data.checkInDate}
Check-out: ${data.checkOutDate}
Room: ${data.roomType}
Total: ${data.currency} ${data.totalAmount}

For assistance, call ${data.hotelPhone}

Thank you for choosing ${data.hotelName}!
  `.trim();

  // Send via preferred channel
  await sendSms({ to: data.guestPhone, message });

  if (data.guestEmail) {
    await sendEmail({
      to: data.guestEmail,
      subject: `Booking Confirmed - ${data.hotelName}`,
      body: message,
    });
  }

  // WhatsApp is preferred in Africa
  await sendWhatsApp({
    to: data.guestPhone,
    message,
    templateName: 'booking_confirmation',
    templateParams: {
      guest_name: data.guestName,
      hotel_name: data.hotelName,
      confirmation_code: data.confirmationCode,
      check_in: data.checkInDate,
    },
  });
};

/**
 * Send check-in reminder (day before)
 */
export const sendCheckInReminder = async (
  data: BookingNotificationData
): Promise<void> => {
  const message = `
Hi ${data.guestName}!

Reminder: Your stay at ${data.hotelName} starts tomorrow!

Check-in time: From 2:00 PM
Confirmation: ${data.confirmationCode}

We look forward to welcoming you!
  `.trim();

  await sendSms({ to: data.guestPhone, message });
  await sendWhatsApp({ to: data.guestPhone, message });
};

/**
 * Send payment reminder
 */
export const sendPaymentReminder = async (
  data: BookingNotificationData & { balanceDue: string }
): Promise<void> => {
  const message = `
Hi ${data.guestName},

This is a reminder that you have an outstanding balance of ${data.currency} ${data.balanceDue} for your booking at ${data.hotelName}.

Booking: ${data.confirmationCode}
Check-in: ${data.checkInDate}

Please ensure payment is made before check-in.

Thank you!
  `.trim();

  await sendSms({ to: data.guestPhone, message });
};

/**
 * Send checkout summary
 */
export const sendCheckoutSummary = async (
  data: BookingNotificationData & {
    totalPaid: string;
    stayDuration: number;
  }
): Promise<void> => {
  const message = `
Thank you for staying at ${data.hotelName}, ${data.guestName}!

Your stay summary:
- ${data.stayDuration} nights
- Room: ${data.roomType}
- Total paid: ${data.currency} ${data.totalPaid}

We hope to see you again soon!

Please rate your stay: [link]
  `.trim();

  await sendSms({ to: data.guestPhone, message });

  if (data.guestEmail) {
    await sendEmail({
      to: data.guestEmail,
      subject: `Thank you for staying at ${data.hotelName}`,
      body: message,
    });
  }
};
