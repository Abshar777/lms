/**
 * migrate-live.ts
 *
 * Full production migration:
 *  1. Ensures Dubai + Bangalore organizations exist (idempotent)
 *  2. Assigns all content without organizationId → Dubai
 *  3. Converts legacy program-admin roles → sub_admin + program field
 *       4x_admin              → sub_admin, program: 'forex'
 *       digital_marketing_admin → sub_admin, program: 'digital_marketing'
 *       ai_admin              → sub_admin, program: 'ai'
 *  4. Assigns all staff without organizationId → Dubai
 *  5. Splits students/viewers by residential country
 *       homeCountry IN ('IN', 'India') → Bangalore
 *       everything else                → Dubai
 *
 * Usage:
 *   # Dry-run (no writes — shows counts only):
 *   MIGRATE_URI="mongodb://..." bun src/scripts/migrate-live.ts --dry-run
 *
 *   # Live run:
 *   MIGRATE_URI="mongodb://..." bun src/scripts/migrate-live.ts
 *
 * If MIGRATE_URI is not set, falls back to DATABASE_URL in .env
 * All operations are idempotent — safe to run multiple times.
 */

import 'dotenv/config'
import mongoose, { Types } from 'mongoose'
import {
  OrganizationModel,
  UserModel,
  CourseModel,
  LiveClassModel,
  EnrollmentModel,
  OrderModel,
  SupportTicketModel,
  CouponModel,
} from '@/models/schema.ts'

/* ── Config ─────────────────────────────────────────── */
const DRY_RUN = process.argv.includes('--dry-run')
const URI     = process.env.MIGRATE_URI ?? process.env.DATABASE_URL ?? ''

if (!URI) {
  console.error('❌  No URI — set MIGRATE_URI=... or DATABASE_URL in .env')
  process.exit(1)
}

/* ── Helpers ─────────────────────────────────────────── */
const INDIA_VALUES = ['IN', 'India', 'india']

function log(msg: string) { console.log(msg) }

async function count(model: mongoose.Model<any>, filter: object): Promise<number> {
  return model.countDocuments(filter)
}

async function maybeUpdate(
  label:  string,
  model:  mongoose.Model<any>,
  filter: object,
  update: object,
): Promise<void> {
  const n = await count(model, filter)
  if (DRY_RUN) {
    log(`  [dry-run] ${label}: would update ${n} documents`)
    return
  }
  if (n === 0) {
    log(`  ${label}: 0 documents to update — skipping`)
    return
  }
  const res = await (model as any).updateMany(filter, update)
  log(`  ${label}: ${res.modifiedCount} / ${n} updated`)
}

/* ── Main ────────────────────────────────────────────── */
async function run() {
  log(`\n${'─'.repeat(60)}`)
  log(`  Delta LMS — Live Migration`)
  log(`  Mode: ${DRY_RUN ? '🟡 DRY-RUN (no writes)' : '🔴 LIVE (writes enabled)'}`)
  log(`${'─'.repeat(60)}\n`)

  await mongoose.connect(URI)
  log('✅  Connected to MongoDB\n')

  /* ── AUDIT: current state ─────────────────────────── */
  log('📊  Current database state:')
  const [
    totalUsers, totalCourses, totalLiveClasses,
    totalEnrollments, totalOrders,
    usersNoOrg, coursesNoOrg, classesNoOrg,
    aiAdmins, dmAdmins, fxAdmins, subAdmins,
    indiaStudents, noOrgStudents,
  ] = await Promise.all([
    count(UserModel, {}),
    count(CourseModel, {}),
    count(LiveClassModel, {}),
    count(EnrollmentModel, {}),
    count(OrderModel, {}),
    count(UserModel, { organizationId: { $exists: false } }),
    count(CourseModel, { organizationId: { $exists: false } }),
    count(LiveClassModel, { organizationId: { $exists: false } }),
    count(UserModel, { role: 'ai_admin' }),
    count(UserModel, { role: 'digital_marketing_admin' }),
    count(UserModel, { role: '4x_admin' }),
    count(UserModel, { role: 'sub_admin' }),
    count(UserModel, {
      role: { $in: ['student', 'viewer'] },
      'enrollmentApplication.homeCountry': { $in: INDIA_VALUES },
    }),
    count(UserModel, {
      role: { $in: ['student', 'viewer'] },
      organizationId: { $exists: false },
    }),
  ])

  log(`  Users:         ${totalUsers}`)
  log(`  Courses:       ${totalCourses}`)
  log(`  Live classes:  ${totalLiveClasses}`)
  log(`  Enrollments:   ${totalEnrollments}`)
  log(`  Orders:        ${totalOrders}`)
  log('')
  log(`  Without organizationId:`)
  log(`    Users:       ${usersNoOrg}`)
  log(`    Courses:     ${coursesNoOrg}`)
  log(`    Classes:     ${classesNoOrg}`)
  log('')
  log(`  Legacy admin roles:`)
  log(`    ai_admin:                  ${aiAdmins}`)
  log(`    digital_marketing_admin:   ${dmAdmins}`)
  log(`    4x_admin:                  ${fxAdmins}`)
  log(`    sub_admin (already new):   ${subAdmins}`)
  log('')
  log(`  Students/viewers:`)
  log(`    From India (homeCountry IN/India): ${indiaStudents}`)
  log(`    Without organizationId:            ${noOrgStudents}`)
  log('')

  // Full role breakdown
  const allRoles = await UserModel.aggregate([
    { $group: { _id: '$role', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ])
  log(`  Role breakdown:`)
  for (const r of allRoles) log(`    ${String(r._id).padEnd(30)} ${r.count}`)

  // homeCountry breakdown for students
  const countries = await UserModel.aggregate([
    { $match: { role: { $in: ['student', 'viewer'] }, enrollmentApplication: { $exists: true } } },
    { $group: { _id: '$enrollmentApplication.homeCountry', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ])
  log('')
  log(`  Student homeCountry distribution:`)
  for (const c of countries) log(`    ${String(c._id ?? '(not set)').padEnd(30)} ${c.count}`)
  log('')

  /* ── STEP 1: Ensure organizations exist ───────────── */
  log('─'.repeat(60))
  log('Step 1 — Ensure organizations exist')
  log('─'.repeat(60))

  let dubaiOrg: any, bangaloreOrg: any

  if (DRY_RUN) {
    dubaiOrg     = await OrganizationModel.findOne({ slug: 'dubai' }).lean()
    bangaloreOrg = await OrganizationModel.findOne({ slug: 'bangalore' }).lean()
    if (!dubaiOrg)     log('  [dry-run] Would create Dubai organization')
    else               log(`  Dubai org exists:     ${dubaiOrg._id}`)
    if (!bangaloreOrg) log('  [dry-run] Would create Bangalore organization')
    else               log(`  Bangalore org exists: ${bangaloreOrg._id}`)

    if (!dubaiOrg || !bangaloreOrg) {
      log('\n  ⚠️  Orgs missing — run without --dry-run to create them first, then re-run.')
      await mongoose.disconnect()
      return
    }
  } else {
    dubaiOrg = await OrganizationModel.findOneAndUpdate(
      { slug: 'dubai' },
      { $setOnInsert: { name: 'Delta LMS Dubai', slug: 'dubai', currency: 'AED', paymentGateway: 'abzer', countryFilter: null } },
      { upsert: true, new: true },
    )
    bangaloreOrg = await OrganizationModel.findOneAndUpdate(
      { slug: 'bangalore' },
      { $setOnInsert: { name: 'Delta LMS Bangalore', slug: 'bangalore', currency: 'INR', paymentGateway: 'razorpay', countryFilter: 'India' } },
      { upsert: true, new: true },
    )
    log(`  Dubai org:     ${dubaiOrg._id}`)
    log(`  Bangalore org: ${bangaloreOrg._id}`)
  }

  const dubaiId     = dubaiOrg._id as Types.ObjectId
  const bangaloreId = bangaloreOrg._id as Types.ObjectId
  log('')

  /* ── STEP 2: Content → Dubai ──────────────────────── */
  log('─'.repeat(60))
  log('Step 2 — Assign unowned content → Dubai')
  log('─'.repeat(60))

  await maybeUpdate('Courses → Dubai',       CourseModel,       { organizationId: { $exists: false } }, { $set: { organizationId: dubaiId } })
  await maybeUpdate('Live classes → Dubai',  LiveClassModel,    { organizationId: { $exists: false } }, { $set: { organizationId: dubaiId } })
  await maybeUpdate('Enrollments → Dubai',   EnrollmentModel,   { organizationId: { $exists: false } }, { $set: { organizationId: dubaiId } })
  await maybeUpdate('Orders → Dubai',        OrderModel,        { organizationId: { $exists: false } }, { $set: { organizationId: dubaiId } })
  await maybeUpdate('Support tickets → Dubai', SupportTicketModel, { organizationId: { $exists: false } }, { $set: { organizationId: dubaiId } })
  await maybeUpdate('Coupons → Dubai',       CouponModel,       { organizationId: { $exists: false } }, { $set: { organizationId: dubaiId } })
  log('')

  /* ── STEP 3: Convert legacy admin roles ───────────── */
  log('─'.repeat(60))
  log('Step 3 — Convert legacy admin roles → sub_admin + program')
  log('─'.repeat(60))

  await maybeUpdate(
    'ai_admin → sub_admin (program: ai)',
    UserModel,
    { role: 'ai_admin' },
    { $set: { role: 'sub_admin', program: 'ai', organizationId: dubaiId } },
  )
  await maybeUpdate(
    'digital_marketing_admin → sub_admin (program: digital_marketing)',
    UserModel,
    { role: 'digital_marketing_admin' },
    { $set: { role: 'sub_admin', program: 'digital_marketing', organizationId: dubaiId } },
  )
  await maybeUpdate(
    '4x_admin → sub_admin (program: forex)',
    UserModel,
    { role: '4x_admin' },
    { $set: { role: 'sub_admin', program: 'forex', organizationId: dubaiId } },
  )
  log('')

  /* ── STEP 4: Staff → Dubai ────────────────────────── */
  log('─'.repeat(60))
  log('Step 4 — Assign unowned staff → Dubai')
  log('─'.repeat(60))

  await maybeUpdate(
    'Admins/support/instructors → Dubai',
    UserModel,
    { role: { $in: ['admin', 'sub_admin', 'support', 'instructor'] }, organizationId: { $exists: false } },
    { $set: { organizationId: dubaiId } },
  )
  log('')

  /* ── STEP 5: Split students by country ────────────── */
  log('─'.repeat(60))
  log('Step 5 — Split students/viewers by residential country')
  log('─'.repeat(60))

  // India students → Bangalore (handles both 'IN' and 'India' values)
  await maybeUpdate(
    'India students/viewers → Bangalore',
    UserModel,
    {
      role: { $in: ['student', 'viewer'] },
      'enrollmentApplication.homeCountry': { $in: INDIA_VALUES },
    },
    { $set: { organizationId: bangaloreId } },
  )

  // Non-India students with no org → Dubai
  await maybeUpdate(
    'Non-India students/viewers → Dubai',
    UserModel,
    {
      role: { $in: ['student', 'viewer'] },
      'enrollmentApplication.homeCountry': { $nin: INDIA_VALUES, $exists: true },
      organizationId: { $exists: false },
    },
    { $set: { organizationId: dubaiId } },
  )

  // Students with no enrollmentApplication at all → Dubai
  await maybeUpdate(
    'Students/viewers (no enrollment form) → Dubai',
    UserModel,
    {
      role: { $in: ['student', 'viewer'] },
      enrollmentApplication: { $exists: false },
      organizationId: { $exists: false },
    },
    { $set: { organizationId: dubaiId } },
  )
  log('')

  /* ── AUDIT: final state ───────────────────────────── */
  if (!DRY_RUN) {
    log('─'.repeat(60))
    log('📊  Final state after migration:')
    log('─'.repeat(60))

    const [
      afterUsersNoOrg, afterCoursesNoOrg, afterClassesNoOrg,
      afterAiAdmins, afterDmAdmins, afterFxAdmins, afterSubAdmins,
      afterDubaiUsers, afterBangaloreUsers,
    ] = await Promise.all([
      count(UserModel, { organizationId: { $exists: false } }),
      count(CourseModel, { organizationId: { $exists: false } }),
      count(LiveClassModel, { organizationId: { $exists: false } }),
      count(UserModel, { role: 'ai_admin' }),
      count(UserModel, { role: 'digital_marketing_admin' }),
      count(UserModel, { role: '4x_admin' }),
      count(UserModel, { role: 'sub_admin' }),
      count(UserModel, { organizationId: dubaiId }),
      count(UserModel, { organizationId: bangaloreId }),
    ])

    log(`  Users without org:    ${afterUsersNoOrg}  (was ${usersNoOrg})`)
    log(`  Courses without org:  ${afterCoursesNoOrg}  (was ${coursesNoOrg})`)
    log(`  Classes without org:  ${afterClassesNoOrg}  (was ${classesNoOrg})`)
    log('')
    log(`  Legacy roles remaining:`)
    log(`    ai_admin:                  ${afterAiAdmins}  (was ${aiAdmins})`)
    log(`    digital_marketing_admin:   ${afterDmAdmins}  (was ${dmAdmins})`)
    log(`    4x_admin:                  ${afterFxAdmins}  (was ${fxAdmins})`)
    log(`    sub_admin (new):           ${afterSubAdmins}  (was ${subAdmins})`)
    log('')
    log(`  Dubai users:     ${afterDubaiUsers}`)
    log(`  Bangalore users: ${afterBangaloreUsers}`)
  }

  log('\n' + '─'.repeat(60))
  log(DRY_RUN
    ? '✅  Dry-run complete — no data was changed'
    : '✅  Migration complete')
  log('─'.repeat(60) + '\n')

  await mongoose.disconnect()
}

run().catch(err => {
  console.error('\n❌  Migration failed:', err)
  process.exit(1)
})
