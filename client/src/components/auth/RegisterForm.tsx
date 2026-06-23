'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Mail, Lock, Phone, AlertCircle, Eye, EyeOff,
  Upload, ChevronRight, ChevronLeft, Loader2, Check, FileText, X,
} from 'lucide-react'
import { api } from '@/lib/axios'
import { cn } from '@/lib/utils'

/* ── Types ─────────────────────────────────────────── */
interface FormData {
  /* Step 1 — Personal */
  name:             string
  email:            string
  phone:            string
  emergencyContact: string
  gender:           string
  dateOfBirth:      string
  nationality:      string
  homeCountry:      string
  occupation:       string
  emiratesId:       string
  /* Step 2 — Address + Docs */
  countryAttendance: string
  villa:             string
  city:              string
  addressCountry:    string
  passportFile:      File | null
  photoFile:         File | null
  /* Step 3 — Program */
  experienceLevel:   string
  preferredStartDate: string
  hearAboutUs:       string
  referralName:      string
  programs:          string[]
  /* Step 4 — Account */
  paymentMethod:     string
  password:          string
  confirmPassword:   string
  termsAccepted:     boolean
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
  { id: 'forex-beginner',        label: 'Forex — Beginner',       group: 'Forex Academy' },
  { id: 'forex-intermediate',    label: 'Forex — Intermediate',    group: 'Forex Academy' },
  { id: 'forex-advanced',        label: 'Forex — Advanced',        group: 'Forex Academy' },
  { id: 'dm-social',             label: 'Social Media Marketing',  group: 'Digital Marketing' },
  { id: 'dm-seo',                label: 'SEO & Content',           group: 'Digital Marketing' },
  { id: 'ai-fundamentals',       label: 'AI Fundamentals',         group: 'AI Academy' },
  { id: 'ai-trading',            label: 'AI Trading Automation',   group: 'AI Academy' },
]

const STEP_LABELS = ['Personal', 'Address & Docs', 'Program', 'Account']

/* ── Helpers ───────────────────────────────────────── */
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

/* ── Sub-components ────────────────────────────────── */
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
  return (
    <input
      {...props}
      className={cn('w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all', className)}
      style={{
        background: error ? '#FEF2F2' : '#F4F5F8',
        border: `1.5px solid ${error ? '#FCA5A5' : 'transparent'}`,
        color: '#0D0F1A',
      }}
      onFocus={e => {
        e.currentTarget.style.border = `1.5px solid ${error ? '#EF4444' : '#0057b8'}`
        e.currentTarget.style.background = '#fff'
        e.currentTarget.style.boxShadow = `0 0 0 3px rgba(${error ? '239,68,68' : '0,87,184'},0.10)`
      }}
      onBlur={e => {
        e.currentTarget.style.border = `1.5px solid ${error ? '#FCA5A5' : 'transparent'}`
        e.currentTarget.style.background = error ? '#FEF2F2' : '#F4F5F8'
        e.currentTarget.style.boxShadow = 'none'
      }}
    />
  )
}

function Select({ error, children, ...props }: { error?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all appearance-none"
      style={{
        background: error ? '#FEF2F2' : '#F4F5F8',
        border: `1.5px solid ${error ? '#FCA5A5' : 'transparent'}`,
        color: props.value ? '#0D0F1A' : '#9CA3AF',
      }}
      onFocus={e => {
        e.currentTarget.style.border = `1.5px solid ${error ? '#EF4444' : '#0057b8'}`
        e.currentTarget.style.background = '#fff'
        e.currentTarget.style.boxShadow = `0 0 0 3px rgba(${error ? '239,68,68' : '0,87,184'},0.10)`
      }}
      onBlur={e => {
        e.currentTarget.style.border = `1.5px solid ${error ? '#FCA5A5' : 'transparent'}`
        e.currentTarget.style.background = error ? '#FEF2F2' : '#F4F5F8'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {children}
    </select>
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
          <span className="text-xs" style={{ color: '#9CA3AF' }}>
            {(file.size / 1024).toFixed(0)} KB
          </span>
          <button type="button" onClick={onClear}
            className="flex-shrink-0 rounded-full p-0.5 hover:bg-red-100 transition-colors">
            <X size={12} style={{ color: '#EF4444' }} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => {
            e.preventDefault(); setDragging(false)
            const f = e.dataTransfer.files[0]
            if (f) onFile(f)
          }}
          className="flex flex-col items-center gap-1.5 rounded-xl px-4 py-4 transition-all text-center"
          style={{
            background: dragging ? 'rgba(0,87,184,0.06)' : '#F4F5F8',
            border: `1.5px dashed ${dragging ? '#0057b8' : '#D1D5DB'}`,
          }}>
          <Upload size={18} style={{ color: dragging ? '#0057b8' : '#9CA3AF' }} />
          <span className="text-xs font-medium" style={{ color: dragging ? '#0057b8' : '#6B7280' }}>
            Click or drag to upload
          </span>
          {hint && <span className="text-[10px]" style={{ color: '#9CA3AF' }}>{hint}</span>}
        </button>
      )}
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
    </div>
  )
}

/* ── Main component ────────────────────────────────── */
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

  /* ── Per-step validation ──────────────────────────── */
  function validateStep(s: number): boolean {
    const errs: Partial<Record<keyof FormData, string>> = {}

    if (s === 0) {
      if (!data.name.trim())             errs.name             = 'Full name is required'
      if (!data.email.trim())            errs.email            = 'Email is required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errs.email = 'Invalid email'
      if (!data.phone.trim())            errs.phone            = 'Phone number is required'
      if (!data.emergencyContact.trim()) errs.emergencyContact = 'Emergency contact is required'
      if (!data.gender)                  errs.gender           = 'Please select gender'
      if (!data.dateOfBirth)             errs.dateOfBirth      = 'Date of birth is required'
      if (!data.nationality.trim())      errs.nationality      = 'Nationality is required'
      if (!data.homeCountry.trim())      errs.homeCountry      = 'Home country is required'
      if (!data.occupation.trim())       errs.occupation       = 'Occupation is required'
      if (!data.emiratesId.trim())       errs.emiratesId       = 'Emirates ID is required'
    }

    if (s === 1) {
      if (!data.countryAttendance)  errs.countryAttendance = 'Please select country of attendance'
      if (!data.villa.trim())       errs.villa             = 'Villa / Apartment is required'
      if (!data.city.trim())        errs.city              = 'City is required'
      if (!data.addressCountry.trim()) errs.addressCountry  = 'Country is required'
      if (!data.passportFile)       errs.passportFile      = 'Passport copy is required'
    }

    if (s === 2) {
      if (!data.experienceLevel)       errs.experienceLevel    = 'Please select experience level'
      if (!data.preferredStartDate)    errs.preferredStartDate = 'Preferred start date is required'
      if (!data.hearAboutUs)           errs.hearAboutUs        = 'Please tell us how you heard about us'
      if (data.programs.length === 0)  errs.programs           = 'Please select at least one program'
    }

    if (s === 3) {
      if (!data.paymentMethod)         errs.paymentMethod    = 'Please select payment method'
      if (!data.password)              errs.password         = 'Password is required'
      else if (data.password.length < 8) errs.password       = 'At least 8 characters'
      else if (!/[A-Z]/.test(data.password)) errs.password   = 'Must contain an uppercase letter'
      else if (!/[0-9]/.test(data.password)) errs.password   = 'Must contain a number'
      if (data.password !== data.confirmPassword) errs.confirmPassword = 'Passwords do not match'
      if (!data.termsAccepted)         errs.termsAccepted    = 'You must accept the terms'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function next() {
    if (validateStep(step)) setStep(s => s + 1)
  }

  function back() {
    setErrors({})
    setStep(s => s - 1)
  }

  /* ── Submit ───────────────────────────────────────── */
  async function submit() {
    if (!validateStep(3)) return
    setLoading(true)
    setApiErr(null)

    try {
      /* 1. Register with all text fields */
      await api.post('/auth/register', {
        name:     data.name.trim(),
        email:    data.email.trim().toLowerCase(),
        password: data.password,
        enrollmentApplication: {
          phone:              data.phone,
          emergencyContact:   data.emergencyContact,
          gender:             data.gender,
          dateOfBirth:        data.dateOfBirth,
          nationality:        data.nationality,
          homeCountry:        data.homeCountry,
          occupation:         data.occupation,
          emiratesId:         data.emiratesId,
          countryAttendance:  data.countryAttendance,
          villa:              data.villa,
          city:               data.city,
          addressCountry:     data.addressCountry,
          experienceLevel:    data.experienceLevel,
          preferredStartDate: data.preferredStartDate,
          hearAboutUs:        data.hearAboutUs,
          referralName:       data.referralName || undefined,
          programs:           data.programs,
          paymentMethod:      data.paymentMethod,
        },
      })

      /* 2. Upload files (now authenticated via cookie) */
      let passportUrl = ''
      let photoUrl    = ''

      if (data.passportFile) {
        const fd = new FormData()
        fd.append('file', data.passportFile)
        const r = await api.post<{ success: true; data: { url: string } }>('/uploads/document', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        passportUrl = r.data.data.url
      }

      if (data.photoFile) {
        const fd = new FormData()
        fd.append('file', data.photoFile)
        const r = await api.post<{ success: true; data: { url: string } }>('/uploads/document', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        photoUrl = r.data.data.url
      }

      /* 3. Attach file URLs to enrollment application */
      if (passportUrl || photoUrl) {
        await api.patch('/auth/me/enrollment-docs', {
          ...(passportUrl ? { passportUrl } : {}),
          ...(photoUrl    ? { photoUrl }    : {}),
        })
      }

      /* 4. Redirect to dashboard */
      window.location.href = '/my-learning'
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message
        ?? 'Registration failed. Please try again.'
      setApiErr(msg)
      setLoading(false)
    }
  }

  const strength = getStrength(data.password)

  /* ── Step content ─────────────────────────────────── */
  function renderStep() {
    if (step === 0) return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Full Name *" error={errors.name}>
          <div className="relative">
            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
            <Input error={errors.name} value={data.name} placeholder="e.g. Ahmed Al Mansouri"
              className="w-full rounded-xl pl-9 pr-3.5 py-2.5 text-sm outline-none transition-all"
              style={{ background: errors.name ? '#FEF2F2' : '#F4F5F8', border: `1.5px solid ${errors.name ? '#FCA5A5' : 'transparent'}`, color: '#0D0F1A' }}
              onChange={e => set('name', e.target.value)} />
          </div>
        </Field>

        <Field label="Email Address *" error={errors.email}>
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
            <Input error={errors.email} value={data.email} type="email" placeholder="you@example.com"
              className="w-full rounded-xl pl-9 pr-3.5 py-2.5 text-sm outline-none transition-all"
              style={{ background: errors.email ? '#FEF2F2' : '#F4F5F8', border: `1.5px solid ${errors.email ? '#FCA5A5' : 'transparent'}`, color: '#0D0F1A' }}
              onChange={e => set('email', e.target.value)} />
          </div>
        </Field>

        <Field label="Phone / WhatsApp *" error={errors.phone}>
          <div className="relative">
            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
            <Input error={errors.phone} value={data.phone} type="tel" placeholder="+971 50 000 0000"
              className="w-full rounded-xl pl-9 pr-3.5 py-2.5 text-sm outline-none transition-all"
              style={{ background: errors.phone ? '#FEF2F2' : '#F4F5F8', border: `1.5px solid ${errors.phone ? '#FCA5A5' : 'transparent'}`, color: '#0D0F1A' }}
              onChange={e => set('phone', e.target.value)} />
          </div>
        </Field>

        <Field label="Emergency Contact *" error={errors.emergencyContact}>
          <Input error={errors.emergencyContact} value={data.emergencyContact} type="tel" placeholder="+971 50 000 0000"
            onChange={e => set('emergencyContact', e.target.value)} />
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
          <Input error={errors.dateOfBirth} value={data.dateOfBirth} type="date"
            onChange={e => set('dateOfBirth', e.target.value)} />
        </Field>

        <Field label="Nationality *" error={errors.nationality}>
          <Input error={errors.nationality} value={data.nationality} placeholder="e.g. Emirati"
            onChange={e => set('nationality', e.target.value)} />
        </Field>

        <Field label="Home Country *" error={errors.homeCountry}>
          <Input error={errors.homeCountry} value={data.homeCountry} placeholder="e.g. United Arab Emirates"
            onChange={e => set('homeCountry', e.target.value)} />
        </Field>

        <Field label="Occupation *" error={errors.occupation}>
          <Input error={errors.occupation} value={data.occupation} placeholder="e.g. Business Owner"
            onChange={e => set('occupation', e.target.value)} />
        </Field>

        <Field label="Emirates ID Number *" error={errors.emiratesId}>
          <Input error={errors.emiratesId} value={data.emiratesId} placeholder="784-0000-0000000-0"
            onChange={e => set('emiratesId', e.target.value)} />
        </Field>
      </div>
    )

    if (step === 1) return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Country of Attendance *" error={errors.countryAttendance}>
            <Select error={errors.countryAttendance} value={data.countryAttendance}
              onChange={e => set('countryAttendance', e.target.value)}>
              <option value="">Select country</option>
              {['UAE','Saudi Arabia','Kuwait','Qatar','Bahrain','Oman','India','Pakistan','Philippines','UK','US','Other'].map(c => (
                <option key={c}>{c}</option>
              ))}
            </Select>
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
            <Input error={errors.addressCountry} value={data.addressCountry} placeholder="United Arab Emirates"
              onChange={e => set('addressCountry', e.target.value)} />
          </Field>
        </div>

        <FileDropzone
          label="Passport Copy * (PDF, JPG, PNG — max 10 MB)"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          file={data.passportFile}
          onFile={f => set('passportFile', f)}
          onClear={() => set('passportFile', null)}
          hint="PDF or image of passport identity page"
        />
        {errors.passportFile && <p className="text-xs" style={{ color: '#EF4444' }}>{errors.passportFile}</p>}

        <FileDropzone
          label="Professional Photo (JPG, PNG — optional)"
          accept=".jpg,.jpeg,.png,.webp"
          file={data.photoFile}
          onFile={f => set('photoFile', f)}
          onClear={() => set('photoFile', null)}
          hint="Passport-size photo on white background"
        />
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
          <div className="flex flex-col gap-2 rounded-xl p-3" style={{ background: '#F4F5F8', border: '1.5px solid transparent' }}>
            {['Forex Academy', 'Digital Marketing', 'AI Academy'].map(group => (
              <div key={group}>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>{group}</p>
                <div className="flex flex-wrap gap-1.5">
                  {PROGRAMS.filter(p => p.group === group).map(p => {
                    const active = data.programs.includes(p.id)
                    return (
                      <button key={p.id} type="button"
                        onClick={() => set('programs', active
                          ? data.programs.filter(x => x !== p.id)
                          : [...data.programs, p.id]
                        )}
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

    /* Step 4 */
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
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
            <input
              type={showPw ? 'text' : 'password'}
              value={data.password}
              placeholder="Min 8 chars, uppercase + number"
              onChange={e => set('password', e.target.value)}
              className="w-full rounded-xl pl-9 pr-10 py-2.5 text-sm outline-none transition-all"
              style={{
                background: errors.password ? '#FEF2F2' : '#F4F5F8',
                border: `1.5px solid ${errors.password ? '#FCA5A5' : 'transparent'}`,
                color: '#0D0F1A',
              }}
              onFocus={e => {
                e.currentTarget.style.border = `1.5px solid ${errors.password ? '#EF4444' : '#0057b8'}`
                e.currentTarget.style.background = '#fff'
                e.currentTarget.style.boxShadow = `0 0 0 3px rgba(${errors.password ? '239,68,68' : '0,87,184'},0.10)`
              }}
              onBlur={e => {
                e.currentTarget.style.border = `1.5px solid ${errors.password ? '#FCA5A5' : 'transparent'}`
                e.currentTarget.style.background = errors.password ? '#FEF2F2' : '#F4F5F8'
                e.currentTarget.style.boxShadow = 'none'
              }}
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
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
            <input
              type={showCpw ? 'text' : 'password'}
              value={data.confirmPassword}
              placeholder="Repeat your password"
              onChange={e => set('confirmPassword', e.target.value)}
              className="w-full rounded-xl pl-9 pr-10 py-2.5 text-sm outline-none transition-all"
              style={{
                background: errors.confirmPassword ? '#FEF2F2' : '#F4F5F8',
                border: `1.5px solid ${errors.confirmPassword ? '#FCA5A5' : 'transparent'}`,
                color: '#0D0F1A',
              }}
              onFocus={e => {
                e.currentTarget.style.border = `1.5px solid ${errors.confirmPassword ? '#EF4444' : '#0057b8'}`
                e.currentTarget.style.background = '#fff'
                e.currentTarget.style.boxShadow = `0 0 0 3px rgba(${errors.confirmPassword ? '239,68,68' : '0,87,184'},0.10)`
              }}
              onBlur={e => {
                e.currentTarget.style.border = `1.5px solid ${errors.confirmPassword ? '#FCA5A5' : 'transparent'}`
                e.currentTarget.style.background = errors.confirmPassword ? '#FEF2F2' : '#F4F5F8'
                e.currentTarget.style.boxShadow = 'none'
              }}
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

  /* ── Render ───────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-4">
      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEP_LABELS.map((label, i) => (
          <div key={i} className="flex items-center" style={{ flex: i < STEP_LABELS.length - 1 ? '1 1 0' : undefined }}>
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all"
                style={{
                  background: i < step ? '#0057b8' : i === step ? '#0057b8' : '#E4E7ED',
                  color: i <= step ? '#fff' : '#9CA3AF',
                }}>
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
        <h3 className="text-sm font-bold" style={{ color: '#0D0F1A' }}>
          Step {step + 1}: {STEP_LABELS[step]}
        </h3>
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
          <AlertCircle size={14} />
          {apiErr}
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
        <button onClick={onSwitch} className="font-semibold" style={{ color: '#0057b8' }}>
          Sign in
        </button>
      </p>
    </div>
  )
}
