/**
 * seed-roles.ts
 * Creates test admin/mentor user accounts for local development.
 * Run with: bun run backend/scripts/seed-roles.ts
 */

import { MongoClient } from 'mongodb'
import bcrypt from 'bcrypt'

const MONGO_URI = 'mongodb://localhost:27017/lms'
const BCRYPT_ROUNDS = 12

interface SeedUser {
  name: string
  email: string
  password: string
  role: string
  category?: '4x-trading' | 'digital-marketing'
}

const users: SeedUser[] = [
  {
    name:     'Test Admin',
    email:    'admin@gmail.com',
    password: '12345678',
    role:     'admin',
  },
  {
    name:     '4x Admin',
    email:    '4xadmin@gmail.com',
    password: '12345678',
    role:     '4x_admin',
    category: '4x-trading',
  },
  {
    name:     'DM Admin',
    email:    'dmadmin@gmail.com',
    password: '12345678',
    role:     'digital_marketing_admin',
    category: 'digital-marketing',
  },
  {
    name:     'Test Mentor',
    email:    'mentor@gmail.com',
    password: '12345678',
    role:     'mentor',
  },
]

async function main() {
  const client = new MongoClient(MONGO_URI)
  try {
    await client.connect()
    console.log('Connected to MongoDB')
    const db   = client.db()
    const col  = db.collection('users')

    for (const u of users) {
      const existing = await col.findOne({ email: u.email })
      if (existing) {
        console.log(`SKIP  ${u.email}  (already exists)`)
        continue
      }

      const hashedPassword = await bcrypt.hash(u.password, BCRYPT_ROUNDS)
      const now = new Date()
      const doc: Record<string, unknown> = {
        name:        u.name,
        email:       u.email,
        password:    hashedPassword,
        role:        u.role,
        isActive:    true,
        isVerified:  true,
        createdAt:   now,
        updatedAt:   now,
      }
      if (u.category) doc['category'] = u.category

      await col.insertOne(doc)
      console.log(`CREATED  ${u.email}  role=${u.role}${u.category ? `  category=${u.category}` : ''}`)
    }

    console.log('\nDone.')
  } finally {
    await client.close()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
