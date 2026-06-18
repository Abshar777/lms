/**
 * One-time script to get a Google OAuth2 refresh token.
 *
 * Usage:
 *   GOOGLE_CLIENT_ID=<your-id> GOOGLE_CLIENT_SECRET=<your-secret> node scripts/get-google-token.mjs
 *
 * Or set the values below directly (do NOT commit with real values).
 *
 * It starts a local server on port 4242, opens the auth URL, and captures
 * the code automatically when Google redirects back.
 *
 * Redirect URI must be registered in Google Cloud Console:
 *   APIs & Services → Credentials → OAuth 2.0 Client → Authorized redirect URIs
 *   Add: http://localhost:4242
 */

import http from 'http'
import { google } from 'googleapis'

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     || 'YOUR_GOOGLE_CLIENT_ID'
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET'
const REDIRECT_URI  = 'http://localhost:4242'

if (CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID' || CLIENT_SECRET === 'YOUR_GOOGLE_CLIENT_SECRET') {
  console.error('❌ Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET as env vars before running.')
  process.exit(1)
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt:      'consent',
  scope: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ],
})

console.log('\n1. Open this URL in your browser and sign in as the Google Workspace account:\n')
console.log(authUrl)
console.log('\nWaiting for Google to redirect back...\n')

const server = http.createServer(async (req, res) => {
  const url  = new URL(req.url, REDIRECT_URI)
  const code = url.searchParams.get('code')
  const err  = url.searchParams.get('error')

  if (err) {
    res.end(`<h2>Error: ${err}</h2><p>Check the terminal.</p>`)
    console.error('❌ OAuth error:', err)
    server.close()
    return
  }

  if (!code) {
    res.end('<h2>Waiting...</h2>')
    return
  }

  res.end('<h2>✅ Done! You can close this tab.</h2><p>Check the terminal for your env vars.</p>')
  server.close()

  try {
    const { tokens } = await oauth2Client.getToken(code)
    console.log('✅ Success! Add these to your backend .env file:\n')
    console.log(`GOOGLE_CLIENT_ID=${CLIENT_ID}`)
    console.log(`GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}`)
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`)
    console.log(`GOOGLE_CALENDAR_ID=primary`)
    console.log()
  } catch (e) {
    console.error('❌ Token exchange failed:', e.message)
  }
})

server.listen(4242, () => {
  console.log('Local server listening on http://localhost:4242')
})
