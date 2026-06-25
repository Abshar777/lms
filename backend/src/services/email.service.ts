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

export async function sendInstructorClassScheduled(
  to: string,
  name: string,
  courseTitle: string,
  liveTitle: string,
  startsAt: Date,
  meetLink: string,
): Promise<void> {
  const subject = `You've been scheduled: ${liveTitle}`
  const when = startsAt.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Dubai' })
  const html = wrap(subject, `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0D0F1A">You've been assigned a live class</h2>
    <p>Hi ${escapeHtml(name)},</p>
    <p>A new live session has been scheduled for you in <strong>${escapeHtml(courseTitle)}</strong>.</p>
    <table cellpadding="0" cellspacing="0" style="margin:18px 0;background:#F4F5F8;border-radius:12px;padding:16px;width:100%">
      <tr><td style="padding:6px 0"><strong>Session:</strong> ${escapeHtml(liveTitle)}</td></tr>
      <tr><td style="padding:6px 0"><strong>When:</strong> ${escapeHtml(when)}</td></tr>
      <tr><td style="padding:6px 0"><strong>Meet link:</strong> <a href="${meetLink}" style="color:#FF6B1A">${escapeHtml(meetLink)}</a></td></tr>
    </table>
    <p style="margin:24px 0">
      <a href="${meetLink}" style="display:inline-block;background:linear-gradient(135deg,#FF6B1A,#FF8C42);color:#fff;font-weight:600;padding:12px 24px;border-radius:12px;text-decoration:none">
        Open Google Meet
      </a>
    </p>
    <p style="font-size:12px;color:#9CA3AF">You will receive another reminder 15 minutes before the class starts.</p>
  `)
  await sender.send({
    to,
    subject,
    html,
    text: `You've been scheduled to teach "${liveTitle}" (${courseTitle}) on ${when}.\nGoogle Meet: ${meetLink}`,
  })
}

export async function sendInstructor15MinReminder(
  to: string,
  name: string,
  liveTitle: string,
  startsAt: Date,
  meetLink: string,
): Promise<void> {
  const subject = `⏰ Starting in 15 min: ${liveTitle}`
  const when = startsAt.toLocaleString('en-US', { timeStyle: 'short', timeZone: 'Asia/Dubai' })
  const html = wrap(subject, `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0D0F1A">Your class starts in 15 minutes</h2>
    <p>Hi ${escapeHtml(name)},</p>
    <p><strong>${escapeHtml(liveTitle)}</strong> starts at <strong>${escapeHtml(when)}</strong>. Open your Google Meet link now so you're ready when students join.</p>
    <p style="margin:24px 0">
      <a href="${meetLink}" style="display:inline-block;background:linear-gradient(135deg,#FF6B1A,#FF8C42);color:#fff;font-weight:600;padding:14px 28px;border-radius:12px;text-decoration:none;font-size:15px">
        Join Google Meet now →
      </a>
    </p>
    <p style="font-size:12px;color:#6B7280">Link: <a href="${meetLink}" style="color:#FF6B1A">${escapeHtml(meetLink)}</a></p>
  `)
  await sender.send({
    to,
    subject,
    html,
    text: `Your class "${liveTitle}" starts at ${when} — join now: ${meetLink}`,
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

/* ── Reschedule email sequence (3 emails sent at different times) ── */

interface RescheduledArgs {
  to:      string
  name:    string
  title:   string
  oldDate: string
  newDate: string
  reason:  string
}

export async function sendRescheduledEmail1(args: RescheduledArgs): Promise<void> {
  const { to, name, title, oldDate, newDate, reason } = args
  const subject = `Important: ${title} has been rescheduled`
  const html = wrap(subject, `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0D0F1A">Session rescheduled</h2>
    <p style="margin:0 0 20px;font-size:13px;color:#6B7280">Schedule change notification — please read carefully.</p>
    <p>Hi ${escapeHtml(name)},</p>
    <p>We sincerely apologize for the inconvenience. <strong>${escapeHtml(title)}</strong> has been rescheduled to a new date and time. Please review the updated details below.</p>
    <table cellpadding="0" cellspacing="0" style="margin:20px 0;background:#F4F5F8;border-radius:12px;padding:0;width:100%;border-collapse:separate;overflow:hidden">
      <tr style="background:#EFF0F4">
        <td style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6B7280;padding:10px 16px">Previous time</td>
        <td style="font-size:14px;color:#9CA3AF;padding:10px 16px;text-align:right;text-decoration:line-through">${escapeHtml(oldDate)}</td>
      </tr>
      <tr>
        <td style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6B7280;padding:10px 16px;border-top:1px solid #E5E7EB">New time</td>
        <td style="font-size:15px;font-weight:700;color:#059669;padding:10px 16px;border-top:1px solid #E5E7EB;text-align:right">${escapeHtml(newDate)}</td>
      </tr>
      <tr style="background:#EFF0F4">
        <td colspan="2" style="font-size:13px;color:#374151;padding:12px 16px;border-top:1px solid #E5E7EB">
          <strong>Reason for change:</strong><br>
          <span style="color:#4B5563;margin-top:4px;display:block">${escapeHtml(reason)}</span>
        </td>
      </tr>
    </table>
    <p>Your booking has been <strong>automatically updated</strong> to the new time. No action is required — your seat is still reserved.</p>
    <p>We will send you a reminder before the rescheduled session. We apologize once again for any disruption and truly appreciate your understanding.</p>
    <div style="margin:20px 0;background:#FEF9C3;border:1px solid #FDE047;border-radius:10px;padding:14px 16px">
      <p style="margin:0;font-size:13px;color:#854D0E">
        🔗 <strong>Your join link</strong> will be sent to you <strong>5 minutes before</strong> the class begins — keep an eye on your inbox!
      </p>
    </div>
    <p style="margin:24px 0">
      <a href="${process.env['CLIENT_URL'] ?? 'http://localhost:3000'}/class-bookings"
        style="display:inline-block;background:linear-gradient(135deg,#6366F1,#818CF8);color:#fff;font-weight:700;padding:14px 28px;border-radius:12px;text-decoration:none;font-size:15px">
        View my updated schedule →
      </a>
    </p>
    <p style="font-size:12px;color:#9CA3AF">If you have any questions or concerns, please reach out to the admin team. We are happy to assist.</p>
  `)
  await sender.send({ to, subject, html, text: `${title} has been rescheduled from ${oldDate} to ${newDate}. Reason: ${reason}` })
}

export async function sendRescheduledEmail2(args: RescheduledArgs): Promise<void> {
  const { to, name, title, newDate, reason } = args
  const subject = `Following up: Updated schedule for "${title}"`
  const html = wrap(subject, `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0D0F1A">A quick follow-up on your class</h2>
    <p>Hi ${escapeHtml(name)},</p>
    <p>We wanted to follow up to ensure you received our earlier notification about the schedule change for <strong>${escapeHtml(title)}</strong>.</p>
    <table cellpadding="0" cellspacing="0" style="margin:20px 0;background:rgba(99,102,241,0.06);border-left:3px solid #6366F1;border-radius:0 12px 12px 0;padding:18px 20px;width:100%">
      <tr><td style="font-size:15px;font-weight:700;color:#1F2937;padding:0 0 8px">
        📅 ${escapeHtml(newDate)}
      </td></tr>
      <tr><td style="font-size:13px;color:#6B7280">
        <strong style="color:#374151">Why we changed it:</strong> ${escapeHtml(reason)}
      </td></tr>
    </table>
    <p>We understand that schedule changes can be inconvenient, and we truly appreciate your patience. Rest assured that the team is fully committed to delivering the best possible learning experience for you at this new time.</p>
    <p><strong>You don't need to do anything</strong> — your seat is confirmed and your booking has already been updated automatically.</p>
    <p style="margin:24px 0">
      <a href="${process.env['CLIENT_URL'] ?? 'http://localhost:3000'}/class-bookings"
        style="display:inline-block;background:linear-gradient(135deg,#6366F1,#818CF8);color:#fff;font-weight:700;padding:14px 28px;border-radius:12px;text-decoration:none;font-size:15px">
        Check my bookings →
      </a>
    </p>
    <div style="margin:20px 0;background:#FEF9C3;border:1px solid #FDE047;border-radius:10px;padding:14px 16px">
      <p style="margin:0;font-size:13px;color:#854D0E">
        🔗 <strong>Your join link</strong> will be delivered to your inbox <strong>5 minutes before</strong> the session starts.
      </p>
    </div>
    <p>We look forward to seeing you at the new time. Thank you for your continued trust and understanding.</p>
  `)
  await sender.send({ to, subject, html, text: `Reminder: ${title} has been rescheduled. New time: ${newDate}. Reason: ${reason}.` })
}

export async function sendRescheduledEmail3(args: RescheduledArgs): Promise<void> {
  const { to, name, title, newDate, reason } = args
  const subject = `Reminder: Your rescheduled class — ${title}`
  const html = wrap(subject, `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0D0F1A">Your class is coming up 📚</h2>
    <p>Hi ${escapeHtml(name)},</p>
    <p>This is a friendly reminder that your rescheduled session of <strong>${escapeHtml(title)}</strong> is approaching. We want to make sure you are fully prepared and ready for a great learning experience.</p>
    <table cellpadding="0" cellspacing="0" style="margin:20px 0;background:linear-gradient(135deg,rgba(5,150,105,0.08),rgba(16,185,129,0.06));border:1px solid rgba(5,150,105,0.2);border-radius:12px;padding:18px;width:100%">
      <tr><td style="font-size:16px;font-weight:700;color:#059669;padding:0 0 6px">
        📅 ${escapeHtml(newDate)}
      </td></tr>
      <tr><td style="font-size:12px;color:#6B7280">
        This is the rescheduled time for your class. Original change reason: <em>${escapeHtml(reason)}</em>
      </td></tr>
    </table>
    <p>To make the most of this session, we recommend reviewing any notes or materials from previous classes beforehand. The instructor will be fully prepared to deliver an outstanding lesson.</p>
    <div style="margin:20px 0;background:#FEF9C3;border:1px solid #FDE047;border-radius:10px;padding:14px 16px">
      <p style="margin:0;font-size:13px;color:#854D0E">
        🔗 <strong>Your join link</strong> will arrive in your inbox <strong>5 minutes before</strong> the class begins — no action needed now.
      </p>
    </div>
    <p>We would like to once again express our sincerest apologies for the rescheduling and thank you for your patience and flexibility. Your commitment to learning is truly appreciated.</p>
    <p style="margin:24px 0">
      <a href="${process.env['CLIENT_URL'] ?? 'http://localhost:3000'}/class-bookings"
        style="display:inline-block;background:linear-gradient(135deg,#059669,#10B981);color:#fff;font-weight:700;padding:14px 28px;border-radius:12px;text-decoration:none;font-size:15px">
        View session details →
      </a>
    </p>
    <p style="font-size:12px;color:#9CA3AF">We look forward to seeing you in class. See you soon! 🎓</p>
  `)
  await sender.send({ to, subject, html, text: `Reminder: ${title} is scheduled for ${newDate}. We look forward to seeing you in class!` })
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

const CATEGORY_LABEL: Record<string, string> = {
  '4x-trading':        '4x Trading',
  'digital-marketing': 'Digital Marketing',
  'ai':                'AI',
}

export async function sendEnrollmentApproved(
  to: string,
  name: string,
  category: string,
): Promise<void> {
  const prog = CATEGORY_LABEL[category] ?? category
  const subject = `Your ${prog} access has been approved!`
  const dashUrl = `${process.env['CLIENT_URL'] ?? 'http://localhost:3000'}/my-learning`
  const html = wrap(subject, `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0D0F1A">You're in! 🎉</h2>
    <p>Hi ${escapeHtml(name)},</p>
    <p>Great news — your access to the <strong>${escapeHtml(prog)}</strong> program has been approved. You can now book and join live sessions.</p>
    <p style="margin:24px 0">
      <a href="${dashUrl}" style="display:inline-block;background:linear-gradient(135deg,#FF6B1A,#FF8C42);color:#fff;font-weight:600;padding:12px 24px;border-radius:12px;text-decoration:none">
        Go to my learning →
      </a>
    </p>
  `)
  await sender.send({ to, subject, html, text: `Your ${prog} program access has been approved. Visit ${dashUrl} to get started.` })
}

export async function sendEnrollmentCancelled(
  to: string,
  name: string,
  category: string,
  reason: string,
): Promise<void> {
  const prog = CATEGORY_LABEL[category] ?? category
  const subject = `Update on your ${prog} access request`
  const html = wrap(subject, `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0D0F1A">Access request update</h2>
    <p>Hi ${escapeHtml(name)},</p>
    <p>We've reviewed your access request for the <strong>${escapeHtml(prog)}</strong> program.</p>
    <div style="background:#FEF2F2;border-left:4px solid #EF4444;padding:16px 20px;border-radius:0 12px 12px 0;margin:20px 0">
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#DC2626;text-transform:uppercase;letter-spacing:0.05em">Access not approved</p>
      <p style="margin:0;font-size:14px;color:#374151">${escapeHtml(reason)}</p>
    </div>
    <p>If you believe this is a mistake or have any questions, please reach out to our support team and we'll be happy to help.</p>
  `)
  await sender.send({ to, subject, html, text: `Your ${prog} access request was not approved. Reason: ${reason}` })
}

export async function sendNewEnrollmentRequestToAdmin(
  to: string,
  adminName: string,
  studentName: string,
  studentEmail: string,
  category: string,
): Promise<void> {
  const prog = CATEGORY_LABEL[category] ?? category
  const subject = `New ${prog} signup — approval needed`
  const requestsUrl = `${process.env['ADMIN_URL'] ?? 'http://localhost:3001'}/enrollment-requests`
  const html = wrap(subject, `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0D0F1A">New student signup 🔔</h2>
    <p>Hi ${escapeHtml(adminName)},</p>
    <p>A new student has signed up for the <strong>${escapeHtml(prog)}</strong> program and is waiting for your approval.</p>
    <table cellpadding="0" cellspacing="0" style="margin:18px 0;background:#F4F5F8;border-radius:12px;padding:16px;width:100%">
      <tr><td style="font-size:14px;color:#374151;padding:4px 0">
        <strong>Name:</strong> ${escapeHtml(studentName)}
      </td></tr>
      <tr><td style="font-size:14px;color:#374151;padding:4px 0">
        <strong>Email:</strong> ${escapeHtml(studentEmail)}
      </td></tr>
      <tr><td style="font-size:14px;color:#374151;padding:4px 0">
        <strong>Program:</strong> ${escapeHtml(prog)}
      </td></tr>
    </table>
    <p>Review the request and approve or deny access in the admin panel.</p>
    <p style="margin:24px 0">
      <a href="${requestsUrl}" style="display:inline-block;background:linear-gradient(135deg,#FF6B1A,#FF8C42);color:#fff;font-weight:600;padding:12px 24px;border-radius:12px;text-decoration:none">
        Review request →
      </a>
    </p>
  `)
  await sender.send({ to, subject, html, text: `New ${prog} signup from ${studentName} (${studentEmail}). Review at ${requestsUrl}` })
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!))
}
