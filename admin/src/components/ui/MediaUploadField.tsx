'use client'

/**
 * MediaUploadField
 * ─────────────────
 * A drop-in replacement for a plain URL <input> that also lets the user
 * pick / drag-drop a file and upload it to the backend.
 *
 * Two display modes:
 *   • "full"    – tabbed card (URL | Upload) — used in CourseForm media tab
 *   • "compact" – inline text input with a paperclip upload button appended
 *                 — used in the compact lesson outline editor rows
 *
 * Props:
 *   value      – controlled URL value
 *   onChange   – called with the new URL (either typed or returned from upload)
 *   type       – "image" | "video"  (controls accept filter and upload endpoint)
 *   label      – field label (full mode only)
 *   hint       – help text shown below the label (full mode only)
 *   error      – validation error message
 *   mode       – "full" (default) | "compact"
 *   placeholder – overrides the default text-input placeholder
 *   disabled    – disables all interactions
 */

import { useRef, useState, useCallback, type DragEvent, type ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, Upload, Image, Film, X, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { useUploadImage, useUploadVideo } from '@/lib/api/upload'

/* ── Shared styling tokens (match admin dark theme) ── */
const BASE_INPUT =
  'w-full rounded-lg px-3 py-2 text-sm text-white outline-none transition-all placeholder:opacity-30'
const DARK_BG   = 'rgba(0,0,0,0.28)'
const BORDER    = '1px solid rgba(255,255,255,0.09)'
const FOCUS_BORDER = '1px solid rgba(255,107,26,0.65)'

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/* ─────────────────────────────────────────────────────────────
   Internal: hidden file input trigger + drag state
───────────────────────────────────────────────────────────── */
interface UseFilePickerOptions {
  accept: string
  onPick: (file: File) => void
}

function useFilePicker({ accept, onPick }: UseFilePickerOptions) {
  const ref = useRef<HTMLInputElement>(null)

  const open = useCallback(() => ref.current?.click(), [])

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) onPick(file)
      /* reset so the same file can be re-picked */
      if (ref.current) ref.current.value = ''
    },
    [onPick],
  )

  const input = (
    <input
      ref={ref}
      type="file"
      accept={accept}
      className="sr-only"
      onChange={handleChange}
      tabIndex={-1}
      aria-hidden
    />
  )

  return { open, input }
}

/* ─────────────────────────────────────────────────────────────
   Props
───────────────────────────────────────────────────────────── */
export interface MediaUploadFieldProps {
  value:       string
  onChange:    (url: string) => void
  type:        'image' | 'video'
  label?:      string
  hint?:       string
  error?:      string
  mode?:       'full' | 'compact'
  placeholder?: string
  disabled?:   boolean
}

/* ─────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────── */
export function MediaUploadField({
  value,
  onChange,
  type,
  label,
  hint,
  error,
  mode = 'full',
  placeholder,
  disabled = false,
}: MediaUploadFieldProps) {
  const [tab,       setTab]       = useState<'url' | 'upload'>('url')
  const [dragging,  setDragging]  = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  const [lastFile,  setLastFile]  = useState<{ name: string; size: number } | null>(null)

  const uploadImage = useUploadImage()
  const uploadVideo = useUploadVideo()
  const isUploading = uploadImage.isPending || uploadVideo.isPending
  const uploadDone  = !!value && !!lastFile

  const accept = type === 'image'
    ? 'image/jpeg,image/png,image/gif,image/webp'
    : 'video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska'

  /* ── Handle file pick (from either file-input or drop) ── */
  const handleFile = useCallback(async (file: File) => {
    setUploadErr(null)
    setLastFile({ name: file.name, size: file.size })
    try {
      const url = type === 'image'
        ? await uploadImage.mutateAsync(file)
        : await uploadVideo.mutateAsync(file)
      onChange(url)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message
        ?? (err instanceof Error ? err.message : 'Upload failed')
      setUploadErr(msg)
      setLastFile(null)
    }
  }, [type, uploadImage, uploadVideo, onChange])

  /* ── Hidden file input ── */
  const { open: openPicker, input: fileInput } = useFilePicker({ accept, onPick: handleFile })

  /* ── Drag handlers ── */
  const onDragOver  = (e: DragEvent) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = ()             => setDragging(false)
  const onDrop      = (e: DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  /* ── Clear uploaded file ── */
  const clear = () => {
    onChange('')
    setLastFile(null)
    setUploadErr(null)
    uploadImage.reset()
    uploadVideo.reset()
  }

  /* ══════════════════════════════════════════════════
     COMPACT MODE — inline input + clip button
  ══════════════════════════════════════════════════ */
  if (mode === 'compact') {
    return (
      <div className="relative flex items-center gap-1">
        {fileInput}
        <input
          value={value}
          onChange={e => { setLastFile(null); onChange(e.target.value) }}
          placeholder={placeholder ?? (type === 'image' ? 'Image URL or upload ↗' : 'Video URL or upload ↗')}
          disabled={disabled || isUploading}
          className={`${BASE_INPUT} pr-1`}
          style={{
            background: DARK_BG,
            border: error ? '1px solid rgba(239,68,68,0.55)' : BORDER,
          }}
          onFocus={e  => { e.currentTarget.style.border = FOCUS_BORDER }}
          onBlur={e   => { e.currentTarget.style.border = error ? '1px solid rgba(239,68,68,0.55)' : BORDER }}
        />
        {/* Upload button */}
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled || isUploading}
          title={`Upload ${type === 'image' ? 'image' : 'video'}`}
          className="flex-shrink-0 flex h-[34px] w-[34px] items-center justify-center rounded-lg transition-all disabled:opacity-40 hover:opacity-80"
          style={{ background: 'rgba(255,107,26,0.15)', border: '1px solid rgba(255,107,26,0.30)', color: '#FF6B1A' }}
        >
          {isUploading
            ? <Loader2 size={13} className="animate-spin" />
            : <Upload size={13} />}
        </button>
      </div>
    )
  }

  /* ══════════════════════════════════════════════════
     FULL MODE — tabbed card
  ══════════════════════════════════════════════════ */
  const TypeIcon = type === 'image' ? Image : Film
  const hints = type === 'image'
    ? 'JPG, PNG, GIF, WebP · max 5 MB'
    : 'MP4, WebM, MOV, AVI · max 500 MB'

  return (
    <div className="space-y-2">
      {fileInput}

      {/* Label */}
      {label && (
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          {hint && <p className="mt-0.5 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{hint}</p>}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl p-1"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {(['url', 'upload'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => { setTab(t); setUploadErr(null) }}
            disabled={disabled}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all"
            style={{
              background: tab === t ? 'rgba(255,107,26,0.18)' : 'transparent',
              color: tab === t ? '#FF6B1A' : 'rgba(255,255,255,0.45)',
              border: tab === t ? '1px solid rgba(255,107,26,0.30)' : '1px solid transparent',
            }}>
            {t === 'url' ? <Link size={11} /> : <Upload size={11} />}
            {t === 'url' ? 'Paste URL' : 'Upload file'}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <AnimatePresence mode="wait">
        {tab === 'url' ? (
          /* ── URL tab ── */
          <motion.div key="url"
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}>
            <div className="relative">
              <Link size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'rgba(255,255,255,0.25)' }} />
              <input
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder ?? (type === 'image' ? 'https://example.com/image.jpg' : 'https://example.com/video.mp4')}
                disabled={disabled}
                className={`${BASE_INPUT} pl-9`}
                style={{
                  background: DARK_BG,
                  border: error ? '1px solid rgba(239,68,68,0.55)' : BORDER,
                }}
                onFocus={e => { e.currentTarget.style.border = FOCUS_BORDER }}
                onBlur={e  => { e.currentTarget.style.border = error ? '1px solid rgba(239,68,68,0.55)' : BORDER }}
              />
            </div>
          </motion.div>
        ) : (
          /* ── Upload tab ── */
          <motion.div key="upload"
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="space-y-2">

            {/* Drop zone */}
            {!uploadDone && !isUploading && (
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={disabled ? undefined : openPicker}
                className="flex flex-col items-center gap-2 rounded-xl py-6 transition-all cursor-pointer"
                style={{
                  border: `1.5px dashed ${dragging ? '#FF6B1A' : 'rgba(255,255,255,0.12)'}`,
                  background: dragging ? 'rgba(255,107,26,0.06)' : 'rgba(255,255,255,0.02)',
                }}>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl"
                  style={{ background: 'rgba(255,107,26,0.10)', border: '1px solid rgba(255,107,26,0.20)' }}>
                  <TypeIcon size={20} style={{ color: '#FF6B1A' }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Drag & drop or{' '}
                    <span style={{ color: '#FF6B1A' }}>browse</span>
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{hints}</p>
                </div>
              </div>
            )}

            {/* Uploading state */}
            {isUploading && (
              <div className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{ background: 'rgba(255,107,26,0.07)', border: '1px solid rgba(255,107,26,0.18)' }}>
                <Loader2 size={16} className="animate-spin flex-shrink-0" style={{ color: '#FF6B1A' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    Uploading {lastFile?.name}…
                  </p>
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {lastFile ? humanSize(lastFile.size) : ''}
                  </p>
                </div>
              </div>
            )}

            {/* Success state */}
            {uploadDone && !isUploading && (
              <div className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.20)' }}>
                <CheckCircle2 size={16} className="flex-shrink-0" style={{ color: '#4ADE80' }} />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    {lastFile?.name}
                  </p>
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {lastFile ? humanSize(lastFile.size) : ''} · uploaded
                  </p>
                </div>
                <button type="button" onClick={clear}
                  className="flex-shrink-0 rounded-md p-0.5 transition-colors hover:bg-white/10"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                  title="Remove file">
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Re-pick after success */}
            {uploadDone && !isUploading && (
              <button type="button" onClick={openPicker} disabled={disabled}
                className="w-full rounded-lg py-1.5 text-xs font-semibold transition-all hover:opacity-80"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                Replace file
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image preview (URL tab, valid URL) */}
      {type === 'image' && value && tab === 'url' && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="overflow-hidden rounded-xl"
          style={{ maxWidth: 280, border: '1px solid rgba(255,255,255,0.07)' }}>
          <img src={value} alt="Preview" className="w-full object-cover" />
        </motion.div>
      )}

      {/* Uploaded image preview */}
      {type === 'image' && value && uploadDone && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="overflow-hidden rounded-xl"
          style={{ maxWidth: 280, border: '1px solid rgba(255,255,255,0.07)' }}>
          <img src={value} alt="Preview" className="w-full object-cover" />
        </motion.div>
      )}

      {/* Error */}
      {(error || uploadErr) && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5 text-xs"
          style={{ color: '#EF4444' }}>
          <AlertCircle size={12} />
          {uploadErr ?? error}
        </motion.div>
      )}
    </div>
  )
}
