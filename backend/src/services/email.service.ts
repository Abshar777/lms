import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import nodemailer, { type Transporter } from 'nodemailer'
import { logger } from '@/utils/logger.ts'

/* ─────────────────────────────────────────────────────
   EmailService
   ─────────────────────────────────────────────────────
   Single send() interface with two backends:

     - ConsoleEmailSender (default): writes the full HTML
       to `.logs/emails/*.html` for easy local preview.
       Used whenever SMTP isn't configured. No external
       network calls.

     - NodemailerEmailSender: used when SMTP_HOST +
       SMTP_USER + SMTP_PASS + EMAIL_FROM are set in env.
       Works with any SMTP provider (Gmail, Outlook,
       SendGrid SMTP, Mailgun, AWS SES SMTP, Brevo, etc).

   Wrappers expose typed helpers (sendPasswordReset,
   sendVerifyEmail, sendLiveClassScheduled) so callers
   don't deal with HTML.
───────────────────────────────────────────────────── */

export interface EmailMessage {
  to:      string
  subject: string
  html:    string
  text?:   string
}

export interface EmailSender {
  send(msg: EmailMessage): Promise<void>
}

/* ─── Console sender (dev) ───────────────────────────── */
class ConsoleEmailSender implements EmailSender {
  private readonly dir = join(process.cwd(), '.logs', 'emails')

  async send(msg: EmailMessage): Promise<void> {
    try {
      await mkdir(this.dir, { recursive: true })
      const safe = msg.to.replace(/[^a-z0-9@._-]/gi, '_')
      const file = join(this.dir, `${Date.now()}-${safe}.html`)
      await writeFile(file, `<!-- to: ${msg.to} | subject: ${msg.subject} -->\n${msg.html}`, 'utf8')
      logger.info(
        { to: msg.to, subject: msg.subject, file },
        `📧  [dev] email captured`,
      )
    } catch (err) {
      logger.error({ err }, 'Email log write failed')
    }
  }
}

/* ─── Nodemailer sender (production) ─────────────────── */
class NodemailerEmailSender implements EmailSender {
  private readonly transporter: Transporter
  constructor(
    transporter: Transporter,
    private readonly fromEmail: string,
  ) {
    this.transporter = transporter
  }

  async send(msg: EmailMessage): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from:    this.fromEmail,
        to:      msg.to,
        subject: msg.subject,
        html:    msg.html,
        text:    msg.text,
      })
      logger.debug({ messageId: info.messageId, to: msg.to }, '📧  email sent')
    } catch (err) {
      logger.error({ err, to: msg.to }, 'Nodemailer send failed')
      throw err
    }
  }
}

/* ─── Singleton ──────────────────────────────────────── */
function buildSender(): EmailSender {
  const host = process.env['SMTP_HOST']
  const port = Number(process.env['SMTP_PORT'] ?? 587)
  const user = process.env['SMTP_USER']
  const pass = process.env['SMTP_PASS']
  const from = process.env['EMAIL_FROM']

  if (host && user && pass && from) {
    const secure = process.env['SMTP_SECURE']
      ? process.env['SMTP_SECURE'] === 'true'
      : port === 465   // 465 = implicit TLS, 587 = STARTTLS, 25 = plain

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    })

    /* Verify once at startup — failure is non-fatal but logs loudly. */
    void transporter.verify()
      .then(() => logger.info({ host, port, secure, from }, '📧  Email backend: SMTP (nodemailer) — connection verified'))
      .catch(err => logger.error({ err, host, port }, '📧  SMTP verify failed — emails will still be attempted but may fail'))

    return new NodemailerEmailSender(transporter, from)
  }

  logger.info('📧  Email backend: console (set SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM to enable real sending)')
  return new ConsoleEmailSender()
}

const sender = buildSender()

/* ─── Branded HTML wrapper ───────────────────────────── */
function wrap(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F4F5F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0D0F1A;line-height:1.55">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F8;padding:40px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB">
          <tr>
            <td style="padding:28px 32px 0">
              <div style="display:inline-flex;align-items:center;gap:8px">
                <div style="width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,#FF6B1A,#FF8C42);display:inline-block"></div>
                <span style="font-weight:700;font-size:18px">LearnOS</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 32px;font-size:14px;color:#374151">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 28px;border-top:1px solid #F3F4F6;font-size:11px;color:#9CA3AF">
              You're receiving this because you signed up at LearnOS.
              If this wasn't you, you can safely ignore this email.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/* ─── Typed helpers ─────────────────────────────────── */

export async function sendPasswordReset(to: string, name: string, resetUrl: string): Promise<void> {
  const subject = 'Reset your LearnOS password'
  const html = wrap(subject, `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0D0F1A">Reset your password</h2>
    <p>Hi ${escapeHtml(name)},</p>
    <p>We received a request to reset your password. Click the button below to choose a new one. The link expires in 60 minutes.</p>
    <p style="margin:24px 0">
      <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#FF6B1A,#FF8C42);color:#fff;font-weight:600;padding:12px 24px;border-radius:12px;text-decoration:none">
        Reset password
      </a>
    </p>
    <p style="font-size:12px;color:#6B7280">Or paste this URL into your browser:<br><span style="color:#FF6B1A">${escapeHtml(resetUrl)}</span></p>
    <p style="font-size:12px;color:#9CA3AF">If you didn't request this, ignore this email and your password will stay the same.</p>
  `)
  await sender.send({
    to,
    subject,
    html,
    text: `Reset your LearnOS password by visiting: ${resetUrl}\n\nThe link expires in 60 minutes. If you didn't request this, ignore this email.`,
  })
}

export async function sendVerifyEmail(to: string, name: string, verifyUrl: string): Promise<void> {
  const subject = 'Verify your LearnOS email'
  const html = wrap(subject, `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0D0F1A">Welcome to LearnOS, ${escapeHtml(name)}</h2>
    <p>Confirm your email address to unlock notifications, certificates, and account recovery.</p>
    <p style="margin:24px 0">
      <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#FF6B1A,#FF8C42);color:#fff;font-weight:600;padding:12px 24px;border-radius:12px;text-decoration:none">
        Verify email
      </a>
    </p>
    <p style="font-size:12px;color:#6B7280">Or paste this URL into your browser:<br><span style="color:#FF6B1A">${escapeHtml(verifyUrl)}</span></p>
    <p style="font-size:12px;color:#9CA3AF">The link expires in 24 hours.</p>
  `)
  await sender.send({
    to,
    subject,
    html,
    text: `Verify your LearnOS email: ${verifyUrl}\nThis link expires in 24 hours.`,
  })
}

export async function sendLiveClassScheduled(
  to: string,
  name: string,
  courseTitle: string,
  liveTitle: string,
  startsAt: Date,
  joinUrl: string,
): Promise<void> {
  const subject = `Live class scheduled: ${liveTitle}`
  const when = startsAt.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })
  const html = wrap(subject, `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0D0F1A">A live class has been scheduled</h2>
    <p>Hi ${escapeHtml(name)}, a new live session is on the calendar for <strong>${escapeHtml(courseTitle)}</strong>.</p>
    <table cellpadding="0" cellspacing="0" style="margin:18px 0;background:#F4F5F8;border-radius:12px;padding:16px;width:100%">
      <tr><td style="padding:8px 0"><strong>Session:</strong> ${escapeHtml(liveTitle)}</td></tr>
      <tr><td style="padding:8px 0"><strong>When:</strong> ${escapeHtml(when)}</td></tr>
    </table>
    <p style="margin:24px 0">
      <a href="${joinUrl}" style="display:inline-block;background:linear-gradient(135deg,#FF6B1A,#FF8C42);color:#fff;font-weight:600;padding:12px 24px;border-radius:12px;text-decoration:none">
        Open course page
      </a>
    </p>
    <p style="font-size:12px;color:#9CA3AF">You'll see a "Join now" button on the course page when the session goes live.</p>
  `)
  await sender.send({
    to,
    subject,
    html,
    text: `A live class "${liveTitle}" has been scheduled for ${courseTitle} on ${when}. See ${joinUrl} for details.`,
  })
}

export async function sendEnrollmentConfirmation(
  to: string,
  name: string,
  courseTitle: string,
  courseUrl: string,
): Promise<void> {
  const subject = `You're enrolled in ${courseTitle}`
  const html = wrap(subject, `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0D0F1A">You're in! 🎉</h2>
    <p>Hi ${escapeHtml(name)}, you're now enrolled in <strong>${escapeHtml(courseTitle)}</strong>.</p>
    <p>Open the course any time and learn at your own pace. Your progress is saved automatically.</p>
    <p style="margin:24px 0">
      <a href="${courseUrl}" style="display:inline-block;background:linear-gradient(135deg,#FF6B1A,#FF8C42);color:#fff;font-weight:600;padding:12px 24px;border-radius:12px;text-decoration:none">
        Start learning →
      </a>
    </p>
    <p style="font-size:12px;color:#9CA3AF">You can access this course any time from your My Learning page.</p>
  `)
  await sender.send({
    to,
    subject,
    html,
    text: `You're enrolled in ${courseTitle}! Start learning: ${courseUrl}`,
  })
}

export async function sendCourseCompletion(
  to: string,
  name: string,
  courseTitle: string,
  courseUrl: string,
): Promise<void> {
  const subject = `You completed ${courseTitle} 🏆`
  const html = wrap(subject, `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0D0F1A">Course complete!</h2>
    <p>Congratulations, ${escapeHtml(name)}! You finished <strong>${escapeHtml(courseTitle)}</strong> from start to finish.</p>
    <table cellpadding="0" cellspacing="0" style="margin:18px 0;background:#F4F5F8;border-radius:12px;padding:16px;width:100%">
      <tr>
        <td style="padding:8px 0;font-size:22px">🏆</td>
      </tr>
      <tr>
        <td style="font-size:14px;color:#374151;padding:4px 0">
          <strong>${escapeHtml(courseTitle)}</strong> — 100% complete
        </td>
      </tr>
    </table>
    <p>Your certificate is waiting for you on the course page.</p>
    <p style="margin:24px 0">
      <a href="${courseUrl}" style="display:inline-block;background:linear-gradient(135deg,#FF6B1A,#FF8C42);color:#fff;font-weight:600;padding:12px 24px;border-radius:12px;text-decoration:none">
        View certificate →
      </a>
    </p>
  `)
  await sender.send({
    to,
    subject,
    html,
    text: `Congratulations! You completed ${courseTitle}. View your certificate: ${courseUrl}`,
  })
}

/* ── Phase 5: Booking & Session reminder templates ──────── */

export async function sendBookingConfirmation(
  to: string,
  name: string,
  sessionTitle: string,
  date: string,
  joinUrl: string,
): Promise<void> {
  const subject = `Booking confirmed: ${sessionTitle}`
  const html = wrap(subject, `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0D0F1A">Session booked! 🎉</h2>
    <p>Hi ${escapeHtml(name)}, your seat is confirmed for <strong>${escapeHtml(sessionTitle)}</strong>.</p>
    <table cellpadding="0" cellspacing="0" style="margin:18px 0;background:#F4F5F8;border-radius:12px;padding:16px;width:100%">
      <tr><td style="font-size:14px;color:#374151;padding:4px 0">
        <strong>Date &amp; Time:</strong> ${escapeHtml(date)}
      </td></tr>
    </table>
    <p style="margin:24px 0">
      <a href="${joinUrl}" style="display:inline-block;background:linear-gradient(135deg,#FF6B1A,#FF8C42);color:#fff;font-weight:600;padding:12px 24px;border-radius:12px;text-decoration:none">
        Join session →
      </a>
    </p>
    <p style="font-size:12px;color:#9CA3AF">You'll receive reminder emails before the session starts.</p>
  `)
  await sender.send({ to, subject, html, text: `Your seat is confirmed for ${sessionTitle} on ${date}. Join: ${joinUrl}` })
}

export async function sendSessionLinkReminder(
  to: string,
  name: string,
  sessionTitle: string,
  date: string,
  joinUrl: string,
): Promise<void> {
  const subject = `Tomorrow: ${sessionTitle}`
  const html = wrap(subject, `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0D0F1A">Your session is tomorrow 📅</h2>
    <p>Hi ${escapeHtml(name)}, just a reminder that <strong>${escapeHtml(sessionTitle)}</strong> is scheduled for tomorrow.</p>
    <table cellpadding="0" cellspacing="0" style="margin:18px 0;background:#F4F5F8;border-radius:12px;padding:16px;width:100%">
      <tr><td style="font-size:14px;color:#374151;padding:4px 0">
        <strong>Date &amp; Time:</strong> ${escapeHtml(date)}
      </td></tr>
    </table>
    <p style="margin:24px 0">
      <a href="${joinUrl}" style="display:inline-block;background:linear-gradient(135deg,#FF6B1A,#FF8C42);color:#fff;font-weight:600;padding:12px 24px;border-radius:12px;text-decoration:none">
        Join session →
      </a>
    </p>
  `)
  await sender.send({ to, subject, html, text: `${sessionTitle} is tomorrow at ${date}. Join: ${joinUrl}` })
}

export async function sendDayOfReminder(
  to: string,
  name: string,
  sessionTitle: string,
  time: string,
  joinUrl: string,
): Promise<void> {
  const subject = `Today: ${sessionTitle} at ${time}`
  const html = wrap(subject, `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0D0F1A">Session today! ⏰</h2>
    <p>Hi ${escapeHtml(name)}, <strong>${escapeHtml(sessionTitle)}</strong> is happening today at <strong>${escapeHtml(time)}</strong>.</p>
    <p>Get ready and make sure your connection is stable.</p>
    <p style="margin:24px 0">
      <a href="${joinUrl}" style="display:inline-block;background:linear-gradient(135deg,#FF6B1A,#FF8C42);color:#fff;font-weight:600;padding:12px 24px;border-radius:12px;text-decoration:none">
        Join session →
      </a>
    </p>
  `)
  await sender.send({ to, subject, html, text: `${sessionTitle} is today at ${time}. Join: ${joinUrl}` })
}

/**
 * 30-min reminder — NO join link.
 * The link is withheld intentionally; it is sent at the 5-min reminder instead.
 */
export async function sendPreSessionReminder(
  to: string,
  name: string,
  sessionTitle: string,
  minutesLeft: number,
): Promise<void> {
  const subject = `Starting in ${minutesLeft} mins: ${sessionTitle}`
  const html = wrap(subject, `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0D0F1A">Starting soon! 🚀</h2>
    <p>Hi ${escapeHtml(name)}, <strong>${escapeHtml(sessionTitle)}</strong> starts in <strong>${minutesLeft} minutes</strong>.</p>
    <p>Get ready — make sure your device and connection are set. The join link will arrive in a separate email 5 minutes before the session starts.</p>
    <p style="margin:24px 0">
      <a href="${process.env['CLIENT_URL'] ?? 'http://localhost:3000'}/class-bookings"
        style="display:inline-block;background:linear-gradient(135deg,#FF6B1A,#FF8C42);color:#fff;font-weight:600;padding:12px 24px;border-radius:12px;text-decoration:none">
        View my schedule →
      </a>
    </p>
  `)
  await sender.send({ to, subject, html, text: `${sessionTitle} starts in ${minutesLeft} minutes. The join link will be sent 5 minutes before the session.` })
}

/** 5-min reminder — WITH join link */
export async function sendFiveMinReminder(
  to: string,
  name: string,
  sessionTitle: string,
  joinUrl: string,
): Promise<void> {
  const subject = `Starting in 5 mins — join now: ${sessionTitle}`
  const html = wrap(subject, `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0D0F1A">5 minutes to go! ⏱️</h2>
    <p>Hi ${escapeHtml(name)}, <strong>${escapeHtml(sessionTitle)}</strong> is starting in just 5 minutes.</p>
    <p>Click below to join now so you're ready when it begins.</p>
    <p style="margin:24px 0">
      <a href="${joinUrl}" style="display:inline-block;background:linear-gradient(135deg,#FF6B1A,#FF8C42);color:#fff;font-weight:700;padding:14px 28px;border-radius:12px;text-decoration:none;font-size:15px">
        Join now →
      </a>
    </p>
  `)
  await sender.send({ to, subject, html, text: `${sessionTitle} starts in 5 minutes. Join: ${joinUrl}` })
}

/** At-time reminder — WITH join link, sent when class has just started */
export async function sendClassStartingReminder(
  to: string,
  name: string,
  sessionTitle: string,
  joinUrl: string,
): Promise<void> {
  const subject = `Class is starting now: ${sessionTitle}`
  const html = wrap(subject, `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0D0F1A">Your class is live! 🎯</h2>
    <p>Hi ${escapeHtml(name)}, <strong>${escapeHtml(sessionTitle)}</strong> has just started.</p>
    <p>Don't miss it — join immediately using the button below.</p>
    <p style="margin:24px 0">
      <a href="${joinUrl}" style="display:inline-block;background:linear-gradient(135deg,#EF4444,#DC2626);color:#fff;font-weight:700;padding:14px 28px;border-radius:12px;text-decoration:none;font-size:15px">
        Join class now →
      </a>
    </p>
  `)
  await sender.send({ to, subject, html, text: `${sessionTitle} is starting now. Join: ${joinUrl}` })
}

export async function sendRescheduledNotification(
  to: string,
  name: string,
  sessionTitle: string,
  oldDate: string,
  newDate: string,
): Promise<void> {
  const subject = `Rescheduled: ${sessionTitle}`
  const html = wrap(subject, `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0D0F1A">Session rescheduled 📆</h2>
    <p>Hi ${escapeHtml(name)}, <strong>${escapeHtml(sessionTitle)}</strong> has been rescheduled.</p>
    <table cellpadding="0" cellspacing="0" style="margin:18px 0;background:#F4F5F8;border-radius:12px;padding:16px;width:100%">
      <tr><td style="font-size:14px;color:#374151;padding:4px 0">
        <strong>Old time:</strong> ${escapeHtml(oldDate)}
      </td></tr>
      <tr><td style="font-size:14px;color:#374151;padding:4px 0">
        <strong>New time:</strong> ${escapeHtml(newDate)}
      </td></tr>
    </table>
    <p>Your booking is automatically updated. We'll send you reminders for the new time.</p>
  `)
  await sender.send({ to, subject, html, text: `${sessionTitle} has been rescheduled from ${oldDate} to ${newDate}.` })
}

export async function sendCancelledNotification(
  to: string,
  name: string,
  sessionTitle: string,
  date: string,
): Promise<void> {
  const subject = `Cancelled: ${sessionTitle}`
  const html = wrap(subject, `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0D0F1A">Session cancelled</h2>
    <p>Hi ${escapeHtml(name)}, unfortunately <strong>${escapeHtml(sessionTitle)}</strong> scheduled for ${escapeHtml(date)} has been cancelled.</p>
    <p>Please contact the admin team if you have any questions.</p>
  `)
  await sender.send({ to, subject, html, text: `${sessionTitle} on ${date} has been cancelled.` })
}

export async function sendBookingCancelledByStudent(
  to: string,
  name: string,
  sessionTitle: string,
  date: string,
): Promise<void> {
  const subject = `Booking cancelled: ${sessionTitle}`
  const html = wrap(subject, `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0D0F1A">Booking cancelled</h2>
    <p>Hi ${escapeHtml(name)}, your booking for <strong>${escapeHtml(sessionTitle)}</strong> has been successfully cancelled.</p>
    <table cellpadding="0" cellspacing="0" style="margin:18px 0;background:#F4F5F8;border-radius:12px;padding:16px;width:100%">
      <tr><td style="font-size:14px;color:#374151;padding:4px 0">
        <strong>Session:</strong> ${escapeHtml(sessionTitle)}
      </td></tr>
      <tr><td style="font-size:14px;color:#374151;padding:4px 0">
        <strong>Scheduled for:</strong> ${escapeHtml(date)}
      </td></tr>
    </table>
    <p>Your seat has been released. You can book a different time slot from the Class Schedule page.</p>
    <p style="margin:24px 0">
      <a href="${process.env['CLIENT_URL'] ?? 'http://localhost:3000'}/class-bookings"
        style="display:inline-block;background:#F3F4F6;color:#374151;font-weight:600;padding:12px 24px;border-radius:12px;text-decoration:none">
        View Class Schedule →
      </a>
    </p>
    <p style="font-size:12px;color:#9CA3AF">If you didn't request this cancellation, please contact the admin team.</p>
  `)
  await sender.send({ to, subject, html, text: `Your booking for ${sessionTitle} on ${date} has been cancelled. Book again: ${process.env['CLIENT_URL'] ?? 'http://localhost:3000'}/class-bookings` })
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!))
}
