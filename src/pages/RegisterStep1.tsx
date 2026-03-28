import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

type Field = 'fullName' | 'email' | 'password' | 'socialLink'

interface FormState {
  fullName:   string
  email:      string
  password:   string
  socialLink: string
}

interface FormErrors {
  fullName?:   string
  email?:      string
  password?:   string
  socialLink?: string
}

interface Props {
  onNext: (userId: string, socialLink: string) => void
}

export default function RegisterStep1({ onNext }: Props) {
  const [form, setForm] = useState<FormState>({
    fullName:   '',
    email:      '',
    password:   '',
    socialLink: '',
  })
  const [errors,      setErrors]      = useState<FormErrors>({})
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleChange(field: Field, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
    setServerError(null)
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarPreview(URL.createObjectURL(file))
  }

  function validate(): boolean {
    const next: FormErrors = {}
    if (!form.fullName.trim())
      next.fullName = 'Full name is required'
    if (!form.email.trim())
      next.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      next.email = 'Enter a valid email address'
    if (form.password.length < 6)
      next.password = 'Password must be at least 6 characters'
    if (!form.socialLink.trim())
      next.socialLink = 'Social profile link is required'
    else if (!/^https?:\/\//i.test(form.socialLink.trim()))
      next.socialLink = 'Enter a full URL (e.g. https://instagram.com/you)'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleNext() {
    if (!validate()) return
    setLoading(true)
    setServerError(null)

    const { data, error } = await supabase.auth.signUp({
      email:    form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName.trim() },
      },
    })

    setLoading(false)

    if (error) { setServerError(error.message); return }
    if (!data.user) { setServerError('Sign-up failed — please try again.'); return }

    onNext(data.user.id, form.socialLink.trim())
  }

  // ─── helpers ────────────────────────────────────────────────────────────────

  function Field({
    label, type = 'text', value, placeholder, error, onChange, hint,
  }: {
    label: string; type?: string; value: string
    placeholder: string; error?: string; onChange: (v: string) => void; hint?: string
  }) {
    return (
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
          style={{ color: '#64748B' }}>
          {label}
        </label>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
          style={{
            border:     error ? '1.5px solid #F87171' : '1.5px solid #E2E8F0',
            background: error ? '#FEF2F2' : '#F8FAFC',
            color:      '#0F172A',
          }}
        />
        {error && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{error}</p>}
        {hint && !error && <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>{hint}</p>}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F8FAFC' }}>
      <div className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: 'white', boxShadow: '0 4px 24px rgba(15,23,42,0.08)' }}>

        {/* Step indicator — 1 / 3 */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1 h-1 rounded-full" style={{ background: '#1D4ED8' }} />
          <div className="flex-1 h-1 rounded-full" style={{ background: '#E2E8F0' }} />
          <div className="flex-1 h-1 rounded-full" style={{ background: '#E2E8F0' }} />
          <span className="text-xs ml-1" style={{ color: '#94A3B8' }}>1 / 3</span>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#0F172A' }}>
            Create your account
          </h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            Join TravelBuddy and find your crew
          </p>
        </div>

        {/* Avatar upload */}
        <div className="flex justify-center mb-8">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative w-24 h-24 rounded-full flex items-center justify-center focus:outline-none transition-colors group"
            style={{ background: '#F1F5F9', border: '2px dashed #CBD5E1' }}
            aria-label="Upload profile picture"
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Preview"
                className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1" style={{ color: '#94A3B8' }}>
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span className="text-[10px] font-medium uppercase tracking-wide">Photo</span>
              </span>
            )}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={handleAvatarChange} />
        </div>

        {/* Form */}
        <div className="space-y-4">
          <Field label="Full Name"    value={form.fullName}
            placeholder="Jane Doe"           error={errors.fullName}
            onChange={v => handleChange('fullName', v)} />

          <Field label="Email"        type="email" value={form.email}
            placeholder="jane@example.com"   error={errors.email}
            onChange={v => handleChange('email', v)} />

          <Field label="Password"     type="password" value={form.password}
            placeholder="6+ characters"      error={errors.password}
            hint="Minimum 6 characters"
            onChange={v => handleChange('password', v)} />

          <Field label="Social Profile Link" value={form.socialLink}
            placeholder="https://instagram.com/you"
            error={errors.socialLink}
            hint="Instagram or Facebook profile URL"
            onChange={v => handleChange('socialLink', v)} />
        </div>

        {serverError && (
          <div className="mt-4 px-4 py-3 rounded-xl" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
            <p className="text-xs" style={{ color: '#DC2626' }}>{serverError}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleNext}
          disabled={loading}
          className="mt-6 w-full py-3 rounded-xl text-sm font-semibold tracking-wide transition-colors focus:outline-none"
          style={{ background: '#1D4ED8', color: 'white', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Creating account…' : 'Next →'}
        </button>

        <p className="text-center text-xs mt-4" style={{ color: '#94A3B8' }}>
          Already have an account?{' '}
          <a href="#" className="font-semibold" style={{ color: '#1D4ED8' }}>Sign in</a>
        </p>

      </div>
    </div>
  )
}
