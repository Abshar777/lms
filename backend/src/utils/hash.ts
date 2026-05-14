import bcrypt from 'bcrypt'
import { env } from '@/config/env.ts'

/* ─── Hash password ─────────────────────────────────
   Uses BCRYPT_ROUNDS from env (default 12)
───────────────────────────────────────────────────── */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_ROUNDS)
}

/* ─── Compare password ──────────────────────────────
   Returns true if plain matches hashed
───────────────────────────────────────────────────── */
export async function comparePassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed)
}
