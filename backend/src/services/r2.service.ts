import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import path from 'path'
import crypto from 'crypto'
import { env } from '@/config/env.ts'

/* ── S3 client (Cloudflare R2 is S3-compatible) ───────────────
   Endpoint: https://<accountId>.r2.cloudflarestorage.com
────────────────────────────────────────────────────────────── */
let _client: S3Client | null = null

function getClient(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId:     env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
      // R2 doesn't support AWS checksum algorithms — disable auto-injection
      // so presigned PUT URLs don't include x-amz-checksum-crc32 as a signed
      // parameter (which the browser XHR can't satisfy → 403 SignatureDoesNotMatch)
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    })
  }
  return _client
}

/* ── Key helpers ─────────────────────────────────────────────── */
export function makeKey(originalName: string, folder = 'misc'): string {
  const ext    = path.extname(originalName).toLowerCase()
  const random = crypto.randomBytes(8).toString('hex')
  return `${folder}/${Date.now()}-${random}${ext}`
}

export function getPublicUrl(key: string): string {
  return `${env.R2_PUBLIC_URL}/${key}`
}

/* ── Upload buffer directly to R2 ───────────────────────────── */
export async function uploadToR2(
  buffer:      Buffer,
  key:         string,
  contentType: string,
): Promise<string> {
  const client = getClient()
  await client.send(
    new PutObjectCommand({
      Bucket:      env.R2_BUCKET_NAME,
      Key:         key,
      Body:        buffer,
      ContentType: contentType,
    }),
  )
  return getPublicUrl(key)
}

/* ── Generate a presigned PUT URL (client → R2 direct upload) ─ */
export async function generatePresignedPutUrl(
  key:         string,
  contentType: string,
  expiresIn = 3600, // 1 hour
): Promise<{ presignedUrl: string; publicUrl: string; key: string }> {
  const client = getClient()
  const command = new PutObjectCommand({
    Bucket:      env.R2_BUCKET_NAME,
    Key:         key,
    ContentType: contentType,
  })
  const presignedUrl = await getSignedUrl(client, command, { expiresIn })
  return { presignedUrl, publicUrl: getPublicUrl(key), key }
}

/* ── Delete an object from R2 ───────────────────────────────── */
export async function deleteFromR2(key: string): Promise<void> {
  const client = getClient()
  await client.send(
    new DeleteObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key:    key,
    }),
  )
}
