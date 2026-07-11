'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShoppingBag, RotateCcw, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { useAdminOrders, type AdminOrder } from '@/lib/api/stats'
import { api } from '@/lib/axios'
import { useQueryClient } from '@tanstack/react-query'
import Spinner from '@/components/ui/Spinner'

const STATUS_TABS = ['all', 'pending', 'paid', 'refunded'] as const
type StatusTab = typeof STATUS_TABS[number]

function asUser(o: AdminOrder) {
  return typeof o.userId === 'object' && o.userId !== null ? o.userId : null
}
function asCourse(o: AdminOrder) {
  return typeof o.courseId === 'object' && o.courseId !== null ? o.courseId : null
}

const STATUS_COLOR: Record<string, string> = {
  paid:     '#4ADE80',
  pending:  '#FACC15',
  refunded: 'rgba(255,255,255,0.35)',
}

export default function AdminOrdersPage() {
  const [status, setStatus] = useState<StatusTab>('all')
  const [page,   setPage]   = useState(1)
  const [refunding, setRefunding] = useState<string | null>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useAdminOrders(page, status)

  const handleRefund = async (orderId: string) => {
    if (!confirm('Issue a full refund for this order? This cannot be undone.')) return
    setRefunding(orderId)
    try {
      await api.post(`/admin/orders/${orderId}/refund`)
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
      qc.invalidateQueries({ queryKey: ['admin', 'analytics', 'revenue'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    } catch (err: any) {
      alert(err?.response?.data?.error?.message ?? 'Refund failed')
    } finally {
      setRefunding(null)
    }
  }

  const formatUSD = (cents: number, currency = 'usd') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
          Orders
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          All Stripe payment records across the platform.
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 rounded-2xl p-1 w-fit" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {STATUS_TABS.map(tab => (
          <button key={tab} onClick={() => { setStatus(tab); setPage(1) }}
            className="relative rounded-xl px-4 py-2 text-xs font-semibold capitalize transition-colors"
            style={{
              background: status === tab ? 'rgba(255,255,255,0.12)' : 'transparent',
              color:      status === tab ? 'white' : 'rgba(255,255,255,0.4)',
            }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Date', 'Student', 'Course', 'Amount', 'Discount', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Spinner size={18} variant="muted" />
                  </td>
                </tr>
              ) : !data?.orders.length ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    No orders found.
                  </td>
                </tr>
              ) : data.orders.map((order, i) => {
                const user   = asUser(order)
                const course = asCourse(order)
                return (
                  <motion.tr key={order.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-4 py-3" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-white">{user?.name ?? '—'}</p>
                        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{user?.email ?? ''}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="max-w-[180px] truncate font-medium text-white">{course?.title ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 font-bold text-white tabular-nums">
                      {formatUSD(order.amount, order.currency)}
                    </td>
                    <td className="px-4 py-3 tabular-nums" style={{ color: order.discountAmount > 0 ? '#4ADE80' : 'rgba(255,255,255,0.3)' }}>
                      {order.discountAmount > 0 ? `-${formatUSD(order.discountAmount, order.currency)}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-lg px-2 py-0.5 text-[11px] font-semibold capitalize"
                        style={{
                          background: `${STATUS_COLOR[order.status] ?? '#fff'}18`,
                          color:      STATUS_COLOR[order.status] ?? 'white',
                        }}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {order.stripeInvoiceUrl && (
                          <a href={order.stripeInvoiceUrl} target="_blank" rel="noopener noreferrer"
                            className="rounded-lg p-1.5 transition-colors hover:bg-white/05"
                            title="View invoice">
                            <ExternalLink size={12} style={{ color: 'rgba(255,255,255,0.5)' }} />
                          </a>
                        )}
                        {order.status === 'paid' && (
                          <button
                            onClick={() => handleRefund(order.id)}
                            disabled={refunding === order.id}
                            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors hover:bg-white/05 disabled:opacity-40"
                            style={{ color: '#F87171' }}>
                            {refunding === order.id
                              ? <Spinner size={11} />
                              : <RotateCcw size={11} />}
                            Refund
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.meta && data.meta.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Page {data.meta.page} of {data.meta.total_pages} · {data.meta.total_count} total
            </p>
            <div className="flex gap-1">
              <button disabled={!data.meta.has_prev} onClick={() => setPage(p => p - 1)}
                className="rounded-lg p-1.5 transition-colors disabled:opacity-30 hover:bg-white/05">
                <ChevronLeft size={14} style={{ color: 'white' }} />
              </button>
              <button disabled={!data.meta.has_next} onClick={() => setPage(p => p + 1)}
                className="rounded-lg p-1.5 transition-colors disabled:opacity-30 hover:bg-white/05">
                <ChevronRight size={14} style={{ color: 'white' }} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
