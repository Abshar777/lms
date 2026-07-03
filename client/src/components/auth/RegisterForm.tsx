'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Mail, Lock, Phone, AlertCircle, Eye, EyeOff,
  Upload, ChevronRight, ChevronLeft, Loader2, Check, FileText, X,
  ChevronDown, Search, MapPin, Calendar, Globe, Briefcase, CreditCard, Camera,
} from 'lucide-react'
import { api } from '@/lib/axios'
import { cn } from '@/lib/utils'
import { TermsModal } from './TermsModal'

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
  { id: 'forex-beginner',     label: 'Forex: Beginner',      group: 'Forex Academy' },
  { id: 'forex-intermediate', label: 'Forex: Intermediate',   group: 'Forex Academy' },
  { id: 'forex-advanced',     label: 'Forex: Advanced',       group: 'Forex Academy' },
  { id: 'dm-social',          label: 'Social Media Marketing', group: 'Digital Marketing' },
  { id: 'dm-seo',             label: 'SEO & Content',          group: 'Digital Marketing' },
  { id: 'ai-fundamentals',    label: 'AI Fundamentals',        group: 'AI Academy' },
  { id: 'ai-trading',         label: 'AI Trading Automation',  group: 'AI Academy' },
]

const STEP_LABELS = ['Personal', 'Address & Docs', 'Program', 'Account']
const STEP_ICONS  = ['👤', '📄', '🎓', '🔐']

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

/* ── Helpers (unchanged) ────────────────────────────── */
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
    { label: 'Strong', color: '#10B981' },
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

/* ── Design tokens ─────────────────────────────────── */
const inputBase = cn(
  'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-all',
  'placeholder:text-gray-400',
  'hover:border-gray-300',
  'focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
)
const inputErr = cn(
  'w-full rounded-xl border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-all',
  'placeholder:text-red-300',
  'focus:border-red-400 focus:ring-2 focus:ring-red-100',
)

/* ── Sub-components ─────────────────────────────────── */
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12.5px] font-semibold text-gray-600 tracking-wide">{label}</label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1 text-[11px] font-medium text-red-500">
            <AlertCircle size={10} strokeWidth={2.5} className="flex-shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

function Input({ error, className, ...props }: { error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(error ? inputErr : inputBase, className)}
    />
  )
}

function Select({ error, children, ...props }: { error?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={cn(
          error ? inputErr : inputBase,
          'appearance-none cursor-pointer pr-9',
          !props.value && 'text-gray-400',
        )}>
        {children}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
    </div>
  )
}

/* ── PhoneInput ─────────────────────────────────────── */
function PhoneInput({ value, onChange, error, placeholder = '50 000 0000' }: {
  value: string; onChange: (v: string) => void; error?: string; placeholder?: string
}) {
  const hasErr = !!error
  const [open, setOpen]       = useState(false)
  const [search, setSearch]   = useState('')
  const [focused, setFocused] = useState(false)
  const wrapRef   = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

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

  const isActive = open || focused
  const wrapCls = cn(
    'flex rounded-xl border bg-white transition-all duration-150',
    hasErr
      ? isActive ? 'border-red-400 ring-2 ring-red-100' : 'border-red-300'
      : isActive ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'
  )

  return (
    <div ref={wrapRef} className="relative">
      <div className={wrapCls}>
        {/* Flag + dial code button */}
        <button type="button" onClick={() => setOpen(o => !o)}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-l-xl bg-gray-50 px-3 py-2.5 transition-colors hover:bg-gray-100"
          style={{ borderRight: '1px solid #E5E7EB' }}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>{selectedCountry.flag}</span>
          <span className="text-sm font-semibold text-gray-700 tabular-nums">{parsed.dial}</span>
          <ChevronDown size={11} className={cn('text-gray-400 transition-transform duration-150', open && 'rotate-180')} />
        </button>

        {/* Number input */}
        <input
          type="tel"
          value={parsed.local}
          placeholder={placeholder}
          onChange={e => handleLocal(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="min-w-0 flex-1 rounded-r-xl bg-white px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
        />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full z-[999] mt-1.5 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
            style={{ width: 300 }}>
            {/* Search */}
            <div className="border-b border-gray-100 p-2.5">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5">
                <Search size={12} className="text-gray-400 flex-shrink-0" />
                <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search country or code…"
                  className="flex-1 bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-400" />
                {search && (
                  <button type="button" onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>
            {/* List */}
            <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
              {filtered.length === 0
                ? <p className="py-5 text-center text-xs text-gray-400">No results</p>
                : filtered.map(c => (
                  <button key={c.name} type="button" onClick={() => handleDial(c.dial)}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors',
                      c.dial === parsed.dial ? 'bg-blue-50' : 'hover:bg-gray-50'
                    )}>
                    <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{c.flag}</span>
                    <span className="flex-1 truncate text-xs text-gray-700">{c.name}</span>
                    <span className="font-mono text-[10px] text-gray-400">{c.dial}</span>
                    {c.dial === parsed.dial && <Check size={11} className="flex-shrink-0 text-blue-600" />}
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
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const wrapRef   = useRef<HTMLDivElement>(null)
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

  const triggerCls = cn(
    'flex w-full items-center gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-left text-sm transition-all duration-150',
    hasErr
      ? open ? 'border-red-400 ring-2 ring-red-100' : 'border-red-300 bg-red-50'
      : open ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'
  )

  return (
    <div ref={wrapRef} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} className={triggerCls}>
        {selected ? (
          <>
            <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{selected.flag}</span>
            <span className="flex-1 truncate text-gray-900 text-sm">{selected.name}</span>
          </>
        ) : (
          <span className="flex-1 truncate text-gray-400 text-sm">{placeholder}</span>
        )}
        <ChevronDown size={14} className={cn('flex-shrink-0 text-gray-400 transition-transform duration-150', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-full z-[999] mt-1.5 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
            {/* Search */}
            <div className="border-b border-gray-100 p-2.5">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5">
                <Search size={12} className="text-gray-400 flex-shrink-0" />
                <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search country…"
                  className="flex-1 bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-400" />
                {search && (
                  <button type="button" onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>
            {/* List */}
            <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
              {filtered.length === 0
                ? <p className="py-5 text-center text-xs text-gray-400">No countries found</p>
                : filtered.map(c => (
                  <button key={c.name} type="button"
                    onClick={() => { onChange(c.name); setOpen(false); setSearch('') }}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors',
                      c.name === value ? 'bg-blue-50' : 'hover:bg-gray-50'
                    )}>
                    <span style={{ fontSize: 17, lineHeight: 1, flexShrink: 0 }}>{c.flag}</span>
                    <span className="flex-1 text-sm text-gray-700">{c.name}</span>
                    {c.name === value && <Check size={13} className="flex-shrink-0 text-blue-600" />}
                  </button>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── FileDropzone ───────────────────────────────────── */
function FileDropzone({ label, accept, file, onFile, onClear, hint }: {
  label: string; accept: string; file: File | null
  onFile: (f: File) => void; onClear: () => void; hint?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12.5px] font-semibold text-gray-600 tracking-wide">{label}</label>
      {file ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100">
            <FileText size={14} className="text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-gray-800">{file.name}</p>
            <p className="text-[10px] text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
          <button type="button" onClick={onClear}
            className="flex-shrink-0 rounded-full p-1 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-500">
            <X size={12} />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
          className={cn(
            'flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-all',
            dragging
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/50'
          )}>
          <div className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full transition-colors',
            dragging ? 'bg-blue-100' : 'bg-gray-100'
          )}>
            <Upload size={16} className={dragging ? 'text-blue-600' : 'text-gray-400'} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600">
              {dragging ? 'Drop to upload' : 'Click to upload or drag & drop'}
            </p>
            {hint && <p className="mt-0.5 text-[10px] text-gray-400">{hint}</p>}
          </div>
        </button>
      )}
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
    </div>
  )
}

/* ── Main component ─────────────────────────────────── */
export function RegisterForm({ onSwitch }: { onSwitch: () => void }) {
  const [step,          setStep]          = useState(0)
  const [data,          setData]          = useState<FormData>(INITIAL)
  const [errors,        setErrors]        = useState<Partial<Record<keyof FormData, string>>>({})
  const [loading,       setLoading]       = useState(false)
  const [apiErr,        setApiErr]        = useState<string | null>(null)
  const [showPw,        setShowPw]        = useState(false)
  const [showCpw,       setShowCpw]       = useState(false)
  const [avatarFile,    setAvatarFile]    = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarError,   setAvatarError]   = useState<string | null>(null)
  const [showTerms,     setShowTerms]     = useState(false)

  const set = (k: keyof FormData, v: unknown) => {
    setData(d => ({ ...d, [k]: v }))
    setErrors(e => ({ ...e, [k]: undefined }))
  }

  /* ── Validation ────────────────────────────────────── */
  function validateStep(s: number): boolean {
    const errs: Partial<Record<keyof FormData, string>> = {}
    let avatarErr = false

    if (s === 0) {
      if (!avatarFile) { setAvatarError('Profile photo is required'); avatarErr = true }
      else setAvatarError(null)

      const name = data.name.trim()
      if (!name) {
        errs.name = 'Full name is required'
      } else if (name.split(/\s+/).length < 2) {
        errs.name = 'Enter your first and last name'
      } else if (!/^[a-zA-Z\s\-'\.]+$/.test(name)) {
        errs.name = 'Name must contain letters only'
      }

      if (!data.email.trim()) {
        errs.email = 'Email is required'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errs.email = 'Enter a valid email address'
      }

      if (!data.phone) {
        errs.phone = 'Phone number is required'
      } else {
        const local = extractLocalPhone(data.phone)
        if (local.length < 5) errs.phone = 'Enter a complete phone number'
        else if (local.length > 13) errs.phone = 'Phone number is too long'
      }

      if (!data.emergencyContact) {
        errs.emergencyContact = 'Emergency contact is required'
      } else {
        const local = extractLocalPhone(data.emergencyContact)
        if (local.length < 5) errs.emergencyContact = 'Enter a complete phone number'
      }

      if (!data.gender) errs.gender = 'Please select gender'

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

      const nat = data.nationality.trim()
      if (!nat) {
        errs.nationality = 'Nationality is required'
      } else if (nat.length < 3) {
        errs.nationality = 'Enter a valid nationality'
      } else if (!/^[a-zA-Z\s\-]+$/.test(nat)) {
        errs.nationality = 'Nationality should contain letters only'
      }

      if (!data.homeCountry) errs.homeCountry = 'Please select your home country'

      if (!data.occupation.trim()) errs.occupation = 'Occupation is required'
      else if (data.occupation.trim().length < 2) errs.occupation = 'Enter a valid occupation'

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
    return Object.keys(errs).length === 0 && !avatarErr
  }

  function next() { if (validateStep(step)) setStep(s => s + 1) }
  function back() { setErrors({}); setStep(s => s - 1) }

  /* ── Submit (unchanged) ─────────────────────────────── */
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
      if (avatarFile) {
        const fd = new FormData(); fd.append('file', avatarFile)
        const r = await api.post<{ success: true; data: { url: string } }>('/uploads/document', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        photoUrl = r.data.data.url
        await api.patch('/auth/me', { avatarUrl: photoUrl })
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        {/* ── Profile photo ───────────────────────────── */}
        <div className="sm:col-span-2 flex flex-col items-center gap-1.5 pb-2">
          <label htmlFor="avatar-upload" className="group cursor-pointer">
            <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-dashed border-gray-300 bg-gray-50 transition-colors group-hover:border-blue-400">
              {avatarPreview
                ? <img src={avatarPreview} alt="Profile" className="h-full w-full object-cover" />
                : <div className="flex h-full w-full items-center justify-center">
                    <Camera size={22} className="text-gray-300 transition-colors group-hover:text-blue-400" />
                  </div>
              }
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera size={15} className="text-white" />
              </div>
            </div>
          </label>
          <input id="avatar-upload" type="file" accept="image/*" className="hidden"
            onChange={e => {
              const f = e.target.files?.[0]
              if (!f) return
              setAvatarFile(f)
              setAvatarPreview(URL.createObjectURL(f))
              setAvatarError(null)
            }}
          />
          <p className="text-[11px] text-gray-400">Profile photo <span className="text-red-400">*</span></p>
          {avatarError && (
            <p className="flex items-center gap-1 text-[11px] font-medium text-red-500">
              <AlertCircle size={10} strokeWidth={2.5} />{avatarError}
            </p>
          )}
        </div>

        <Field label="Full Name *" error={errors.name}>
          <div className="relative">
            <User size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input error={errors.name} value={data.name} placeholder="e.g. Ahmed Al Mansouri"
              className="pl-9" onChange={e => set('name', e.target.value)} />
          </div>
        </Field>

        <Field label="Email Address *" error={errors.email}>
          <div className="relative">
            <Mail size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input error={errors.email} value={data.email} type="email" placeholder="you@example.com"
              className="pl-9" onChange={e => set('email', e.target.value)} />
          </div>
        </Field>

        <Field label="Phone / WhatsApp *" error={errors.phone}>
          <PhoneInput value={data.phone} onChange={v => set('phone', v)} error={errors.phone} />
        </Field>

        <Field label="Emergency Contact *" error={errors.emergencyContact}>
          <PhoneInput value={data.emergencyContact} onChange={v => set('emergencyContact', v)}
            error={errors.emergencyContact} placeholder="Emergency number" />
        </Field>

        <Field label="Gender *" error={errors.gender}>
          <Select error={errors.gender} value={data.gender} onChange={e => set('gender', e.target.value)}>
            <option value="">Select gender</option>
            <option>Male</option>
            <option>Female</option>
            <option>Prefer not to say</option>
          </Select>
        </Field>

        <Field label="Date of Birth *" error={errors.dateOfBirth}>
          <div className="relative">
            <Calendar size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input error={errors.dateOfBirth} value={data.dateOfBirth} type="date"
              className="pl-9"
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 10)).toISOString().split('T')[0]}
              onChange={e => set('dateOfBirth', e.target.value)} />
          </div>
        </Field>

        <Field label="Nationality *" error={errors.nationality}>
          <div className="relative">
            <Globe size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input error={errors.nationality} value={data.nationality} placeholder="e.g. Emirati"
              className="pl-9"
              onChange={e => set('nationality', e.target.value.replace(/[^a-zA-Z\s\-]/g, ''))} />
          </div>
        </Field>

        <Field label="Home Country *" error={errors.homeCountry}>
          <CountryPicker value={data.homeCountry} onChange={v => set('homeCountry', v)}
            error={errors.homeCountry} placeholder="Select home country…" />
        </Field>

        <Field label="Occupation *" error={errors.occupation}>
          <div className="relative">
            <Briefcase size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input error={errors.occupation} value={data.occupation} placeholder="e.g. Business Owner"
              className="pl-9" onChange={e => set('occupation', e.target.value)} />
          </div>
        </Field>

        <Field label="Emirates ID Number *" error={errors.emiratesId}>
          <Input error={errors.emiratesId} value={data.emiratesId} placeholder="784-0000-0000000-0"
            maxLength={18}
            onChange={e => set('emiratesId', formatEmiratesId(e.target.value))} />
        </Field>
      </div>
    )

    if (step === 1) return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Country of Attendance *" error={errors.countryAttendance}>
            <CountryPicker value={data.countryAttendance} onChange={v => set('countryAttendance', v)}
              error={errors.countryAttendance} placeholder="Which country will you attend from?" />
          </Field>
        </div>

        <Field label="Villa / Apartment *" error={errors.villa}>
          <div className="relative">
            <MapPin size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input error={errors.villa} value={data.villa} placeholder="Villa 12, Al Barsha"
              className="pl-9" onChange={e => set('villa', e.target.value)} />
          </div>
        </Field>

        <Field label="City / Town *" error={errors.city}>
          <div className="relative">
            <MapPin size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input error={errors.city} value={data.city} placeholder="Dubai"
              className="pl-9" onChange={e => set('city', e.target.value)} />
          </div>
        </Field>

        <div className="sm:col-span-2">
          <Field label="Country *" error={errors.addressCountry}>
            <CountryPicker value={data.addressCountry} onChange={v => set('addressCountry', v)}
              error={errors.addressCountry} placeholder="Select country…" />
          </Field>
        </div>

        <FileDropzone label="Passport Copy * (PDF, JPG, PNG, max 10 MB)" accept=".pdf,.jpg,.jpeg,.png,.webp"
          file={data.passportFile} onFile={f => set('passportFile', f)} onClear={() => set('passportFile', null)}
          hint="PDF or image of passport identity page" />
        {errors.passportFile && (
          <p className="flex items-center gap-1 text-[11px] font-medium text-red-500">
            <AlertCircle size={10} strokeWidth={2.5} />{errors.passportFile}
          </p>
        )}

      </div>
    )

    if (step === 2) return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <div className="relative">
              <Calendar size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input error={errors.preferredStartDate} value={data.preferredStartDate} type="date"
                className="pl-9"
                min={new Date().toISOString().split('T')[0]}
                onChange={e => set('preferredStartDate', e.target.value)} />
            </div>
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
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-col gap-4">
              {['Forex Academy','Digital Marketing','AI Academy'].map(group => (
                <div key={group}>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">{group}</p>
                  <div className="flex flex-wrap gap-2">
                    {PROGRAMS.filter(p => p.group === group).map(p => {
                      const active = data.programs.includes(p.id)
                      return (
                        <button key={p.id} type="button"
                          onClick={() => set('programs', active ? data.programs.filter(x => x !== p.id) : [...data.programs, p.id])}
                          className={cn(
                            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                            active
                              ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                              : 'border border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600'
                          )}>
                          {active && <Check size={10} strokeWidth={3} />}
                          {p.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Field>
      </div>
    )

    return (
      <div className="flex flex-col gap-4">
        <Field label="Payment Method *" error={errors.paymentMethod}>
          <div className="relative">
            <CreditCard size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <Select error={errors.paymentMethod} value={data.paymentMethod}
              className="pl-9"
              onChange={e => set('paymentMethod', e.target.value)}>
              <option value="">Select payment method</option>
              {['Cash / Full','Card / Full','Card / Split','Card Debit','Card Credit','USDT','Tabby','Tamara'].map(m => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </div>
        </Field>

        <Field label="Password *" error={errors.password}>
          <div className="relative">
            <Lock size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showPw ? 'text' : 'password'} value={data.password}
              placeholder="Min. 8 chars, uppercase + number"
              onChange={e => set('password', e.target.value)}
              className={cn(errors.password ? inputErr : inputBase, 'pl-9 pr-10')}
            />
            <button type="button" onClick={() => setShowPw(x => !x)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {data.password && (
            <div className="flex items-center gap-2 pt-0.5">
              <div className="flex flex-1 gap-1">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-1.5 flex-1 rounded-full transition-all duration-300"
                    style={{ background: i <= strength.score ? strength.color : '#E5E7EB' }} />
                ))}
              </div>
              <span className="text-[10px] font-bold" style={{ color: strength.color }}>{strength.label}</span>
            </div>
          )}
        </Field>

        <Field label="Confirm Password *" error={errors.confirmPassword}>
          <div className="relative">
            <Lock size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showCpw ? 'text' : 'password'} value={data.confirmPassword}
              placeholder="Repeat your password"
              onChange={e => set('confirmPassword', e.target.value)}
              className={cn(errors.confirmPassword ? inputErr : inputBase, 'pl-9 pr-10')}
            />
            <button type="button" onClick={() => setShowCpw(x => !x)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
              {showCpw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </Field>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3.5 hover:border-blue-200 hover:bg-blue-50/40 transition-all">
          <input type="checkbox" checked={data.termsAccepted}
            onChange={e => set('termsAccepted', e.target.checked)}
            className="mt-0.5 h-4 w-4 flex-shrink-0 cursor-pointer rounded accent-blue-600" />
          <span className="text-xs leading-relaxed text-gray-600">
            I agree to Delta Institutions&apos;{' '}
            <button
              type="button"
              onClick={e => { e.preventDefault(); setShowTerms(true) }}
              className="font-semibold transition-colors hover:opacity-80"
              style={{ color: '#0057b8' }}
            >
              Terms &amp; Conditions
            </button>
            , Privacy Policy, and KHDA training regulations.
            I confirm the information provided is accurate and complete.
          </span>
        </label>
        {errors.termsAccepted && (
          <p className="flex items-center gap-1 text-[11px] font-medium text-red-500">
            <AlertCircle size={10} strokeWidth={2.5} />{errors.termsAccepted}
          </p>
        )}
      </div>
    )
  }

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-5">

      {/* ── Step indicator ──────────────────────────────── */}
      <div className="flex items-start">
        {STEP_LABELS.map((label, i) => (
          <div key={i} className={cn('flex items-center', i < STEP_LABELS.length - 1 && 'flex-1')}>
            <div className="flex flex-col items-center gap-1.5">
              {/* Circle */}
              <motion.div
                animate={{
                  background: i < step  ? '#0057b8' : i === step ? '#0057b8' : '#F1F3F8',
                  boxShadow:  i === step ? '0 0 0 4px rgba(0,87,184,0.12)' : 'none',
                }}
                transition={{ duration: 0.2 }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                style={{ color: i <= step ? '#fff' : '#9CA3AF' }}>
                {i < step
                  ? <Check size={14} strokeWidth={3} />
                  : <span>{i + 1}</span>}
              </motion.div>
              {/* Label */}
              <span className={cn(
                'hidden text-[10px] font-semibold whitespace-nowrap sm:block transition-colors duration-200',
                i === step ? 'text-blue-600' : i < step ? 'text-gray-500' : 'text-gray-300'
              )}>{label}</span>
            </div>

            {/* Connector line */}
            {i < STEP_LABELS.length - 1 && (
              <div className="mx-2 mb-5 flex-1">
                <div className="h-[2px] w-full rounded-full overflow-hidden bg-gray-100">
                  <motion.div
                    animate={{ width: i < step ? '100%' : '0%' }}
                    transition={{ duration: 0.3 }}
                    className="h-full rounded-full bg-blue-600" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Step header ─────────────────────────────────── */}
      <div>
        <h2 className="text-base font-bold text-gray-900">Step {step + 1}: {STEP_LABELS[step]}</h2>
        <p className="text-sm text-gray-400">
          {step === 0 && 'Tell us about yourself'}
          {step === 1 && 'Your address and documents'}
          {step === 2 && 'Choose your programs'}
          {step === 3 && 'Create your account'}
        </p>
      </div>

      {/* ── Fields ──────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div key={step}
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}>
          {renderStep()}
        </motion.div>
      </AnimatePresence>

      {/* ── API error ───────────────────────────────────── */}
      <AnimatePresence>
        {apiErr && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            <AlertCircle size={15} className="flex-shrink-0" />
            {apiErr}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Navigation ──────────────────────────────────── */}
      <div className="flex items-center gap-2 pt-1">
        {step > 0 && (
          <button type="button" onClick={back}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50">
            <ChevronLeft size={15} /> Back
          </button>
        )}

        {step < 3 ? (
          <button type="button" onClick={next}
            className="ml-auto flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: '#0057b8', boxShadow: '0 4px 14px rgba(0,87,184,0.3)' }}>
            Continue <ChevronRight size={15} />
          </button>
        ) : (
          <button type="button" onClick={submit} disabled={loading}
            className="ml-auto flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: '#0057b8', boxShadow: '0 4px 14px rgba(0,87,184,0.3)' }}>
            {loading ? <><Loader2 size={14} className="animate-spin" /> Submitting…</> : 'Submit Application'}
          </button>
        )}
      </div>

      {/* ── Sign in link ─────────────────────────────────── */}
      <p className="text-center text-xs text-gray-400">
        Already have an account?{' '}
        <button onClick={onSwitch} className="font-semibold text-blue-600 hover:underline">Sign in</button>
      </p>

      {/* ── Terms modal — always mounted so it can open from any step ── */}
      <TermsModal open={showTerms} onClose={() => setShowTerms(false)} />
    </div>
  )
}
