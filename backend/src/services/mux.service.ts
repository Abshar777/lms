import Mux from '@mux/mux-node'
import crypto from 'node:crypto'
import { env } from '@/config/env.ts'
import { logger } from '@/utils/logger.ts'

/* ── Singleton client ──────────────────────────────────── */
let _client: Mux | null = null

function getClient(): Mux {
  if (!_client) {
    if (!env.MUX_TOKEN_ID || !env.MUX_TOKEN_SECRET) {
      throw new Error('MUX_TOKEN_ID and MUX_TOKEN_SECRET must be set to use in-app streaming')
    }
    _client = new Mux({
      tokenId:     env.MUX_TOKEN_ID,
      tokenSecret: env.MUX_TOKEN_SECRET,
    })
  }
  return _client
}

export interface MuxStreamData {
  streamId:   string   // Mux live stream ID
  streamKey:  string   // RTMP stream key (keep secret)
  playbackId: string   // HLS playback ID (public)
}

/* RTMP ingest URL is the same for every Mux customer */
export const MUX_RTMP_URL = 'rtmps://global-live.mux.com:443/app'

/* Build student-facing HLS URL from playback ID */
export function buildPlaybackUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`
}

/* Build recording playback URL from asset playback ID */
export function buildRecordingUrl(assetPlaybackId: string): string {
  return `https://stream.mux.com/${assetPlaybackId}.m3u8`
}

/* Mux thumbnail image URL */
export function buildThumbnailUrl(playbackId: string): string {
  return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=0`
}

/* ── Create a new Mux live stream ─────────────────────── */
export async function createLiveStream(): Promise<MuxStreamData> {
  const mux = getClient()

  const stream = await mux.video.liveStreams.create({
    playback_policy:    ['public'],
    latency_mode:       'low',         // LL-HLS — ~2–4s latency
    reconnect_window:   60,            // wait 60s before ending if instructor drops
    new_asset_settings: {
      playback_policy: ['public'],     // recording is public after stream ends
      mp4_support:     'standard',     // enable MP4 download
    },
  })

  const playbackId = stream.playback_ids?.[0]?.id
  if (!playbackId) throw new Error('Mux did not return a playback ID')

  logger.info({ streamId: stream.id }, 'mux: live stream created')

  return {
    streamId:  stream.id,
    streamKey: stream.stream_key,
    playbackId,
  }
}

/* ── Delete a Mux live stream (cleanup) ───────────────── */
export async function deleteLiveStream(streamId: string): Promise<void> {
  try {
    const mux = getClient()
    await mux.video.liveStreams.delete(streamId)
    logger.info({ streamId }, 'mux: live stream deleted')
  } catch (err) {
    /* Log but don't throw — DB record deletion should still proceed */
    logger.warn({ err, streamId }, 'mux: failed to delete live stream (may already be deleted)')
  }
}

/* ── Enable a stream (instructor is about to go live) ─── */
export async function enableLiveStream(streamId: string): Promise<void> {
  const mux = getClient()
  await mux.video.liveStreams.enable(streamId)
  logger.info({ streamId }, 'mux: live stream enabled')
}

/* ── Disable a stream (instructor ended the session) ──── */
export async function disableLiveStream(streamId: string): Promise<void> {
  const mux = getClient()
  await mux.video.liveStreams.disable(streamId)
  logger.info({ streamId }, 'mux: live stream disabled')
}

/* ── Get a Mux asset (for recording URL) ─────────────── */
export async function getAssetPlaybackId(assetId: string): Promise<string | null> {
  try {
    const mux  = getClient()
    const asset = await mux.video.assets.retrieve(assetId)
    return asset.playback_ids?.[0]?.id ?? null
  } catch (err) {
    logger.warn({ err, assetId }, 'mux: failed to retrieve asset')
    return null
  }
}

/* ── Get current concurrent viewer count ─────────────
   Uses Mux Monitoring API — returns total live viewers
   across the environment (acceptable for single-stream LMS) */
export async function getLiveViewerCount(): Promise<number> {
  try {
    const mux  = getClient()
    const resp = await mux.data.monitoring.metrics.getBreakdown(
      'current-concurrent-viewers',
      { filters: ['stream_type:live'] },
    )
    return resp.data.reduce((sum, item) => sum + (item.concurrent_viewers ?? 0), 0)
  } catch (err) {
    logger.warn({ err }, 'mux: failed to fetch viewer count (non-fatal)')
    return 0
  }
}

/* ── Verify Mux webhook signature ────────────────────── */
export function verifyWebhookSignature(
  rawBody:   Buffer | string,
  signature: string | undefined,
): boolean {
  if (!env.MUX_WEBHOOK_SECRET || !signature) return false

  /* Mux signature header format: "t=<timestamp>,v1=<hmac>" */
  const parts   = Object.fromEntries(signature.split(',').map(p => p.split('=')))
  const ts      = parts['t']
  const v1      = parts['v1']
  if (!ts || !v1) return false

  const body    = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8')
  const payload = `${ts}.${body}`

  const expected = crypto
    .createHmac('sha256', env.MUX_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')

  /* Constant-time comparison to prevent timing attacks */
  try {
    return crypto.timingSafeEqual(Buffer.from(v1, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}
