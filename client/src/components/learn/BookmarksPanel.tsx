'use client'

import { Bookmark, Trash2, Loader2, Clock } from 'lucide-react'
import { useLessonBookmarks, useDeleteBookmark } from '@/lib/api/bookmarks'

function fmtTime(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

interface Props {
  lessonId:   string
  onSeek?:    (timeSecs: number) => void
}

export function BookmarksPanel({ lessonId, onSeek }: Props) {
  const { data: bookmarks, isLoading } = useLessonBookmarks(lessonId)
  const del = useDeleteBookmark(lessonId)

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 size={18} className="animate-spin" style={{ color: '#D1D5DB' }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>
          Bookmarks
        </p>
        <p className="text-[10px]" style={{ color: '#9CA3AF' }}>
          Use the 🔖 button in the player to add
        </p>
      </div>

      {bookmarks?.length === 0 ? (
        <div className="py-8 text-center">
          <Bookmark size={22} className="mx-auto mb-2" style={{ color: '#E5E7EB' }} />
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            No bookmarks yet. Click the bookmark button while watching to save a timestamp.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {bookmarks?.map(bm => (
            <div key={bm.id}
              className="group flex items-center gap-2 rounded-xl px-3 py-2 transition-colors"
              style={{ background: '#F9FAFB', border: '1px solid #F0F1F5' }}>
              <button
                onClick={() => onSeek?.(bm.timeSecs)}
                className="flex flex-1 items-center gap-2.5 text-left"
                title="Jump to this timestamp">
                <span className="flex h-7 w-14 flex-shrink-0 items-center justify-center rounded-lg text-[11px] font-mono font-bold"
                  style={{ background: 'rgba(255,107,26,0.10)', color: '#FF6B1A' }}>
                  <Clock size={9} className="mr-0.5" />{fmtTime(bm.timeSecs)}
                </span>
                <span className="flex-1 truncate text-xs font-medium" style={{ color: '#374151' }}>
                  {bm.label || `Bookmark at ${fmtTime(bm.timeSecs)}`}
                </span>
              </button>
              <button
                onClick={() => del.mutate(bm.id)}
                disabled={del.isPending}
                className="flex-shrink-0 rounded-lg p-1 opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-40">
                <Trash2 size={11} style={{ color: '#EF4444' }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
