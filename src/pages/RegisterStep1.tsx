import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

type Field = 'fullName' | 'email' | 'password' | 'instagram'

interface FormState {
  fullName: string
  email: string
  password: string
  instagram: string
}

interface FormErrors {
  fullName?: string
  email?: string
  password?: string
}

interface Props {
  onNext: (userId: string) => void
}

export default function RegisterStep1({ onNext }: Props) {
  const [form, setForm] = useState<FormState>({
    fullName: '',
    email: '',
    password: '',
    instagram: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
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
    if (!form.fullName.trim()) next.fullName = 'Full name is required'
    if (!form.email.trim()) next.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      next.email = 'Enter a valid email address'
    if (form.password.length < 8)
      next.password = 'Password must be at least 8 characters'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleNext() {
    if (!validate()) return
    setLoading(true)
    setServerError(null)

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName.trim(),
          instagram_handle: form.instagram.trim() || null,
        },
      },
    })

    setLoading(false)

    if (error) {
      setServerError(error.message)
      return
    }

    if (!data.user) {
      setServerError('Sign-up failed — please try again.')
      return
    }

    onNext(data.user.id)
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="user-card w-full max-w-sm p-8">

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1 h-1 rounded-full bg-primary" />
          <div className="flex-1 h-1 rounded-full bg-slate-200" />
          <span className="text-xs text-slate-400 ml-1">1 / 2</span>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-main tracking-tight">Create your account</h1>
          <p className="text-sm text-slate-500 mt-1">Join TravelBuddy and find your crew</p>
        </div>

        {/* Avatar upload */}
        <div className="flex justify-center mb-8">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 hover:border-accent-pink hover:bg-pink-50 transition-colors group focus:outline-none focus:ring-2 focus:ring-accent-pink focus:ring-offset-2"
            aria-label="Upload profile picture"
          >
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Profile preview"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="flex flex-col items-center justify-center gap-1 text-slate-400 group-hover:text-accent-pink transition-colors">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span className="text-[10px] font-medium uppercase tracking-wide">Upload</span>
              </span>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={form.fullName}
              onChange={e => handleChange('fullName', e.target.value)}
              placeholder="Jane Doe"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm text-text-main placeholder:text-slate-400 outline-none transition-colors
                ${errors.fullName
                  ? 'border-red-400 bg-red-50 focus:border-red-400'
                  : 'border-slate-200 bg-slate-50 focus:border-primary focus:bg-white'}`}
            />
            {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => handleChange('email', e.target.value)}
              placeholder="jane@example.com"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm text-text-main placeholder:text-slate-400 outline-none transition-colors
                ${errors.email
                  ? 'border-red-400 bg-red-50 focus:border-red-400'
                  : 'border-slate-200 bg-slate-50 focus:border-primary focus:bg-white'}`}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={form.password}
              onChange={e => handleChange('password', e.target.value)}
              placeholder="8+ characters"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm text-text-main placeholder:text-slate-400 outline-none transition-colors
                ${errors.password
                  ? 'border-red-400 bg-red-50 focus:border-red-400'
                  : 'border-slate-200 bg-slate-50 focus:border-primary focus:bg-white'}`}
            />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Instagram Handle <span className="normal-case font-normal">(optional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">@</span>
              <input
                type="text"
                value={form.instagram}
                onChange={e => handleChange('instagram', e.target.value)}
                placeholder="yourhandle"
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:border-primary focus:bg-white text-sm text-text-main placeholder:text-slate-400 outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {serverError && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
            <p className="text-xs text-red-600">{serverError}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleNext}
          disabled={loading}
          className="mt-6 w-full py-3 rounded-xl bg-primary text-white text-sm font-semibold tracking-wide hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          {loading ? 'Creating account…' : 'Next →'}
        </button>

        <p className="text-center text-xs text-slate-500 mt-4">
          Already have an account?{' '}
          <a href="#" className="text-primary font-semibold hover:underline">Sign in</a>
        </p>

      </div>
    </div>
  )
}
