import { Resend } from 'resend';

// Default sender. In development / testing on Resend free tier, onboarding@resend.dev is used
// until a custom domain (e.g. sarandasafariresort.com) is verified on resend.com.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Saranda Safari Resort <onboarding@resend.dev>';
const RESORT_PHONE = '9899373222';
const RESORT_LOCATION = 'Village Nimture, P.O. Bolani, Keonjhar, Odisha (Estd. 1998)';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function formatInr(paise) {
  const rupees = Math.round((paise || 0) / 100);
  return `₹${rupees.toLocaleString('en-IN')}`;
}

function formatDate(d) {
  if (!d) return '';
  const dateObj = new Date(d);
  return dateObj.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * 1. Send 2-Hour Reservation Hold Email (Pending Payment)
 */
export async function sendBookingHoldEmail(booking) {
  const resend = getResendClient();
  const recipientEmail = booking.guest?.email;

  if (!resend) {
    console.log(`[EmailService]: RESEND_API_KEY not configured. Skipping hold email for ${booking.bookingReference}.`);
    return { success: false, reason: 'unconfigured' };
  }

  if (!recipientEmail) {
    console.log(`[EmailService]: No guest email provided for ${booking.bookingReference}. Skipping.`);
    return { success: false, reason: 'no_email' };
  }

  const checkInStr = formatDate(booking.checkIn);
  const checkOutStr = formatDate(booking.checkOut);
  const totalAmount = formatInr(booking.financials?.totalPaise);
  const advanceAmount = formatInr(booking.financials?.advancePayablePaise);
  const balanceAmount = formatInr(booking.financials?.balanceDuePaise);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #F9F6F0; margin: 0; padding: 24px; color: #143628; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #E8DFCE; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background: #143628; color: #F9F6F0; padding: 28px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
        .header p { margin: 6px 0 0 0; font-size: 12px; color: #C5A059; text-transform: uppercase; letter-spacing: 1px; }
        .body { padding: 28px 24px; }
        .alert-box { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px; }
        .alert-box h3 { margin: 0 0 4px 0; color: #92400E; font-size: 14px; font-weight: 700; }
        .alert-box p { margin: 0; color: #B45309; font-size: 13px; line-height: 1.4; }
        .ref-box { background: #F4EFE6; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 24px; border: 1px dashed #C5A059; }
        .ref-label { font-size: 11px; text-transform: uppercase; color: #8F6C27; font-weight: 700; letter-spacing: 1px; }
        .ref-number { font-size: 24px; font-weight: 800; color: #143628; letter-spacing: 2px; margin-top: 4px; }
        .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
        .details-table td { padding: 10px 0; border-bottom: 1px solid #F0EAE1; }
        .details-table td.label { color: #666; font-weight: 500; }
        .details-table td.val { text-align: right; color: #143628; font-weight: 700; }
        .payment-box { background: #FAF7F2; border: 1px solid #E8DFCE; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 13px; }
        .payment-box h4 { margin: 0 0 10px 0; color: #143628; font-size: 14px; font-weight: 700; }
        .whatsapp-btn { display: block; background: #25D366; color: #ffffff !important; text-align: center; padding: 14px 20px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 14px; margin-top: 16px; }
        .footer { background: #FAF7F2; padding: 18px 24px; text-align: center; font-size: 11px; color: #888; border-top: 1px solid #E8DFCE; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>SARANDA SAFARI RESORT</h1>
          <p>Nature • Wildlife • Tranquility • Estd. 1998</p>
        </div>
        <div class="body">
          <p style="margin-top: 0; font-size: 15px;">Dear <strong>${booking.guest?.name}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.5; color: #333;">Your reservation hold request has been placed successfully. Please complete the 50% advance payment within <strong>2 hours</strong> to secure your cottage.</p>

          <div class="ref-box">
            <div class="ref-label">Booking Reference</div>
            <div class="ref-number">${booking.bookingReference}</div>
          </div>

          <div class="alert-box">
            <h3>⏱️ 2-Hour Automatic Hold Active</h3>
            <p>This inventory is temporarily locked for your dates. If advance payment proof is not received within 2 hours, the reservation will be automatically released back to public availability.</p>
          </div>

          <table class="details-table">
            <tr>
              <td class="label">Check-In Date</td>
              <td class="val">${checkInStr} (9:00 AM)</td>
            </tr>
            <tr>
              <td class="label">Check-Out Date</td>
              <td class="val">${checkOutStr} (9:00 AM)</td>
            </tr>
            <tr>
              <td class="label">Stay Duration</td>
              <td class="val">${booking.nights} Night(s)</td>
            </tr>
            <tr>
              <td class="label">Guests</td>
              <td class="val">${booking.adults} Adult(s)${booking.children5to10 ? `, ${booking.children5to10} Child(ren)` : ''}</td>
            </tr>
            <tr>
              <td class="label">Total Stay Tariff</td>
              <td class="val">${totalAmount}</td>
            </tr>
            <tr style="background-color: #F8F5EE;">
              <td class="label" style="color: #92400E; font-weight: 700; padding-left: 8px;">50% Advance Payable Now</td>
              <td class="val" style="color: #92400E; font-size: 16px; padding-right: 8px;">${advanceAmount}</td>
            </tr>
            <tr>
              <td class="label" style="padding-left: 8px;">50% Balance (Due at Check-in)</td>
              <td class="val" style="padding-right: 8px;">${balanceAmount}</td>
            </tr>
          </table>

          <div class="payment-box">
            <h4>Payment Instructions (Direct UPI / Bank)</h4>
            <p style="margin: 4px 0;"><strong>Official UPI VPA:</strong> <code>9899373222@okbizaxis</code> (or scan on website)</p>
            <p style="margin: 4px 0;"><strong>WhatsApp Helpline:</strong> +91 ${RESORT_PHONE}</p>
            <p style="margin: 4px 0; color: #555; font-size: 12px;">After initiating transfer, share the payment screenshot with reference <strong>${booking.bookingReference}</strong> via WhatsApp for immediate verification.</p>
            <a href="https://wa.me/91${RESORT_PHONE}?text=Hello%20Saranda%20Safari%20Resort,%20I%20have%20transferred%2050%25%20advance%20for%20Booking%20${booking.bookingReference}.%20Sharing%20screenshot!" class="whatsapp-btn">
              Share Screenshot on WhatsApp (+91 ${RESORT_PHONE})
            </a>
          </div>
        </div>
        <div class="footer">
          ${RESORT_LOCATION} • Helpline: +91 ${RESORT_PHONE}
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipientEmail],
      subject: `Pending Hold: Reservation ${booking.bookingReference} — Saranda Safari Resort`,
      html
    });
    console.log(`[EmailService]: Hold email sent to ${recipientEmail} for ${booking.bookingReference} (id: ${data.id})`);
    return { success: true, data };
  } catch (err) {
    console.error(`[EmailService Error]: Failed to send hold email for ${booking.bookingReference}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 2. Send Booking Confirmed Voucher Email (Advance Payment Verified)
 */
export async function sendBookingConfirmedEmail(booking) {
  const resend = getResendClient();
  const recipientEmail = booking.guest?.email;

  if (!resend || !recipientEmail) return { success: false };

  const checkInStr = formatDate(booking.checkIn);
  const checkOutStr = formatDate(booking.checkOut);
  const totalAmount = formatInr(booking.financials?.totalPaise);
  const advanceAmount = formatInr(booking.financials?.advancePayablePaise);
  const balanceAmount = formatInr(booking.financials?.balanceDuePaise);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #F9F6F0; margin: 0; padding: 24px; color: #143628; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #E8DFCE; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background: #143628; color: #F9F6F0; padding: 28px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
        .header p { margin: 6px 0 0 0; font-size: 12px; color: #C5A059; text-transform: uppercase; letter-spacing: 1px; }
        .body { padding: 28px 24px; }
        .confirmed-box { background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center; }
        .confirmed-box h2 { margin: 0 0 4px 0; color: #065F46; font-size: 18px; font-weight: 700; }
        .confirmed-box p { margin: 0; color: #047857; font-size: 13px; }
        .ref-box { background: #F4EFE6; border-radius: 8px; padding: 14px; text-align: center; margin-bottom: 24px; border: 1px solid #E8DFCE; }
        .ref-label { font-size: 11px; text-transform: uppercase; color: #8F6C27; font-weight: 700; }
        .ref-number { font-size: 22px; font-weight: 800; color: #143628; margin-top: 4px; }
        .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
        .details-table td { padding: 10px 0; border-bottom: 1px solid #F0EAE1; }
        .details-table td.label { color: #666; font-weight: 500; }
        .details-table td.val { text-align: right; color: #143628; font-weight: 700; }
        .footer { background: #FAF7F2; padding: 18px 24px; text-align: center; font-size: 11px; color: #888; border-top: 1px solid #E8DFCE; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>SARANDA SAFARI RESORT</h1>
          <p>Nature • Wildlife • Tranquility • Estd. 1998</p>
        </div>
        <div class="body">
          <div class="confirmed-box">
            <h2>✅ RESERVATION CONFIRMED</h2>
            <p>Your 50% advance deposit has been verified. We look forward to hosting you!</p>
          </div>

          <p style="margin-top: 0; font-size: 14px;">Dear <strong>${booking.guest?.name}</strong>,</p>
          <p style="font-size: 13px; line-height: 1.5; color: #444;">Please keep this confirmation voucher handy upon arrival. Govt Photo IDs (Aadhaar / Voter ID / Passport) for all adult guests will be verified at check-in.</p>

          <div class="ref-box">
            <div class="ref-label">Official Booking Reference</div>
            <div class="ref-number">${booking.bookingReference}</div>
            ${booking.transactionReference ? `<div style="font-size: 12px; color: #065F46; margin-top: 6px;"><strong>Payment Reference / UTR:</strong> ${booking.transactionReference}</div>` : ''}
          </div>

          <table class="details-table">
            <tr>
              <td class="label">Check-In Date</td>
              <td class="val">${checkInStr} (9:00 AM)</td>
            </tr>
            <tr>
              <td class="label">Check-Out Date</td>
              <td class="val">${checkOutStr} (9:00 AM)</td>
            </tr>
            <tr>
              <td class="label">Stay Duration</td>
              <td class="val">${booking.nights} Night(s)</td>
            </tr>
            <tr>
              <td class="label">Guests</td>
              <td class="val">${booking.adults} Adult(s)${booking.children5to10 ? `, ${booking.children5to10} Child(ren)` : ''}</td>
            </tr>
            <tr>
              <td class="label">Total Stay Tariff</td>
              <td class="val">${totalAmount}</td>
            </tr>
            <tr style="color: #065F46;">
              <td class="label" style="color: #065F46; font-weight: 700;">50% Advance Paid</td>
              <td class="val" style="color: #065F46;">${advanceAmount} (Verified)</td>
            </tr>
            <tr>
              <td class="label" style="font-weight: 700;">Balance Due at Check-In</td>
              <td class="val" style="color: #143628; font-size: 15px;">${balanceAmount}</td>
            </tr>
          </table>

          <div style="background: #F4EFE6; border-radius: 8px; padding: 14px; font-size: 12px; color: #555; line-height: 1.5;">
            <strong>Check-In Instructions:</strong><br>
            • Standard cottage check-in is 9:00 AM; check-out is 9:00 AM on departure morning.<br>
            • Pure vegetarian breakfast, lunch, and dinner are included for 24-hr cottage stays.<br>
            • Jio & Airtel mobile networks are available. High-speed Wi-Fi is not available to preserve the tranquil nature retreat experience.
          </div>
        </div>
        <div class="footer">
          ${RESORT_LOCATION} • Helpline: +91 ${RESORT_PHONE}
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipientEmail],
      subject: `Confirmed Voucher: Reservation ${booking.bookingReference} — Saranda Safari Resort`,
      html
    });
    console.log(`[EmailService]: Confirmation voucher sent to ${recipientEmail} for ${booking.bookingReference} (id: ${data.id})`);
    return { success: true, data };
  } catch (err) {
    console.error(`[EmailService Error]: Failed to send confirmation voucher for ${booking.bookingReference}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 3. Send Booking Cancelled Email
 */
export async function sendBookingCancelledEmail(booking, reason = 'Cancelled by guest or hold expired') {
  const resend = getResendClient();
  const recipientEmail = booking.guest?.email;

  if (!resend || !recipientEmail) return { success: false };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #F9F6F0; margin: 0; padding: 24px; color: #143628; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #E8DFCE; }
        .header { background: #143628; color: #F9F6F0; padding: 24px; text-align: center; }
        .body { padding: 24px; }
        .ref-box { background: #F4EFE6; border-radius: 8px; padding: 14px; text-align: center; margin: 16px 0; }
        .footer { background: #FAF7F2; padding: 14px; text-align: center; font-size: 11px; color: #888; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h2 style="margin: 0;">SARANDA SAFARI RESORT</h2>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #C5A059;">RESERVATION UPDATE</p>
        </div>
        <div class="body">
          <p>Dear <strong>${booking.guest?.name}</strong>,</p>
          <p>This is to inform you that your reservation hold <strong>${booking.bookingReference}</strong> has been cancelled or has expired due to non-receipt of the advance payment within the 2-hour window.</p>
          <div class="ref-box">
            <span style="font-size: 11px; color: #888;">REFERENCE:</span><br>
            <strong style="font-size: 20px; color: #991B1B;">${booking.bookingReference}</strong>
          </div>
          <p style="font-size: 13px; color: #555;">If you made a payment or believe this was in error, please contact our helpline at +91 ${RESORT_PHONE} immediately.</p>
        </div>
        <div class="footer">
          ${RESORT_LOCATION}
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipientEmail],
      subject: `Reservation Notice: ${booking.bookingReference} Cancelled — Saranda Safari Resort`,
      html
    });
    console.log(`[EmailService]: Cancellation email sent to ${recipientEmail} for ${booking.bookingReference} (id: ${data.id})`);
    return { success: true, data };
  } catch (err) {
    console.error(`[EmailService Error]: Failed to send cancellation email for ${booking.bookingReference}:`, err.message);
    return { success: false, error: err.message };
  }
}
