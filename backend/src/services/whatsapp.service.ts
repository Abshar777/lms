/**
 * WhatsApp service — WATI Business API integration.
 * Uses env vars: WATI_API_URL, WATI_API_KEY
 * Falls back to console logging when env vars are absent (dev mode).
 */

const WATI_API_URL = process.env.WATI_API_URL ?? ''
const WATI_API_KEY = process.env.WATI_API_KEY ?? ''

export interface WhatsAppTemplate {
  templateName: string
  parameters: Array<{ name: string; value: string }>
}

/**
 * Send a WhatsApp template message via WATI API.
 * @param phone E.164 format without '+', e.g. "919876543210"
 */
export async function sendWhatsAppMessage(
  phone: string,
  templateName: string,
  parameters: Array<{ name: string; value: string }>,
): Promise<void> {
  if (!WATI_API_URL || !WATI_API_KEY) {
    console.log(`[WhatsApp DEV] → ${phone} | template: ${templateName} | params:`, parameters)
    return
  }

  const url = `${WATI_API_URL}/api/v1/sendTemplateMessage?whatsappNumber=${phone}`
  const body = JSON.stringify({ template_name: templateName, broadcast_name: templateName, parameters })

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${WATI_API_KEY}`,
    },
    body,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => 'unknown')
    console.error(`[WhatsApp] WATI error ${res.status}: ${text}`)
    // Non-fatal — don't throw so reminder job continues
  }
}

/* ── Typed helpers matching the email templates ─── */

export async function sendWABookingConfirmation(phone: string, name: string, sessionTitle: string, date: string): Promise<void> {
  await sendWhatsAppMessage(phone, 'booking_confirmation', [
    { name: 'name', value: name },
    { name: 'session_title', value: sessionTitle },
    { name: 'date', value: date },
  ])
}

export async function sendWASessionLinkReminder(phone: string, name: string, sessionTitle: string, date: string, joinUrl: string): Promise<void> {
  await sendWhatsAppMessage(phone, 'session_link_reminder', [
    { name: 'name', value: name },
    { name: 'session_title', value: sessionTitle },
    { name: 'date', value: date },
    { name: 'join_url', value: joinUrl },
  ])
}

export async function sendWADayOfReminder(phone: string, name: string, sessionTitle: string, time: string, joinUrl: string): Promise<void> {
  await sendWhatsAppMessage(phone, 'day_of_reminder', [
    { name: 'name', value: name },
    { name: 'session_title', value: sessionTitle },
    { name: 'time', value: time },
    { name: 'join_url', value: joinUrl },
  ])
}

export async function sendWAPreSessionReminder(phone: string, name: string, sessionTitle: string, minutesLeft: number, joinUrl: string): Promise<void> {
  await sendWhatsAppMessage(phone, 'pre_session_reminder', [
    { name: 'name', value: name },
    { name: 'session_title', value: sessionTitle },
    { name: 'minutes_left', value: String(minutesLeft) },
    { name: 'join_url', value: joinUrl },
  ])
}
