import nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

/**
 * NOTIFICATION SERVICE
 *
 * Handles email, SMS, and WhatsApp notifications.
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

// Email transporter (singleton)
let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  // Check for email configuration
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.log('[Email] SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS env vars.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort || '587'),
    secure: smtpPort === '465',
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  return transporter;
}

/**
 * Send email notification
 */
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  const transport = getTransporter();

  if (!transport) {
    console.log('[Email] Stub mode:', {
      to: options.to,
      subject: options.subject,
    });
    return true; // Return true in stub mode so app continues working
  }

  try {
    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
    const fromName = process.env.SMTP_FROM_NAME || 'HHOS Hotels';

    await transport.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      text: options.body,
      html: options.html || options.body.replace(/\n/g, '<br>'),
    });

    console.log('[Email] Sent successfully to:', options.to);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send:', error);
    return false;
  }
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
  return true;
};

// ==================== EMAIL TEMPLATES ====================

function generateBookingConfirmationHtml(data: BookingNotificationData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Booking Confirmed!</h1>
              <p style="color: #e0e0e0; margin: 10px 0 0 0; font-size: 16px;">${data.hotelName}</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 18px; color: #333; margin: 0 0 20px 0;">Hello <strong>${data.guestName}</strong>,</p>
              <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 30px 0;">
                Thank you for choosing ${data.hotelName}! Your booking has been confirmed.
              </p>

              <!-- Confirmation Code Box -->
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 30px;">
                <p style="color: #888; margin: 0 0 5px 0; font-size: 12px; text-transform: uppercase;">Confirmation Code</p>
                <p style="color: #333; margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 2px;">${data.confirmationCode}</p>
              </div>

              <!-- Booking Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="padding: 15px 0; border-bottom: 1px solid #eee;">
                    <table width="100%">
                      <tr>
                        <td width="50%">
                          <p style="color: #888; margin: 0 0 5px 0; font-size: 12px;">CHECK-IN</p>
                          <p style="color: #333; margin: 0; font-size: 16px; font-weight: bold;">${data.checkInDate}</p>
                          <p style="color: #888; margin: 5px 0 0 0; font-size: 12px;">From 2:00 PM</p>
                        </td>
                        <td width="50%">
                          <p style="color: #888; margin: 0 0 5px 0; font-size: 12px;">CHECK-OUT</p>
                          <p style="color: #333; margin: 0; font-size: 16px; font-weight: bold;">${data.checkOutDate}</p>
                          <p style="color: #888; margin: 5px 0 0 0; font-size: 12px;">By 12:00 PM</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px 0; border-bottom: 1px solid #eee;">
                    <p style="color: #888; margin: 0 0 5px 0; font-size: 12px;">ROOM TYPE</p>
                    <p style="color: #333; margin: 0; font-size: 16px;">${data.roomType}${data.roomNumber ? ` (Room ${data.roomNumber})` : ''}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px 0;">
                    <p style="color: #888; margin: 0 0 5px 0; font-size: 12px;">TOTAL AMOUNT</p>
                    <p style="color: #333; margin: 0; font-size: 24px; font-weight: bold;">${data.currency} ${data.totalAmount}</p>
                  </td>
                </tr>
              </table>

              <!-- Contact Info -->
              <div style="background-color: #f0f7ff; border-radius: 8px; padding: 20px; border-left: 4px solid #667eea;">
                <p style="color: #333; margin: 0 0 10px 0; font-size: 14px;"><strong>Need assistance?</strong></p>
                <p style="color: #555; margin: 0; font-size: 14px;">Contact us at: <a href="tel:${data.hotelPhone}" style="color: #667eea;">${data.hotelPhone}</a></p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center;">
              <p style="color: #888; margin: 0; font-size: 14px;">Thank you for choosing ${data.hotelName}!</p>
              <p style="color: #aaa; margin: 10px 0 0 0; font-size: 12px;">This is an automated email. Please do not reply.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function generatePaymentReceiptHtml(data: PaymentReceiptData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; text-align: center;">
              <div style="width: 60px; height: 60px; background-color: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 15px auto; line-height: 60px;">
                <span style="color: #fff; font-size: 30px;">✓</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Payment Received</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 30px 0;">
                Hello <strong>${data.guestName}</strong>, we've received your payment for your booking at ${data.hotelName}.
              </p>

              <!-- Payment Amount Box -->
              <div style="background-color: #f0fff4; border-radius: 8px; padding: 25px; text-align: center; margin-bottom: 30px; border: 2px solid #38ef7d;">
                <p style="color: #888; margin: 0 0 5px 0; font-size: 12px; text-transform: uppercase;">Amount Paid</p>
                <p style="color: #11998e; margin: 0; font-size: 36px; font-weight: bold;">${data.currency} ${data.amountPaid}</p>
                <p style="color: #888; margin: 10px 0 0 0; font-size: 14px;">via ${data.paymentMethod}</p>
              </div>

              <!-- Receipt Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                    <span style="color: #888; font-size: 14px;">Receipt Number:</span>
                    <span style="color: #333; font-size: 14px; float: right; font-weight: bold;">${data.receiptNumber}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                    <span style="color: #888; font-size: 14px;">Booking Code:</span>
                    <span style="color: #333; font-size: 14px; float: right;">${data.bookingCode}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                    <span style="color: #888; font-size: 14px;">Date:</span>
                    <span style="color: #333; font-size: 14px; float: right;">${data.paymentDate}</span>
                  </td>
                </tr>
                ${data.balanceDue > 0 ? `
                <tr>
                  <td style="padding: 12px 0;">
                    <span style="color: #888; font-size: 14px;">Outstanding Balance:</span>
                    <span style="color: #e74c3c; font-size: 14px; float: right; font-weight: bold;">${data.currency} ${data.balanceDue}</span>
                  </td>
                </tr>
                ` : `
                <tr>
                  <td style="padding: 12px 0;">
                    <span style="color: #888; font-size: 14px;">Status:</span>
                    <span style="color: #11998e; font-size: 14px; float: right; font-weight: bold;">PAID IN FULL</span>
                  </td>
                </tr>
                `}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center;">
              <p style="color: #888; margin: 0; font-size: 14px;">Thank you for your payment!</p>
              <p style="color: #aaa; margin: 10px 0 0 0; font-size: 12px;">${data.hotelName} | ${data.hotelPhone}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

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

interface PaymentReceiptData {
  guestName: string;
  guestEmail?: string;
  hotelName: string;
  hotelPhone: string;
  bookingCode: string;
  receiptNumber: string;
  amountPaid: string;
  balanceDue: number;
  paymentMethod: string;
  paymentDate: string;
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
      subject: `Booking Confirmed - ${data.hotelName} | ${data.confirmationCode}`,
      body: message,
      html: generateBookingConfirmationHtml(data),
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
 * Send payment receipt
 */
export const sendPaymentReceipt = async (data: PaymentReceiptData): Promise<void> => {
  const message = `
Hi ${data.guestName},

Payment received at ${data.hotelName}!

Receipt: ${data.receiptNumber}
Amount: ${data.currency} ${data.amountPaid}
Method: ${data.paymentMethod}
Date: ${data.paymentDate}

Booking: ${data.bookingCode}
${data.balanceDue > 0 ? `Balance Due: ${data.currency} ${data.balanceDue}` : 'Status: PAID IN FULL'}

Thank you!
  `.trim();

  if (data.guestEmail) {
    await sendEmail({
      to: data.guestEmail,
      subject: `Payment Receipt - ${data.hotelName} | ${data.receiptNumber}`,
      body: message,
      html: generatePaymentReceiptHtml(data),
    });
  }
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

  if (data.guestEmail) {
    await sendEmail({
      to: data.guestEmail,
      subject: `Check-in Tomorrow - ${data.hotelName}`,
      body: message,
    });
  }
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

  if (data.guestEmail) {
    await sendEmail({
      to: data.guestEmail,
      subject: `Payment Reminder - ${data.hotelName}`,
      body: message,
    });
  }
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
