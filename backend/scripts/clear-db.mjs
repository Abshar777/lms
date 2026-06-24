/**
 * clear-db.mjs — wipe all data from every collection in the LMS database.
 *
 * Usage:
 *   node scripts/clear-db.mjs --confirm
 *
 * Safety gates:
 *   • Requires --confirm flag — will NOT run without it
 *   • Reads DATABASE_URL from backend/.env automatically
 *   • Shows a summary of what will be cleared before connecting
 *   • Prints deleted counts per collection
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'

const __dirname = dirname(fileURLToPath(import.meta.url))

/* ── Safety gate ───────────────────────────────────── */
if (!process.argv.includes('--confirm')) {
  console.error('\n⛔  Refused to run without --confirm flag.')
  console.error('    This script deletes ALL data in every collection.')
  console.error('\n    Run: node scripts/clear-db.mjs --confirm\n')
  process.exit(1)
}

/* ── Read DATABASE_URL from .env ───────────────────── */
function loadEnv() {
  const envPath = resolve(__dirname, '../.env')
  const raw = readFileSync(envPath, 'utf-8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const [key, ...rest] = trimmed.split('=')
    if (key.trim() === 'DATABASE_URL') return rest.join('=').trim()
  }
  throw new Error('DATABASE_URL not found in .env')
}

const DATABASE_URL = loadEnv()
const dbName = DATABASE_URL.split('/').pop()?.split('?')[0] ?? 'lms'

/* ── Collections to clear ───────────────────────────── */
const COLLECTIONS = [
  // Auth & Users
  'users',
  'roles',
  'refreshtokens',
  'authtokens',

  // Content
  'courses',
  'sections',
  'lessons',
  'categories',
  'learningpaths',

  // Commerce
  'orders',
  'coupons',

  // Learning
  'enrollments',
  'lessonprogresses',
  'quizzes',
  'quizattempts',
  'assignments',
  'assignmentsubmissions',

  // Live Classes
  'liveclasses',
  'classbookings',
  'mentoravailabilities',
  'sessionhomeworks',
  'homeworksubmissions',
  'classfeedbacks',

  // Social & Activity
  'reviews',
  'reviewvotes',
  'discussionthreads',
  'discussioncomments',
  'lessonnotes',
  'videobookmarks',
  'favorites',

  // Gamification
  'userachievements',
  'userstreaks',

  // System
  'notifications',
  'auditlogs',
  'supporttickets',
]

/* ── Preview ────────────────────────────────────────── */
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  🗑️   LMS Database Clear Script')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`  Database : ${dbName}`)
console.log(`  Collections to clear: ${COLLECTIONS.length}`)
console.log('')
COLLECTIONS.forEach(c => console.log(`    • ${c}`))
console.log('')

/* ── Connect & clear ────────────────────────────────── */
async function run() {
  console.log('  Connecting to database…')

  await mongoose.connect(DATABASE_URL, {
    serverSelectionTimeoutMS: 10_000,
    authSource:"admin"
  })

  console.log(`  ✅  Connected to "${dbName}"\n`)
  console.log('  Clearing collections…\n')

  const db = mongoose.connection.db
  let totalDeleted = 0

  for (const name of COLLECTIONS) {
    try {
      const col = db.collection(name)
      const result = await col.deleteMany({})
      const count = result.deletedCount
      totalDeleted += count
      const label = count > 0 ? `${count} docs deleted` : 'already empty'
      console.log(`    ✓  ${name.padEnd(26)} ${label}`)
    } catch (err) {
      console.warn(`    ⚠  ${name.padEnd(26)} skipped (${err.message})`)
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  ✅  Done. ${totalDeleted} total documents deleted.`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  await mongoose.disconnect()
}

run().catch(err => {
  console.error('\n❌  Fatal error:', err.message)
  process.exit(1)
})
