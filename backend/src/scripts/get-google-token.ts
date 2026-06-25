/**
 * Run this script to get a new Google OAuth2 refresh token for support@deltagroups.ae
 *
 * Usage:
 *   bun run src/scripts/get-google-token.ts
 *
 * Then open the URL it prints, sign in as support@deltagroups.ae, allow access,
 * and paste the code from the URL back when prompted.
 */

import { google } from 'googleapis'
import * as readline from 'readline'

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌  Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment or .env')
  process.exit(1)
}

// redirect_uri must match one registered in Google Cloud Console
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'  // copy-paste flow (no server needed)

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/meetings.space.readonly',
  'https://www.googleapis.com/auth/drive.file',
]

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

const authUrl = oauth2Client.generateAuthUrl({
  access_type:  'offline',
  scope:         SCOPES,
  prompt:        'consent',          // forces Google to return a refresh_token
  login_hint:    'support@deltagroups.ae',
})

console.log('\n────────────────────────────────────────────────────────────')
console.log('1. Open this URL in a browser signed in as support@deltagroups.ae:')
console.log('\n' + authUrl + '\n')
console.log('2. Click Allow, then copy the code Google shows.')
console.log('────────────────────────────────────────────────────────────\n')

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
rl.question('Paste the code here: ', async (code) => {
  rl.close()
  try {
    const { tokens } = await oauth2Client.getToken(code.trim())
    console.log('\n✅  Success!\n')
    console.log('Add this to backend/.env:\n')
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`)
    if (tokens.access_token) {
      console.log(`\n(access_token for reference, expires soon — do NOT put in .env)`)
      console.log(`access_token: ${tokens.access_token}`)
    }
  } catch (err: any) {
    console.error('❌  Token exchange failed:', err?.message ?? err)
  }
})
