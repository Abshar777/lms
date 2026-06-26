import { google, type calendar_v3 } from 'googleapis'
import * as fs from 'fs'
import * as path from 'path'

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

// Uses Domain-Wide Delegation to impersonate a Workspace user when creating Calendar events.
// The service account JSON key must be at backend/google-service-account.json.
function makeServiceAccountAuth(impersonateEmail: string) {
  const keyPath = path.join(process.cwd(), 'google-service-account.json')

  let key: { client_email: string; private_key: string }
  try {
    const raw = fs.readFileSync(keyPath, 'utf-8')
    key = JSON.parse(raw)
  } catch {
    throw Object.assign(
      new Error(
        'google-service-account.json not found in backend/ — ' +
        'download the service account JSON key from Google Cloud and place it there.',
      ),
      { status: 503 },
    )
  }

  return new google.auth.JWT({
    email:   key.client_email,
    key:     key.private_key,
    scopes:  [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    subject: impersonateEmail,
  })
}

/**
 * Creates a Google Calendar event and returns the attached Google Meet link + meeting code.
 *
 * Required env vars:
 *   GOOGLE_CLIENT_ID        — OAuth2 Client ID from Google Cloud Console
 *   GOOGLE_CLIENT_SECRET    — OAuth2 Client Secret
 *   GOOGLE_REFRESH_TOKEN    — long-lived refresh token for support@deltagroups.ae (fallback)
 *   GOOGLE_CALENDAR_ID      — fallback calendar (default: "primary")
 *   GOOGLE_WORKSPACE_DOMAIN — domain for internal instructor check (default: "deltagroups.ae")
 *
 * When instructorEmail is a @deltagroups.ae address, the event is created on the instructor's
 * own calendar via DWD (service account impersonation), making them the automatic Meet host.
 * External instructors fall back to the support@ calendar as the host.
 */
export async function createGoogleMeetLink(opts: {
  title:            string
  startISO:         string
  durationMins:     number
  instructorEmail?: string
}): Promise<{ meetingUrl: string; meetingCode: string }> {
  const WORKSPACE_DOMAIN     = process.env.GOOGLE_WORKSPACE_DOMAIN ?? 'deltagroups.ae'
  const instructorIsInternal = opts.instructorEmail?.endsWith(`@${WORKSPACE_DOMAIN}`) ?? false

  const auth       = instructorIsInternal ? makeServiceAccountAuth(opts.instructorEmail!) : makeOAuth2Client()
  const calendarId = instructorIsInternal
    ? opts.instructorEmail!
    : (process.env.GOOGLE_CALENDAR_ID ?? 'primary')

  if (instructorIsInternal) {
    console.info(`[googleMeet] Creating event on instructor calendar via DWD: ${opts.instructorEmail}`)
  }

  const calendar = google.calendar({ version: 'v3', auth })
  const start    = new Date(opts.startISO)
  const end      = new Date(start.getTime() + opts.durationMins * 60_000)

  let event: calendar_v3.Schema$Event
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
    if (!record) return null
    const recordName = record.name
    if (!recordName) return null

    // Get recordings for this conference
    const recordingsRes = await meet.conferenceRecords.recordings.list({
      parent: recordName,
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
