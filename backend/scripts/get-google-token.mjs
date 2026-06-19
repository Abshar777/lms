/**
 * One-time script to generate a Google OAuth2 refresh token for support@deltagroups.ae
 * with the scopes needed for Meet link creation + auto-recording fetch.
 *
 * Prerequisites (do once in Google Cloud Console):
 *   1. Enable "Google Meet API":
 *      console.cloud.google.com → APIs & Services → Library → "Google Meet API" → Enable
 *
 *   2. Add redirect URI to your OAuth2 client:
 *      console.cloud.google.com → APIs & Services → Credentials → [your OAuth client]
 *      → Authorized redirect URIs → + Add URI → http://localhost:4242 → Save
 *
 * Usage (from the backend directory):
 *   node scripts/get-google-token.mjs
 *
 * Sign in as support@deltagroups.ae (NOT personal Gmail) when the browser opens.
 * Paste the printed GOOGLE_REFRESH_TOKEN into .env and set GOOGLE_CALENDAR_ID=support@deltagroups.ae
 */

import http from 'http'
import { exec } from 'child_process'
import { google } from 'googleapis'

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     || 'YOUR_GOOGLE_CLIENT_ID'
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET'
const REDIRECT_URI  = 'http://localhost:4242'

if (CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID' || CLIENT_SECRET === 'YOUR_GOOGLE_CLIENT_SECRET') {
  console.error('❌ Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET as env vars before running.')
  console.error('   Example: GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy node scripts/get-google-token.mjs')
  process.exit(1)
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt:      'consent',
  scope: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    // Required for auto-fetching Meet recordings via Meet API v2
    'https://www.googleapis.com/auth/meetings.space.readonly',
  ],
})

console.log('\n╔══════════════════════════════════════════════════════╗')
console.log('║      Google OAuth2 Token Generator — Delta LMS       ║')
console.log('╚══════════════════════════════════════════════════════╝')
console.log('\nSign in as support@deltagroups.ae (NOT personal Gmail)\n')
console.log('If browser does not open, paste this URL manually:\n')
console.log(authUrl)
console.log('\nWaiting for Google to redirect back...\n')

// Auto-open browser
const openCmd =
  process.platform === 'win32' ? `start "" "${authUrl}"` :
  process.platform === 'darwin' ? `open "${authUrl}"` :
  `xdg-open "${authUrl}"`
exec(openCmd)

const server = http.createServer(async (req, res) => {
  const url  = new URL(req.url, REDIRECT_URI)
  const code = url.searchParams.get('code')
  const err  = url.searchParams.get('error')

  if (err) {
    res.writeHead(400, { 'Content-Type': 'text/html' })
    res.end(`<h2>Error: ${err}</h2><p>Check the terminal.</p>`)
    console.error('❌ OAuth error:', err)
    server.close()
    return
  }

  if (!code) {
    res.end('<h2>Waiting...</h2>')
    return
  }

  try {
    const { tokens } = await oauth2Client.getToken(code)

    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(`
      <html><body style="font-family:monospace;padding:32px;background:#0d0f1a;color:#fff">
        <h2 style="color:#10B981">✅ Token generated — check the terminal</h2>
        <p style="color:#9CA3AF">Copy the GOOGLE_REFRESH_TOKEN from the terminal and close this tab.</p>
      </body></html>
    `)

    console.log('\n╔══════════════════════════════════════════════════════╗')
    console.log('║  ✅  Add these to your backend .env file             ║')
    console.log('╚══════════════════════════════════════════════════════╝\n')
    console.log(`GOOGLE_CLIENT_ID=${CLIENT_ID}`)
    console.log(`GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}`)
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token ?? '(null — try again with prompt=consent)'}`)
    console.log(`GOOGLE_CALENDAR_ID=support@deltagroups.ae`)
    console.log()

    server.close()
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/html' })
    res.end(`<h2>Token exchange failed</h2><pre>${e.message}</pre>`)
    console.error('❌ Token exchange failed:', e.message)
    server.close()
  }
})

server.listen(4242, () => {
  console.log('Listening on http://localhost:4242 — complete the sign-in in your browser...')
})
