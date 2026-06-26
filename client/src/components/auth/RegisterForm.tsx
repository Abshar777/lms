'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Mail, Lock, Phone, AlertCircle, Eye, EyeOff,
  Upload, ChevronRight, ChevronLeft, Loader2, Check, FileText, X,
  ChevronDown, Search,
} from 'lucide-react'
import { api } from '@/lib/axios'
import { cn } from '@/lib/utils'

/* ── Types ─────────────────────────────────────────── */
interface FormData {
  name: string; email: string; phone: string; emergencyContact: string
  gender: string; dateOfBirth: string; nationality: string; homeCountry: string
  occupation: string; emiratesId: string
  countryAttendance: string; villa: string; city: string; addressCountry: string
  passportFile: File | null; photoFile: File | null
  experienceLevel: string; preferredStartDate: string; hearAboutUs: string
  referralName: string; programs: string[]
  paymentMethod: string; password: string; confirmPassword: string; termsAccepted: boolean
}

const INITIAL: FormData = {
  name: '', email: '', phone: '', emergencyContact: '',
  gender: '', dateOfBirth: '', nationality: '', homeCountry: '',
  occupation: '', emiratesId: '', countryAttendance: '', villa: '',
  city: '', addressCountry: '', passportFile: null, photoFile: null,
  experienceLevel: '', preferredStartDate: '', hearAboutUs: '',
  referralName: '', programs: [], paymentMethod: '',
  password: '', confirmPassword: '', termsAccepted: false,
}

const PROGRAMS = [
  { id: 'forex-beginner',     label: 'Forex — Beginner',      group: 'Forex Academy' },
  { id: 'forex-intermediate', label: 'Forex — Intermediate',   group: 'Forex Academy' },
  { id: 'forex-advanced',     label: 'Forex — Advanced',       group: 'Forex Academy' },
  { id: 'dm-social',          label: 'Social Media Marketing', group: 'Digital Marketing' },
  { id: 'dm-seo',             label: 'SEO & Content',          group: 'Digital Marketing' },
  { id: 'ai-fundamentals',    label: 'AI Fundamentals',        group: 'AI Academy' },
  { id: 'ai-trading',         label: 'AI Trading Automation',  group: 'AI Academy' },
]

const STEP_LABELS = ['Personal', 'Address & Docs', 'Program', 'Account']

/* ── Country data ───────────────────────────────────── */
interface Country { name: string; dial: string; flag: string }

const COUNTRIES: Country[] = [
  { name: 'Afghanistan',           dial: '+93',   flag: '🇦🇫' },
  { name: 'Albania',               dial: '+355',  flag: '🇦🇱' },
  { name: 'Algeria',               dial: '+213',  flag: '🇩🇿' },
  { name: 'Angola',                dial: '+244',  flag: '🇦🇴' },
  { name: 'Argentina',             dial: '+54',   flag: '🇦🇷' },
  { name: 'Armenia',               dial: '+374',  flag: '🇦🇲' },
  { name: 'Australia',             dial: '+61',   flag: '🇦🇺' },
  { name: 'Austria',               dial: '+43',   flag: '🇦🇹' },
  { name: 'Azerbaijan',            dial: '+994',  flag: '🇦🇿' },
  { name: 'Bahrain',               dial: '+973',  flag: '🇧🇭' },
  { name: 'Bangladesh',            dial: '+880',  flag: '🇧🇩' },
  { name: 'Belarus',               dial: '+375',  flag: '🇧🇾' },
  { name: 'Belgium',               dial: '+32',   flag: '🇧🇪' },
  { name: 'Benin',                 dial: '+229',  flag: '🇧🇯' },
  { name: 'Bolivia',               dial: '+591',  flag: '🇧🇴' },
  { name: 'Bosnia and Herzegovina',dial: '+387',  flag: '🇧🇦' },
  { name: 'Botswana',              dial: '+267',  flag: '🇧🇼' },
  { name: 'Brazil',                dial: '+55',   flag: '🇧🇷' },
  { name: 'Brunei',                dial: '+673',  flag: '🇧🇳' },
  { name: 'Bulgaria',              dial: '+359',  flag: '🇧🇬' },
  { name: 'Burkina Faso',          dial: '+226',  flag: '🇧🇫' },
  { name: 'Burundi',               dial: '+257',  flag: '🇧🇮' },
  { name: 'Cambodia',              dial: '+855',  flag: '🇰🇭' },
  { name: 'Cameroon',              dial: '+237',  flag: '🇨🇲' },
  { name: 'Canada',                dial: '+1',    flag: '🇨🇦' },
  { name: 'Chad',                  dial: '+235',  flag: '🇹🇩' },
  { name: 'Chile',                 dial: '+56',   flag: '🇨🇱' },
  { name: 'China',                 dial: '+86',   flag: '🇨🇳' },
  { name: 'Colombia',              dial: '+57',   flag: '🇨🇴' },
  { name: 'Congo (Brazzaville)',   dial: '+242',  flag: '🇨🇬' },
  { name: 'Congo (DRC)',           dial: '+243',  flag: '🇨🇩' },
  { name: 'Costa Rica',            dial: '+506',  flag: '🇨🇷' },
  { name: 'Croatia',               dial: '+385',  flag: '🇭🇷' },
  { name: 'Cuba',                  dial: '+53',   flag: '🇨🇺' },
  { name: 'Cyprus',                dial: '+357',  flag: '🇨🇾' },
  { name: 'Czech Republic',        dial: '+420',  flag: '🇨🇿' },
  { name: 'Denmark',               dial: '+45',   flag: '🇩🇰' },
  { name: 'Djibouti',              dial: '+253',  flag: '🇩🇯' },
  { name: 'Dominican Republic',    dial: '+1809', flag: '🇩🇴' },
  { name: 'Ecuador',               dial: '+593',  flag: '🇪🇨' },
  { name: 'Egypt',                 dial: '+20',   flag: '🇪🇬' },
  { name: 'El Salvador',           dial: '+503',  flag: '🇸🇻' },
  { name: 'Eritrea',               dial: '+291',  flag: '🇪🇷' },
  { name: 'Estonia',               dial: '+372',  flag: '🇪🇪' },
  { name: 'Ethiopia',              dial: '+251',  flag: '🇪🇹' },
  { name: 'Fiji',                  dial: '+679',  flag: '🇫🇯' },
  { name: 'Finland',               dial: '+358',  flag: '🇫🇮' },
  { name: 'France',                dial: '+33',   flag: '🇫🇷' },
  { name: 'Gabon',                 dial: '+241',  flag: '🇬🇦' },
  { name: 'Gambia',                dial: '+220',  flag: '🇬🇲' },
  { name: 'Georgia',               dial: '+995',  flag: '🇬🇪' },
  { name: 'Germany',               dial: '+49',   flag: '🇩🇪' },
  { name: 'Ghana',                 dial: '+233',  flag: '🇬🇭' },
  { name: 'Greece',                dial: '+30',   flag: '🇬🇷' },
  { name: 'Guatemala',             dial: '+502',  flag: '🇬🇹' },
  { name: 'Guinea',                dial: '+224',  flag: '🇬🇳' },
  { name: 'Guyana',                dial: '+592',  flag: '🇬🇾' },
  { name: 'Haiti',                 dial: '+509',  flag: '🇭🇹' },
  { name: 'Honduras',              dial: '+504',  flag: '🇭🇳' },
  { name: 'Hungary',               dial: '+36',   flag: '🇭🇺' },
  { name: 'Iceland',               dial: '+354',  flag: '🇮🇸' },
  { name: 'India',                 dial: '+91',   flag: '🇮🇳' },
  { name: 'Indonesia',             dial: '+62',   flag: '🇮🇩' },
  { name: 'Iran',                  dial: '+98',   flag: '🇮🇷' },
  { name: 'Iraq',                  dial: '+964',  flag: '🇮🇶' },
  { name: 'Ireland',               dial: '+353',  flag: '🇮🇪' },
  { name: 'Israel',                dial: '+972',  flag: '🇮🇱' },
  { name: 'Italy',                 dial: '+39',   flag: '🇮🇹' },
  { name: 'Ivory Coast',           dial: '+225',  flag: '🇨🇮' },
  { name: 'Jamaica',               dial: '+1876', flag: '🇯🇲' },
  { name: 'Japan',                 dial: '+81',   flag: '🇯🇵' },
  { name: 'Jordan',                dial: '+962',  flag: '🇯🇴' },
  { name: 'Kazakhstan',            dial: '+7',    flag: '🇰🇿' },
  { name: 'Kenya',                 dial: '+254',  flag: '🇰🇪' },
  { name: 'Kosovo',                dial: '+383',  flag: '🇽🇰' },
  { name: 'Kuwait',                dial: '+965',  flag: '🇰🇼' },
  { name: 'Kyrgyzstan',            dial: '+996',  flag: '🇰🇬' },
  { name: 'Laos',                  dial: '+856',  flag: '🇱🇦' },
  { name: 'Latvia',                dial: '+371',  flag: '🇱🇻' },
  { name: 'Lebanon',               dial: '+961',  flag: '🇱🇧' },
  { name: 'Liberia',               dial: '+231',  flag: '🇱🇷' },
  { name: 'Libya',                 dial: '+218',  flag: '🇱🇾' },
  { name: 'Lithuania',             dial: '+370',  flag: '🇱🇹' },
  { name: 'Luxembourg',            dial: '+352',  flag: '🇱🇺' },
  { name: 'Madagascar',            dial: '+261',  flag: '🇲🇬' },
  { name: 'Malawi',                dial: '+265',  flag: '🇲🇼' },
  { name: 'Malaysia',              dial: '+60',   flag: '🇲🇾' },
  { name: 'Maldives',              dial: '+960',  flag: '🇲🇻' },
  { name: 'Mali',                  dial: '+223',  flag: '🇲🇱' },
  { name: 'Malta',                 dial: '+356',  flag: '🇲🇹' },
  { name: 'Mauritania',            dial: '+222',  flag: '🇲🇷' },
  { name: 'Mauritius',             dial: '+230',  flag: '🇲🇺' },
  { name: 'Mexico',                dial: '+52',   flag: '🇲🇽' },
  { name: 'Moldova',               dial: '+373',  flag: '🇲🇩' },
  { name: 'Mongolia',              dial: '+976',  flag: '🇲🇳' },
  { name: 'Montenegro',            dial: '+382',  flag: '🇲🇪' },
  { name: 'Morocco',               dial: '+212',  flag: '🇲🇦' },
  { name: 'Mozambique',            dial: '+258',  flag: '🇲🇿' },
  { name: 'Myanmar',               dial: '+95',   flag: '🇲🇲' },
  { name: 'Namibia',               dial: '+264',  flag: '🇳🇦' },
  { name: 'Nepal',                 dial: '+977',  flag: '🇳🇵' },
  { name: 'Netherlands',           dial: '+31',   flag: '🇳🇱' },
  { name: 'New Zealand',           dial: '+64',   flag: '🇳🇿' },
  { name: 'Nicaragua',             dial: '+505',  flag: '🇳🇮' },
  { name: 'Niger',                 dial: '+227',  flag: '🇳🇪' },
  { name: 'Nigeria',               dial: '+234',  flag: '🇳🇬' },
  { name: 'North Macedonia',       dial: '+389',  flag: '🇲🇰' },
  { name: 'Norway',                dial: '+47',   flag: '🇳🇴' },
  { name: 'Oman',                  dial: '+968',  flag: '🇴🇲' },
  { name: 'Pakistan',              dial: '+92',   flag: '🇵🇰' },
  { name: 'Palestine',             dial: '+970',  flag: '🇵🇸' },
  { name: 'Panama',                dial: '+507',  flag: '🇵🇦' },
  { name: 'Paraguay',              dial: '+595',  flag: '🇵🇾' },
  { name: 'Peru',                  dial: '+51',   flag: '🇵🇪' },
  { name: 'Philippines',           dial: '+63',   flag: '🇵🇭' },
  { name: 'Poland',                dial: '+48',   flag: '🇵🇱' },
  { name: 'Portugal',              dial: '+351',  flag: '🇵🇹' },
  { name: 'Qatar',                 dial: '+974',  flag: '🇶🇦' },
  { name: 'Romania',               dial: '+40',   flag: '🇷🇴' },
  { name: 'Russia',                dial: '+7',    flag: '🇷🇺' },
  { name: 'Rwanda',                dial: '+250',  flag: '🇷🇼' },
  { name: 'Saudi Arabia',          dial: '+966',  flag: '🇸🇦' },
  { name: 'Senegal',               dial: '+221',  flag: '🇸🇳' },
  { name: 'Serbia',                dial: '+381',  flag: '🇷🇸' },
  { name: 'Sierra Leone',          dial: '+232',  flag: '🇸🇱' },
  { name: 'Singapore',             dial: '+65',   flag: '🇸🇬' },
  { name: 'Slovakia',              dial: '+421',  flag: '🇸🇰' },
  { name: 'Slovenia',              dial: '+386',  flag: '🇸🇮' },
  { name: 'Somalia',               dial: '+252',  flag: '🇸🇴' },
  { name: 'South Africa',          dial: '+27',   flag: '🇿🇦' },
  { name: 'South Korea',           dial: '+82',   flag: '🇰🇷' },
  { name: 'South Sudan',           dial: '+211',  flag: '🇸🇸' },
  { name: 'Spain',                 dial: '+34',   flag: '🇪🇸' },
  { name: 'Sri Lanka',             dial: '+94',   flag: '🇱🇰' },
  { name: 'Sudan',                 dial: '+249',  flag: '🇸🇩' },
  { name: 'Sweden',                dial: '+46',   flag: '🇸🇪' },
  { name: 'Switzerland',           dial: '+41',   flag: '🇨🇭' },
  { name: 'Syria',                 dial: '+963',  flag: '🇸🇾' },
  { name: 'Taiwan',                dial: '+886',  flag: '🇹🇼' },
  { name: 'Tajikistan',            dial: '+992',  flag: '🇹🇯' },
  { name: 'Tanzania',              dial: '+255',  flag: '🇹🇿' },
  { name: 'Thailand',              dial: '+66',   flag: '🇹🇭' },
  { name: 'Togo',                  dial: '+228',  flag: '🇹🇬' },
  { name: 'Tunisia',               dial: '+216',  flag: '🇹🇳' },
  { name: 'Turkey',                dial: '+90',   flag: '🇹🇷' },
  { name: 'Turkmenistan',          dial: '+993',  flag: '🇹🇲' },
  { name: 'Uganda',                dial: '+256',  flag: '🇺🇬' },
  { name: 'Ukraine',               dial: '+380',  flag: '🇺🇦' },
  { name: 'United Arab Emirates',  dial: '+971',  flag: '🇦🇪' },
  { name: 'United Kingdom',        dial: '+44',   flag: '🇬🇧' },
  { name: 'United States',         dial: '+1',    flag: '🇺🇸' },
  { name: 'Uruguay',               dial: '+598',  flag: '🇺🇾' },
  { name: 'Uzbekistan',            dial: '+998',  flag: '🇺🇿' },
  { name: 'Venezuela',             dial: '+58',   flag: '🇻🇪' },
  { name: 'Vietnam',               dial: '+84',   flag: '🇻🇳' },
  { name: 'Yemen',                 dial: '+967',  flag: '🇾🇪' },
  { name: 'Zambia',                dial: '+260',  flag: '🇿🇲' },
  { name: 'Zimbabwe',              dial: '+263',  flag: '🇿🇼' },
]

/* ── Helpers ────────────────────────────────────────── */
function getStrength(pw: string) {
  let s = 0
  if (pw.length >= 8)           s++
  if (/[A-Z]/.test(pw))        s++
  if (/[0-9]/.test(pw))        s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  const map = [
    { label: '',       color: '#E4E7ED' },
    { label: 'Weak',   color: '#EF4444' },
    { label: 'Fair',   color: '#F59E0B' },
    { label: 'Good',   color: '#0057b8' },
    { label: 'Strong', color: '#0ECC8E' },
  ]
  return { score: s, ...map[s] }
}

function formatEmiratesId(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 15)
  const parts: string[] = []
  if (d.length > 0)  parts.push(d.slice(0, 3))
  if (d.length > 3)  parts.push(d.slice(3, 7))
  if (d.length > 7)  parts.push(d.slice(7, 14))
  if (d.length > 14) parts.push(d.slice(14, 15))
  return parts.join('-')
}

function extractLocalPhone(full: string): string {
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length)
  for (const c of sorted) {
    if (full.startsWith(c.dial)) return full.slice(c.dial.length)
  }
  return full
}

/* ── Shared input styles ─────────────────────────────── */
const inputBase = {
  background: '#F4F5F8',
  border: '1.5px solid transparent',
  color: '#0D0F1A',
} as const

const inputError = {
  background: '#FEF2F2',
  border: '1.5px solid #FCA5A5',
  color: '#0D0F1A',
} as const

function focusStyle(hasErr: boolean) {
  return {
    border: `1.5px solid ${hasErr ? '#EF4444' : '#0057b8'}`,
    background: '#fff',
    boxShadow: `0 0 0 3px rgba(${hasErr ? '239,68,68' : '0,87,184'},0.10)`,
  }
}
function blurStyle(hasErr: boolean) {
  return {
    border: `1.5px solid ${hasErr ? '#FCA5A5' : 'transparent'}`,
    background: hasErr ? '#FEF2F2' : '#F4F5F8',
    boxShadow: 'none',
  }
}

/* ── Sub-components ─────────────────────────────────── */
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold" style={{ color: '#374151' }}>{label}</label>
      {children}
      {error && <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>}
    </div>
  )
}

function Input({ error, className, ...props }: { error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const hasErr = !!error
  return (
    <input
      {...props}
      className={cn('w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all', className)}
      style={hasErr ? inputError : inputBase}
      onFocus={e => { Object.assign(e.currentTarget.style, focusStyle(hasErr)) }}
      onBlur={e => { Object.assign(e.currentTarget.style, blurStyle(hasErr)) }}
    />
  )
}

function Select({ error, children, ...props }: { error?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const hasErr = !!error
  return (
    <select
      {...props}
      className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all appearance-none"
      style={{ ...(hasErr ? inputError : inputBase), color: props.value ? '#0D0F1A' : '#9CA3AF' }}
      onFocus={e => { Object.assign(e.currentTarget.style, focusStyle(hasErr)) }}
      onBlur={e => { Object.assign(e.currentTarget.style, blurStyle(hasErr)) }}
    >
      {children}
    </select>
  )
}

/* ── PhoneInput ─────────────────────────────────────── */
function PhoneInput({ value, onChange, error, placeholder = '50 000 0000' }: {
  value: string; onChange: (v: string) => void; error?: string; placeholder?: string
}) {
  const hasErr = !!error
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [focused, setFocused] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  /* parse stored value into dial + local */
  const parsed = (() => {
    if (!value) return { dial: '+971', local: '' }
    const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length)
    for (const c of sorted) {
      if (value.startsWith(c.dial)) return { dial: c.dial, local: value.slice(c.dial.length) }
    }
    return { dial: '+971', local: value }
  })()

  const selectedCountry = COUNTRIES.find(c => c.dial === parsed.dial) ?? COUNTRIES.find(c => c.name === 'United Arab Emirates')!

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.dial.includes(search)
  )

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false); setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 40)
  }, [open])

  const handleLocal = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 13)
    onChange(parsed.dial + digits)
  }

  const handleDial = (dial: string) => {
    onChange(dial + parsed.local)
    setOpen(false); setSearch('')
  }

  const wrapStyle = {
    border: `1.5px solid ${open || focused ? (hasErr ? '#EF4444' : '#0057b8') : (hasErr ? '#FCA5A5' : 'transparent')}`,
    background: open || focused ? '#fff' : (hasErr ? '#FEF2F2' : '#F4F5F8'),
    boxShadow: (open || focused) ? `0 0 0 3px rgba(${hasErr ? '239,68,68' : '0,87,184'},0.10)` : 'none',
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex rounded-xl overflow-hidden transition-all" style={wrapStyle}>
        <button type="button" onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1 flex-shrink-0 px-2.5 transition-colors hover:bg-black/[0.03]"
          style={{ borderRight: `1px solid ${hasErr ? '#FCA5A5' : '#E5E7EB'}`, minWidth: 78 }}>
          <span style={{ fontSize: 17, lineHeight: 1 }}>{selectedCountry.flag}</span>
          <span className="text-xs font-semibold" style={{ color: '#374151' }}>{parsed.dial}</span>
          <ChevronDown size={11} style={{ color: '#9CA3AF' }} />
        </button>
        <input
          type="tel"
          value={parsed.local}
          placeholder={placeholder}
          onChange={e => handleLocal(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none min-w-0"
          style={{ color: '#0D0F1A' }}
        />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
            className="absolute left-0 top-full z-[999] mt-1 overflow-hidden rounded-xl shadow-xl"
            style={{ width: 288, background: '#fff', border: '1.5px solid #E5E7EB' }}>
            <div className="p-2 border-b border-gray-100">
              <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ background: '#F4F5F8' }}>
                <Search size={13} style={{ color: '#9CA3AF' }} />
                <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search country or code…"
                  className="flex-1 bg-transparent text-xs outline-none" style={{ color: '#0D0F1A' }} />
                {search && (
                  <button type="button" onClick={() => setSearch('')}>
                    <X size={11} style={{ color: '#9CA3AF' }} />
                  </button>
                )}
              </div>
            </div>
            <div style={{ maxHeight: 216, overflowY: 'auto' }}>
              {filtered.length === 0
                ? <p className="py-4 text-center text-xs" style={{ color: '#9CA3AF' }}>No results</p>
                : filtered.map(c => (
                  <button key={c.name} type="button" onClick={() => handleDial(c.dial)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors hover:bg-gray-50"
                    style={{ color: c.dial === parsed.dial ? '#0057b8' : '#374151' }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{c.flag}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="font-mono text-[10px]" style={{ color: '#9CA3AF' }}>{c.dial}</span>
                    {c.dial === parsed.dial && <Check size={11} style={{ color: '#0057b8', flexShrink: 0 }} />}
                  </button>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── CountryPicker ──────────────────────────────────── */
function CountryPicker({ value, onChange, error, placeholder = 'Search and select country…' }: {
  value: string; onChange: (v: string) => void; error?: string; placeholder?: string
}) {
  const hasErr = !!error
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = COUNTRIES.find(c => c.name === value)
  const filtered = COUNTRIES.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false); setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 40)
  }, [open])

  const triggerStyle = {
    ...(hasErr ? inputError : inputBase),
    ...(open ? focusStyle(hasErr) : {}),
  }

  return (
    <div ref={wrapRef} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm transition-all text-left"
        style={triggerStyle}>
        {selected ? (
          <>
            <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{selected.flag}</span>
            <span className="flex-1 truncate" style={{ color: '#0D0F1A' }}>{selected.name}</span>
          </>
        ) : (
          <span className="flex-1" style={{ color: '#9CA3AF' }}>{placeholder}</span>
        )}
        <ChevronDown size={14} style={{
          color: '#9CA3AF', flexShrink: 0,
          transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s',
        }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-full z-[999] mt-1 overflow-hidden rounded-xl shadow-xl"
            style={{ background: '#fff', border: '1.5px solid #E5E7EB' }}>
            <div className="p-2 border-b border-gray-100">
              <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ background: '#F4F5F8' }}>
                <Search size={13} style={{ color: '#9CA3AF' }} />
                <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search country…"
                  className="flex-1 bg-transparent text-xs outline-none" style={{ color: '#0D0F1A' }} />
                {search && (
                  <button type="button" onClick={() => setSearch('')}>
                    <X size={11} style={{ color: '#9CA3AF' }} />
                  </button>
                )}
              </div>
            </div>
            <div style={{ maxHeight: 216, overflowY: 'auto' }}>
              {filtered.length === 0
                ? <p className="py-4 text-center text-xs" style={{ color: '#9CA3AF' }}>No countries found</p>
                : filtered.map(c => (
                  <button key={c.name} type="button"
                    onClick={() => { onChange(c.name); setOpen(false); setSearch('') }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50"
                    style={{ color: c.name === value ? '#0057b8' : '#374151' }}>
                    <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{c.flag}</span>
                    <span className="flex-1">{c.name}</span>
                    {c.name === value && <Check size={13} style={{ color: '#0057b8', flexShrink: 0 }} />}
                  </button>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FileDropzone({ label, accept, file, onFile, onClear, hint }: {
  label: string; accept: string; file: File | null
  onFile: (f: File) => void; onClear: () => void; hint?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold" style={{ color: '#374151' }}>{label}</label>
      {file ? (
        <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm"
          style={{ background: 'rgba(0,87,184,0.06)', border: '1.5px solid rgba(0,87,184,0.25)' }}>
          <FileText size={15} style={{ color: '#0057b8', flexShrink: 0 }} />
          <span className="flex-1 min-w-0 truncate text-xs" style={{ color: '#0D0F1A' }}>{file.name}</span>
          <span className="text-xs" style={{ color: '#9CA3AF' }}>{(file.size / 1024).toFixed(0)} KB</span>
          <button type="button" onClick={onClear}
            className="flex-shrink-0 rounded-full p-0.5 hover:bg-red-100 transition-colors">
            <X size={12} style={{ color: '#EF4444' }} />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
          className="flex flex-col items-center gap-1.5 rounded-xl px-4 py-4 transition-all text-center"
          style={{ background: dragging ? 'rgba(0,87,184,0.06)' : '#F4F5F8', border: `1.5px dashed ${dragging ? '#0057b8' : '#D1D5DB'}` }}>
          <Upload size={18} style={{ color: dragging ? '#0057b8' : '#9CA3AF' }} />
          <span className="text-xs font-medium" style={{ color: dragging ? '#0057b8' : '#6B7280' }}>Click or drag to upload</span>
          {hint && <span className="text-[10px]" style={{ color: '#9CA3AF' }}>{hint}</span>}
        </button>
      )}
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
    </div>
  )
}

/* ── Main component ─────────────────────────────────── */
export function RegisterForm({ onSwitch }: { onSwitch: () => void }) {
  const [step,    setStep]    = useState(0)
  const [data,    setData]    = useState<FormData>(INITIAL)
  const [errors,  setErrors]  = useState<Partial<Record<keyof FormData, string>>>({})
  const [loading, setLoading] = useState(false)
  const [apiErr,  setApiErr]  = useState<string | null>(null)
  const [showPw,  setShowPw]  = useState(false)
  const [showCpw, setShowCpw] = useState(false)

  const set = (k: keyof FormData, v: unknown) => {
    setData(d => ({ ...d, [k]: v }))
    setErrors(e => ({ ...e, [k]: undefined }))
  }

  /* ── Validation ─────────────────────────────────────── */
  function validateStep(s: number): boolean {
    const errs: Partial<Record<keyof FormData, string>> = {}

    if (s === 0) {
      /* Full name — at least 2 words, letters only */
      const name = data.name.trim()
      if (!name) {
        errs.name = 'Full name is required'
      } else if (name.split(/\s+/).length < 2) {
        errs.name = 'Enter your first and last name'
      } else if (!/^[a-zA-Z\s\-'\.]+$/.test(name)) {
        errs.name = 'Name must contain letters only'
      }

      /* Email */
      if (!data.email.trim()) {
        errs.email = 'Email is required'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errs.email = 'Enter a valid email address'
      }

      /* Phone — must have country code + at least 5 digits */
      if (!data.phone) {
        errs.phone = 'Phone number is required'
      } else {
        const local = extractLocalPhone(data.phone)
        if (local.length < 5) errs.phone = 'Enter a complete phone number'
        else if (local.length > 13) errs.phone = 'Phone number is too long'
      }

      /* Emergency contact — same rule */
      if (!data.emergencyContact) {
        errs.emergencyContact = 'Emergency contact is required'
      } else {
        const local = extractLocalPhone(data.emergencyContact)
        if (local.length < 5) errs.emergencyContact = 'Enter a complete phone number'
      }

      /* Gender */
      if (!data.gender) errs.gender = 'Please select gender'

      /* Date of birth — must be 16+ */
      if (!data.dateOfBirth) {
        errs.dateOfBirth = 'Date of birth is required'
      } else {
        const dob = new Date(data.dateOfBirth)
        const now = new Date()
        const age = now.getFullYear() - dob.getFullYear()
          - ((now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())) ? 1 : 0)
        if (isNaN(dob.getTime())) errs.dateOfBirth = 'Enter a valid date'
        else if (age < 10)        errs.dateOfBirth = 'You must be at least 10 years old'
        else if (age > 100)       errs.dateOfBirth = 'Enter a valid date of birth'
      }

      /* Nationality — letters only */
      const nat = data.nationality.trim()
      if (!nat) {
        errs.nationality = 'Nationality is required'
      } else if (nat.length < 3) {
        errs.nationality = 'Enter a valid nationality'
      } else if (!/^[a-zA-Z\s\-]+$/.test(nat)) {
        errs.nationality = 'Nationality should contain letters only'
      }

      /* Home country — must be from picker */
      if (!data.homeCountry) errs.homeCountry = 'Please select your home country'

      /* Occupation */
      if (!data.occupation.trim()) errs.occupation = 'Occupation is required'
      else if (data.occupation.trim().length < 2) errs.occupation = 'Enter a valid occupation'

      /* Emirates ID — 15 digits in 784-XXXX-XXXXXXX-X format */
      const eid = data.emiratesId.replace(/\D/g, '')
      if (!data.emiratesId.trim()) {
        errs.emiratesId = 'Emirates ID is required'
      } else if (eid.length !== 15) {
        errs.emiratesId = 'Emirates ID must be 15 digits (784-XXXX-XXXXXXX-X)'
      } else if (!eid.startsWith('784')) {
        errs.emiratesId = 'Emirates ID must start with 784'
      }
    }

    if (s === 1) {
      if (!data.countryAttendance) errs.countryAttendance = 'Please select country of attendance'
      if (!data.villa.trim())       errs.villa             = 'Villa / Apartment is required'
      if (!data.city.trim())        errs.city              = 'City is required'
      if (!data.addressCountry)     errs.addressCountry    = 'Please select your country'
      if (!data.passportFile)       errs.passportFile      = 'Passport copy is required'
    }

    if (s === 2) {
      if (!data.experienceLevel)      errs.experienceLevel    = 'Please select experience level'
      if (!data.preferredStartDate)   errs.preferredStartDate = 'Preferred start date is required'
      else {
        const d = new Date(data.preferredStartDate)
        if (d < new Date()) errs.preferredStartDate = 'Start date must be in the future'
      }
      if (!data.hearAboutUs)          errs.hearAboutUs        = 'Please tell us how you heard about us'
      if (data.programs.length === 0) errs.programs           = 'Please select at least one program'
    }

    if (s === 3) {
      if (!data.paymentMethod) errs.paymentMethod = 'Please select payment method'
      if (!data.password)      errs.password      = 'Password is required'
      else if (data.password.length < 8)          errs.password = 'At least 8 characters required'
      else if (!/[A-Z]/.test(data.password))      errs.password = 'Must include an uppercase letter'
      else if (!/[0-9]/.test(data.password))      errs.password = 'Must include a number'
      if (data.password !== data.confirmPassword) errs.confirmPassword = 'Passwords do not match'
      if (!data.termsAccepted) errs.termsAccepted = 'You must accept the terms to continue'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function next() { if (validateStep(step)) setStep(s => s + 1) }
  function back() { setErrors({}); setStep(s => s - 1) }

  /* ── Submit ─────────────────────────────────────────── */
  async function submit() {
    if (!validateStep(3)) return
    setLoading(true); setApiErr(null)
    try {
      await api.post('/auth/register', {
        name:     data.name.trim(),
        email:    data.email.trim().toLowerCase(),
        password: data.password,
        enrollmentApplication: {
          phone: data.phone, emergencyContact: data.emergencyContact,
          gender: data.gender, dateOfBirth: data.dateOfBirth,
          nationality: data.nationality, homeCountry: data.homeCountry,
          occupation: data.occupation, emiratesId: data.emiratesId,
          countryAttendance: data.countryAttendance, villa: data.villa,
          city: data.city, addressCountry: data.addressCountry,
          experienceLevel: data.experienceLevel, preferredStartDate: data.preferredStartDate,
          hearAboutUs: data.hearAboutUs, referralName: data.referralName || undefined,
          programs: data.programs, paymentMethod: data.paymentMethod,
        },
      })

      let passportUrl = '', photoUrl = ''
      if (data.passportFile) {
        const fd = new FormData(); fd.append('file', data.passportFile)
        const r = await api.post<{ success: true; data: { url: string } }>('/uploads/document', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        passportUrl = r.data.data.url
      }
      if (data.photoFile) {
        const fd = new FormData(); fd.append('file', data.photoFile)
        const r = await api.post<{ success: true; data: { url: string } }>('/uploads/document', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        photoUrl = r.data.data.url
      }
      if (passportUrl || photoUrl) {
        await api.patch('/auth/me/enrollment-docs', {
          ...(passportUrl ? { passportUrl } : {}),
          ...(photoUrl    ? { photoUrl }    : {}),
        })
      }
      window.location.href = '/my-learning'
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Registration failed. Please try again.'
      setApiErr(msg)
      setLoading(false)
    }
  }

  const strength = getStrength(data.password)

  /* ── Step content ───────────────────────────────────── */
  function renderStep() {
    if (step === 0) return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Full Name */}
        <Field label="Full Name *" error={errors.name}>
          <div className="relative">
            <User size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
            <Input error={errors.name} value={data.name} placeholder="e.g. Ahmed Al Mansouri"
              className="pl-9"
              onChange={e => set('name', e.target.value)} />
          </div>
        </Field>

        {/* Email */}
        <Field label="Email Address *" error={errors.email}>
          <div className="relative">
            <Mail size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
            <Input error={errors.email} value={data.email} type="email" placeholder="you@example.com"
              className="pl-9"
              onChange={e => set('email', e.target.value)} />
          </div>
        </Field>

        {/* Phone */}
        <Field label="Phone / WhatsApp *" error={errors.phone}>
          <PhoneInput value={data.phone} onChange={v => set('phone', v)} error={errors.phone} />
        </Field>

        {/* Emergency Contact */}
        <Field label="Emergency Contact *" error={errors.emergencyContact}>
          <PhoneInput value={data.emergencyContact} onChange={v => set('emergencyContact', v)}
            error={errors.emergencyContact} placeholder="Emergency number" />
        </Field>

        {/* Gender */}
        <Field label="Gender *" error={errors.gender}>
          <Select error={errors.gender} value={data.gender} onChange={e => set('gender', e.target.value)}>
            <option value="">Select gender</option>
            <option>Male</option>
            <option>Female</option>
            <option>Prefer not to say</option>
          </Select>
        </Field>

        {/* Date of Birth */}
        <Field label="Date of Birth *" error={errors.dateOfBirth}>
          <Input error={errors.dateOfBirth} value={data.dateOfBirth} type="date"
            max={new Date(new Date().setFullYear(new Date().getFullYear() - 10)).toISOString().split('T')[0]}
            onChange={e => set('dateOfBirth', e.target.value)} />
        </Field>

        {/* Nationality */}
        <Field label="Nationality *" error={errors.nationality}>
          <Input error={errors.nationality} value={data.nationality} placeholder="e.g. Emirati"
            onChange={e => set('nationality', e.target.value.replace(/[^a-zA-Z\s\-]/g, ''))} />
        </Field>

        {/* Home Country */}
        <Field label="Home Country *" error={errors.homeCountry}>
          <CountryPicker value={data.homeCountry} onChange={v => set('homeCountry', v)}
            error={errors.homeCountry} placeholder="Search and select country…" />
        </Field>

        {/* Occupation */}
        <Field label="Occupation *" error={errors.occupation}>
          <Input error={errors.occupation} value={data.occupation} placeholder="e.g. Business Owner"
            onChange={e => set('occupation', e.target.value)} />
        </Field>

        {/* Emirates ID */}
        <Field label="Emirates ID Number *" error={errors.emiratesId}>
          <Input error={errors.emiratesId} value={data.emiratesId} placeholder="784-0000-0000000-0"
            maxLength={18}
            onChange={e => set('emiratesId', formatEmiratesId(e.target.value))} />
        </Field>
      </div>
    )

    if (step === 1) return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Country of Attendance *" error={errors.countryAttendance}>
            <CountryPicker value={data.countryAttendance} onChange={v => set('countryAttendance', v)}
              error={errors.countryAttendance} placeholder="Which country will you attend from?" />
          </Field>
        </div>

        <Field label="Villa / Apartment *" error={errors.villa}>
          <Input error={errors.villa} value={data.villa} placeholder="Villa 12, Al Barsha"
            onChange={e => set('villa', e.target.value)} />
        </Field>

        <Field label="City / Town *" error={errors.city}>
          <Input error={errors.city} value={data.city} placeholder="Dubai"
            onChange={e => set('city', e.target.value)} />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Country *" error={errors.addressCountry}>
            <CountryPicker value={data.addressCountry} onChange={v => set('addressCountry', v)}
              error={errors.addressCountry} placeholder="Search and select country…" />
          </Field>
        </div>

        <FileDropzone label="Passport Copy * (PDF, JPG, PNG — max 10 MB)" accept=".pdf,.jpg,.jpeg,.png,.webp"
          file={data.passportFile} onFile={f => set('passportFile', f)} onClear={() => set('passportFile', null)}
          hint="PDF or image of passport identity page" />
        {errors.passportFile && <p className="text-xs" style={{ color: '#EF4444' }}>{errors.passportFile}</p>}

        <FileDropzone label="Professional Photo (JPG, PNG — optional)" accept=".jpg,.jpeg,.png,.webp"
          file={data.photoFile} onFile={f => set('photoFile', f)} onClear={() => set('photoFile', null)}
          hint="Passport-size photo on white background" />
      </div>
    )

    if (step === 2) return (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Experience Level *" error={errors.experienceLevel}>
            <Select error={errors.experienceLevel} value={data.experienceLevel}
              onChange={e => set('experienceLevel', e.target.value)}>
              <option value="">Select level</option>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </Select>
          </Field>

          <Field label="Preferred Start Date *" error={errors.preferredStartDate}>
            <Input error={errors.preferredStartDate} value={data.preferredStartDate} type="date"
              min={new Date().toISOString().split('T')[0]}
              onChange={e => set('preferredStartDate', e.target.value)} />
          </Field>

          <Field label="How did you hear about us? *" error={errors.hearAboutUs}>
            <Select error={errors.hearAboutUs} value={data.hearAboutUs}
              onChange={e => set('hearAboutUs', e.target.value)}>
              <option value="">Select source</option>
              {['Instagram','TikTok','WhatsApp','Friend / Referral','Google','Walk-in'].map(s => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>

          {data.hearAboutUs === 'Friend / Referral' && (
            <Field label="Who referred you?">
              <Input value={data.referralName} placeholder="Referral name"
                onChange={e => set('referralName', e.target.value)} />
            </Field>
          )}
        </div>

        <Field label="Select Programs & Courses *" error={errors.programs}>
          <div className="flex flex-col gap-2 rounded-xl p-3" style={{ background: '#F4F5F8' }}>
            {['Forex Academy','Digital Marketing','AI Academy'].map(group => (
              <div key={group}>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>{group}</p>
                <div className="flex flex-wrap gap-1.5">
                  {PROGRAMS.filter(p => p.group === group).map(p => {
                    const active = data.programs.includes(p.id)
                    return (
                      <button key={p.id} type="button"
                        onClick={() => set('programs', active ? data.programs.filter(x => x !== p.id) : [...data.programs, p.id])}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all"
                        style={{
                          background: active ? 'rgba(0,87,184,0.12)' : '#fff',
                          border: `1.5px solid ${active ? '#0057b8' : '#E5E7EB'}`,
                          color: active ? '#0057b8' : '#6B7280',
                        }}>
                        {active && <Check size={10} />}
                        {p.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </Field>
      </div>
    )

    return (
      <div className="flex flex-col gap-3">
        <Field label="Payment Method *" error={errors.paymentMethod}>
          <Select error={errors.paymentMethod} value={data.paymentMethod}
            onChange={e => set('paymentMethod', e.target.value)}>
            <option value="">Select payment method</option>
            {['Cash — Full','Card — Full','Card — Split','Card Debit','Card Credit','USDT','Tabby','Tamara'].map(m => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        </Field>

        <Field label="Password *" error={errors.password}>
          <div className="relative">
            <Lock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
            <input type={showPw ? 'text' : 'password'} value={data.password}
              placeholder="Min 8 chars, uppercase + number"
              onChange={e => set('password', e.target.value)}
              className="w-full rounded-xl pl-9 pr-10 py-2.5 text-sm outline-none transition-all"
              style={errors.password ? inputError : inputBase}
              onFocus={e => { Object.assign(e.currentTarget.style, focusStyle(!!errors.password)) }}
              onBlur={e => { Object.assign(e.currentTarget.style, blurStyle(!!errors.password)) }}
            />
            <button type="button" onClick={() => setShowPw(x => !x)}
              className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }}>
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {data.password && (
            <div className="mt-1 flex items-center gap-2">
              <div className="flex gap-0.5 flex-1">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-1 flex-1 rounded-full transition-all"
                    style={{ background: i <= strength.score ? strength.color : '#E4E7ED' }} />
                ))}
              </div>
              <span className="text-[10px] font-semibold" style={{ color: strength.color }}>{strength.label}</span>
            </div>
          )}
        </Field>

        <Field label="Confirm Password *" error={errors.confirmPassword}>
          <div className="relative">
            <Lock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
            <input type={showCpw ? 'text' : 'password'} value={data.confirmPassword}
              placeholder="Repeat your password"
              onChange={e => set('confirmPassword', e.target.value)}
              className="w-full rounded-xl pl-9 pr-10 py-2.5 text-sm outline-none transition-all"
              style={errors.confirmPassword ? inputError : inputBase}
              onFocus={e => { Object.assign(e.currentTarget.style, focusStyle(!!errors.confirmPassword)) }}
              onBlur={e => { Object.assign(e.currentTarget.style, blurStyle(!!errors.confirmPassword)) }}
            />
            <button type="button" onClick={() => setShowCpw(x => !x)}
              className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }}>
              {showCpw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </Field>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input type="checkbox" checked={data.termsAccepted}
            onChange={e => set('termsAccepted', e.target.checked)}
            className="mt-0.5 h-4 w-4 flex-shrink-0 rounded accent-blue-600" />
          <span className="text-xs leading-relaxed" style={{ color: '#6B7280' }}>
            I agree to Delta Institutions&apos; Terms & Conditions, Privacy Policy, and KHDA training regulations.
            I confirm the information provided is accurate and complete.
          </span>
        </label>
        {errors.termsAccepted && <p className="text-xs" style={{ color: '#EF4444' }}>{errors.termsAccepted}</p>}
      </div>
    )
  }

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-4">
      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEP_LABELS.map((label, i) => (
          <div key={i} className="flex items-center" style={{ flex: i < STEP_LABELS.length - 1 ? '1 1 0' : undefined }}>
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all"
                style={{ background: i <= step ? '#0057b8' : '#E4E7ED', color: i <= step ? '#fff' : '#9CA3AF' }}>
                {i < step ? <Check size={13} /> : i + 1}
              </div>
              <span className="hidden text-[9px] font-semibold sm:block whitespace-nowrap"
                style={{ color: i === step ? '#0057b8' : '#9CA3AF' }}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className="mx-1 flex-1 h-px transition-all"
                style={{ background: i < step ? '#0057b8' : '#E4E7ED' }} />
            )}
          </div>
        ))}
      </div>

      {/* Step heading */}
      <div>
        <h3 className="text-sm font-bold" style={{ color: '#0D0F1A' }}>Step {step + 1}: {STEP_LABELS[step]}</h3>
        <p className="text-xs" style={{ color: '#9CA3AF' }}>
          {step === 0 && 'Tell us about yourself'}
          {step === 1 && 'Your address and identification documents'}
          {step === 2 && 'Choose your programs and preferred schedule'}
          {step === 3 && 'Create your LMS account to get started'}
        </p>
      </div>

      {/* Fields */}
      <AnimatePresence mode="wait">
        <motion.div key={step}
          initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.18 }}>
          {renderStep()}
        </motion.div>
      </AnimatePresence>

      {/* API error */}
      {apiErr && (
        <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs"
          style={{ background: '#FEE2E2', color: '#DC2626' }}>
          <AlertCircle size={14} />{apiErr}
        </div>
      )}

      {/* Nav buttons */}
      <div className="flex gap-2">
        {step > 0 && (
          <button type="button" onClick={back}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
            style={{ background: '#F4F5F8', color: '#6B7280' }}>
            <ChevronLeft size={15} /> Back
          </button>
        )}
        {step < 3 ? (
          <button type="button" onClick={next}
            className="ml-auto flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all"
            style={{ background: 'linear-gradient(135deg,#0057b8,#1a73e8)', boxShadow: '0 4px 14px rgba(0,87,184,0.25)' }}>
            Continue <ChevronRight size={15} />
          </button>
        ) : (
          <button type="button" onClick={submit} disabled={loading}
            className="ml-auto flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all disabled:opacity-70"
            style={{ background: 'linear-gradient(135deg,#0057b8,#1a73e8)', boxShadow: '0 4px 14px rgba(0,87,184,0.25)' }}>
            {loading ? <><Loader2 size={14} className="animate-spin" />Submitting…</> : 'Submit Application'}
          </button>
        )}
      </div>

      {/* Switch to login */}
      <p className="text-center text-xs" style={{ color: '#9CA3AF' }}>
        Already have an account?{' '}
        <button onClick={onSwitch} className="font-semibold" style={{ color: '#0057b8' }}>Sign in</button>
      </p>
    </div>
  )
}
