import { google } from 'googleapis'

function makeOAuth2Client() {
  const clientId     = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw Object.assign(
      new Error(
        'Google Meet is not configured — add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ' +
        'and GOOGLE_REFRESH_TOKEN to your .env file.',
      ),
      { status: 503 },
    )
  }

  const client = new google.auth.OAuth2(clientId, clientSecret)
  client.setCredentials({ refresh_token: refreshToken })
  return client
}

/**
 * Creates a Google Calendar event and returns the attached Google Meet link + meeting code.
 *
 * Required env vars:
 *   GOOGLE_CLIENT_ID       — OAuth2 Client ID from Google Cloud Console
 *   GOOGLE_CLIENT_SECRET   — OAuth2 Client Secret
 *   GOOGLE_REFRESH_TOKEN   — long-lived refresh token (must be for a Google Workspace account
 *                            to support recording; personal Gmail cannot record)
 *   GOOGLE_CALENDAR_ID     — calendar to create events on (default: "primary")
 */
export async function createGoogleMeetLink(opts: {
  title:        string
  startISO:     string
  durationMins: number
}): Promise<{ meetingUrl: string; meetingCode: string }> {
  const oauth2Client = makeOAuth2Client()
  const calendarId   = process.env.GOOGLE_CALENDAR_ID ?? 'primary'

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

  // Extract the meeting code from the URL: meet.google.com/abc-def-ghij → "abc-def-ghij"
  const meetingCode = meetLink.split('/').pop() ?? ''

  return { meetingUrl: meetLink, meetingCode }
}

/**
 * Polls the Google Meet REST API v2 to find the recording for a given meeting code.
 * Returns the Google Drive shareable URL of the first completed recording, or null if not ready.
 * Also automatically sets the Drive file to "anyone with the link can view" so students can watch.
 *
 * Requires the OAuth2 refresh token to have scopes:
 *   https://www.googleapis.com/auth/meetings.space.readonly
 *   https://www.googleapis.com/auth/drive.file  (for sharing the recording)
 */
export async function fetchMeetRecordingUrl(meetingCode: string): Promise<string | null> {
  let oauth2Client: ReturnType<typeof makeOAuth2Client>
  try {
    oauth2Client = makeOAuth2Client()
  } catch {
    return null
  }

  try {
    const meet = google.meet({ version: 'v2', auth: oauth2Client })

    // Find the conference record for this meeting code
    const recordsRes = await meet.conferenceRecords.list({
      filter: `space.meetingCode = "${meetingCode}"`,
    })

    const records = recordsRes.data.conferenceRecords
    if (!records?.length) return null

    // Use the most recent conference record
    const record = records[0]
    if (!record.name) return null

    // Get recordings for this conference
    const recordingsRes = await meet.conferenceRecords.recordings.list({
      parent: record.name,
    })

    const recordings = recordingsRes.data.recordings
    if (!recordings?.length) return null

    // Find first completed recording with a Drive destination
    for (const rec of recordings) {
      if (rec.state === 'COMPLETED' && rec.driveDestination?.file) {
        const fileId = rec.driveDestination.file.replace('files/', '')

        // Auto-share the Drive file so anyone with the link can view it
        try {
          const drive = google.drive({ version: 'v3', auth: oauth2Client })
          await drive.permissions.create({
            fileId,
            requestBody: { role: 'reader', type: 'anyone' },
          })
        } catch (shareErr: any) {
          // Non-fatal — URL is still usable if sharing fails (admin can share manually)
          console.warn('[googleMeet] Could not auto-share recording:', shareErr?.message)
        }

        // Return a clean shareable Drive link
        return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`
      }
    }

    return null
  } catch (err: any) {
    // 403 = scope not granted; 404 = no conference found yet — both are non-fatal during polling
    const status = err?.response?.status ?? err?.status
    if (status === 403) {
      console.warn(
        '[googleMeet] fetchMeetRecordingUrl: 403 — refresh token lacks meetings.space.readonly scope. ' +
        'Re-authorize with support@deltagroups.ae and add the scope.',
      )
    }
    return null
  }
}
