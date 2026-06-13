import { google } from 'googleapis'

/**
 * Creates a Google Calendar event and returns the attached Google Meet link.
 *
 * Uses OAuth2 (refresh token) — authenticates as the Gmail user so Meet links work.
 *
 * Required env vars:
 *   GOOGLE_CLIENT_ID       — OAuth2 Client ID from Google Cloud Console
 *   GOOGLE_CLIENT_SECRET   — OAuth2 Client Secret
 *   GOOGLE_REFRESH_TOKEN   — long-lived refresh token from the one-time OAuth2 flow
 *   GOOGLE_CALENDAR_ID     — calendar to create events on (default: "primary")
 */
export async function createGoogleMeetLink(opts: {
  title:        string
  startISO:     string
  durationMins: number
}): Promise<string> {
  const clientId     = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  const calendarId   = process.env.GOOGLE_CALENDAR_ID ?? 'primary'

  if (!clientId || !clientSecret || !refreshToken) {
    throw Object.assign(
      new Error(
        'Google Meet is not configured — add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ' +
        'and GOOGLE_REFRESH_TOKEN to your .env file.',
      ),
      { status: 503 },
    )
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
  oauth2Client.setCredentials({ refresh_token: refreshToken })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  const start    = new Date(opts.startISO)
  const end      = new Date(start.getTime() + opts.durationMins * 60_000)

  let event: Awaited<ReturnType<typeof calendar.events.insert>>['data']
  try {
    const res = await calendar.events.insert({
      calendarId,
      conferenceDataVersion: 1,
      requestBody: {
        summary: opts.title,
        start:   { dateTime: start.toISOString() },
        end:     { dateTime: end.toISOString() },
        conferenceData: {
          createRequest: {
            requestId:             `lms-meet-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
    })
    event = res.data
  } catch (apiErr: any) {
    const googleMsg: string =
      apiErr?.response?.data?.error?.message ??
      apiErr?.response?.data?.error ??
      apiErr?.message ??
      'Unknown Google API error'
    const status: number = apiErr?.response?.status ?? 502
    console.error('[googleMeet] Calendar API error', status, googleMsg)
    throw Object.assign(
      new Error(`Google Calendar API error (${status}): ${googleMsg}`),
      { status },
    )
  }

  const meetLink = event.conferenceData?.entryPoints?.find(
    ep => ep.entryPointType === 'video',
  )?.uri

  if (!meetLink) {
    throw Object.assign(
      new Error(
        'Google Calendar did not return a Meet link — ensure the Calendar API is enabled ' +
        'in your Cloud project and Google Meet is enabled for the account.',
      ),
      { status: 502 },
    )
  }

  return meetLink
}
