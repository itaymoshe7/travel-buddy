import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  onSuccess: (userId: string) => void
  onBack:    () => void
}

export default function LoginForm({ onSuccess, onBack }: Props) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // ── Forgot-password inline view ────────────────────────────────────────────
  const [showForgot,   setShowForgot]   = useState(false)
  const [resetEmail,   setResetEmail]   = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSent,    setResetSent]    = useState(false)
  const [resetError,   setResetError]   = useState<string | null>(null)

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setLoading(false)
    if (authError) { setError(authError.message); return }
    if (data.user) onSuccess(data.user.id)
  }

  async function handleSendReset() {
    const trimmed = resetEmail.trim()
    if (!trimmed) { setResetError('Please enter your email address.'); return }
    setResetLoading(true)
    setResetError(null)
    const { error: err } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setResetLoading(false)
    if (err) { setResetError(err.message); return }
    setResetSent(true)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleLogin()
  }

  // ── Forgot-password view ───────────────────────────────────────────────────
  if (showForgot) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
        <div className="user-card w-full max-w-sm p-8">

          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-text-main tracking-tight leading-none">
                Reset Password
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                We'll send a reset link to your email.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setShowForgot(false); setResetSent(false); setResetError(null) }}
              className="text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
            >
              Back
            </button>
          </div>

          {resetSent ? (
            <div className="rounded-2xl px-5 py-6 text-center"
              style={{ background: '#F0FDF4', border: '1px solid rgba(134,239,172,0.5)' }}>
              <div className="text-3xl mb-3">📬</div>
              <p className="text-sm font-semibold mb-1" style={{ color: '#15803D' }}>
                Check your inbox
              </p>
              <p className="text-xs" style={{ color: '#4B7563' }}>
                A password reset link was sent to <strong>{resetEmail.trim()}</strong>.
                It may take a minute to arrive.
              </p>
              <button
                type="button"
                onClick={() => { setShowForgot(false); setResetSent(false); setResetEmail('') }}
                className="mt-5 w-full py-2.5 rounded-full text-sm font-bold focus:outline-none"
                style={{ background: '#1D4ED8', color: 'white' }}
              >
                Back to Login
              </button>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={e => { setResetEmail(e.target.value); setResetError(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleSendReset()}
                  placeholder="jane@example.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:border-primary focus:bg-white text-sm text-text-main placeholder:text-slate-400 outline-none transition-colors"
                />
              </div>

              {resetError && (
                <div className="mt-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-xs text-red-600">{resetError}</p>
                </div>
              )}

              <button
                type="button"
                onClick={handleSendReset}
                disabled={resetLoading}
                className="mt-5 w-full py-3 rounded-full bg-primary text-white text-sm font-bold tracking-wide hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none flex items-center justify-center gap-2"
              >
                {resetLoading && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                )}
                {resetLoading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </>
          )}

        </div>
      </div>
    )
  }

  // ── Login view ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="user-card w-full max-w-sm p-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-text-main tracking-tight leading-none">
              Welcome back
            </h1>
            <p className="text-sm text-slate-500 mt-1">Log in to your Mate account</p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus:underline"
          >
            Cancel
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null) }}
              onKeyDown={handleKey}
              placeholder="jane@example.com"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:border-primary focus:bg-white text-sm text-text-main placeholder:text-slate-400 outline-none transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Password
              </label>
              <button
                type="button"
                onClick={() => { setShowForgot(true); setResetEmail(email.trim()) }}
                className="text-xs font-semibold text-primary hover:underline focus:outline-none"
              >
                Forgot Password?
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(null) }}
              onKeyDown={handleKey}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:border-primary focus:bg-white text-sm text-text-main placeholder:text-slate-400 outline-none transition-colors"
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
          onClick={handleLogin}
          disabled={loading}
          className="mt-6 w-full py-3 rounded-full bg-primary text-white text-sm font-bold tracking-wide hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 flex items-center justify-center gap-2"
        >
          {loading && (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
          {loading ? 'Logging in…' : 'Log In'}
        </button>

        <p className="text-center text-xs text-slate-500 mt-4">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onBack}
            className="text-primary font-semibold hover:underline focus:outline-none"
          >
            Sign up
          </button>
        </p>

      </div>
    </div>
  )
}
