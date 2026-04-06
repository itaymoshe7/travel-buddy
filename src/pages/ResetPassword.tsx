import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Step = 'loading' | 'form' | 'success' | 'invalid'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [step,      setStep]      = useState<Step>('loading')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  // Supabase redirects back with a recovery token in the URL hash.
  // The JS SDK auto-exchanges it on load and fires onAuthStateChange with
  // event='PASSWORD_RECOVERY'. We wait for that before showing the form.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setStep('form')
    })
    // Timeout: if the token exchange never fires, the link was invalid/expired
    const timer = setTimeout(() => {
      setStep(prev => prev === 'loading' ? 'invalid' : prev)
    }, 4000)
    return () => { subscription.unsubscribe(); clearTimeout(timer) }
  }, [])

  async function handleSubmit() {
    setError(null)
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setSaving(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (err) { setError(err.message); return }
    setStep('success')
  }

  // ── Loading (waiting for token exchange) ───────────────────────────────────
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#1D4ED8', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  // ── Invalid / expired link ──────────────────────────────────────────────────
  if (step === 'invalid') {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
        <div className="user-card w-full max-w-sm p-8 text-center">
          <div className="text-4xl mb-4">🔗</div>
          <h1 className="text-xl font-bold text-text-main mb-2">Link Expired</h1>
          <p className="text-sm text-slate-500 mb-6">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full py-3 rounded-full bg-primary text-white text-sm font-bold focus:outline-none"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
        <div className="user-card w-full max-w-sm p-8 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: '#F0FDF4' }}>
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#15803D" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-text-main mb-2">Password Updated</h1>
          <p className="text-sm text-slate-500 mb-6">
            Your password has been changed successfully. You can now log in with your new password.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="w-full py-3 rounded-full bg-primary text-white text-sm font-bold focus:outline-none"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="user-card w-full max-w-sm p-8">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-main tracking-tight leading-none">
            New Password
          </h1>
          <p className="text-sm text-slate-500 mt-1">Choose a strong password for your account.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(null) }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Min. 6 characters"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:border-primary focus:bg-white text-sm text-text-main placeholder:text-slate-400 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setError(null) }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Repeat your new password"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm text-text-main placeholder:text-slate-400 outline-none transition-colors
                ${confirm && confirm !== password
                  ? 'border-red-300 bg-red-50'
                  : 'border-slate-200 bg-slate-50 focus:border-primary focus:bg-white'}`}
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="mt-6 w-full py-3 rounded-full bg-primary text-white text-sm font-bold tracking-wide hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none flex items-center justify-center gap-2"
        >
          {saving && (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
          {saving ? 'Updating…' : 'Update Password'}
        </button>

      </div>
    </div>
  )
}
