import mongoose from 'mongoose'
import bcrypt from 'bcrypt'

const MONGO_URI = process.env.DATABASE_URL ?? 'mongodb://localhost:27017/lms'
const EMAIL     = 'admin@lms.local'
const PASSWORD  = 'Admin1234'
const NAME      = 'Super Admin'

async function main() {
  await mongoose.connect(MONGO_URI)
  console.log('Connected to MongoDB')

  const passwordHash = await bcrypt.hash(PASSWORD, 12)

  const result = await mongoose.connection.collection('users').updateOne(
    { email: EMAIL },
    {
      $set: {
        name:             NAME,
        email:            EMAIL,
        passwordHash,
        role:             'super_admin',
        isVerified:       true,
        isActive:         true,
        enrollmentStatus: 'approved',
        provider:         'local',
        updatedAt:        new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true },
  )

  if (result.upsertedCount > 0) {
    console.log(`✅ Super admin created: ${EMAIL}`)
  } else {
    console.log(`✅ Super admin updated: ${EMAIL}`)
  }

  await mongoose.disconnect()
}

main().catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
