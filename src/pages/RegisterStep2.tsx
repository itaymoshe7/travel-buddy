import { useState } from 'react'
import { supabase } from '../lib/supabase'

type Gender = 'male' | 'female' | 'other'

const GENDER_OPTIONS: { id: Gender; label: string; emoji: string }[] = [
  { id: 'male',   label: 'Male',   emoji: '👨' },
  { id: 'female', label: 'Female', emoji: '👩' },
  { id: 'other',  label: 'Other',  emoji: '🧑' },
]

interface Props {
  userId:     string
  socialLink: string
  onNext:     () => void
}

export default function RegisterStep2({ userId, socialLink, onNext }: Props) {
  const [gender,      setGender]      = useState<Gender | null>(null)
  const [age,         setAge]         = useState('')
  const [errors,      setErrors]      = useState<{ gender?: string; age?: string }>({})
  const [loading,     setLoading]     = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  function validate(): boolean {
    const next: { gender?: string; age?: string } = {}
    if (!gender) next.gender = 'Please select your gender'
    const ageNum = parseInt(age, 10)
    if (!age.trim()) next.age = 'Age is required'
    else if (isNaN(ageNum) || ageNum < 18 || ageNum > 120)
      next.age = 'Enter a valid age (18–120)'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleNext() {
    if (!validate()) return
    setLoading(true)
    setServerError(null)

    const { error } = await supabase
      .from('profiles')
      .update({
        social_link: socialLink || null,
        gender,
        age: parseInt(age, 10),
      })
      .eq('id', userId)

    setLoading(false)

    if (error) {
      if (error.code === 'PGRST301' || error.message.toLowerCase().includes('jwt')) {
        // Email not confirmed yet — let user proceed; data saved in step 3 or on login
        onNext()
        return
      }
      setServerError(error.message)
      return
    }

    onNext()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F8FAFC' }}>
      <div className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: 'white', boxShadow: '0 4px 24px rgba(15,23,42,0.08)' }}>

        {/* Step indicator — 1 / 2 */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1 h-1 rounded-full" style={{ background: '#1D4ED8' }} />
          <div className="flex-1 h-1 rounded-full" style={{ background: '#E2E8F0' }} />
          <span className="text-xs ml-1" style={{ color: '#94A3B8' }}>1 / 2</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#0F172A' }}>
            A bit about you
          </h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            Help travellers know who they're connecting with
          </p>
        </div>

        {/* Gender */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: '#64748B' }}>
            Gender
          </label>
          <div className="flex gap-2">
            {GENDER_OPTIONS.map(opt => {
              const active = gender === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => { setGender(opt.id); setErrors(p => ({ ...p, gender: undefined })) }}
                  className="flex-1 flex flex-col items-center gap-2 py-3 rounded-xl transition-all focus:outline-none"
                  style={{
                    border:     active ? '1.5px solid #1D4ED8' : '1.5px solid #E2E8F0',
                    background: active ? '#EFF6FF' : 'white',
                  }}
                >
                  <span className="text-2xl leading-none">{opt.emoji}</span>
                  <span className="text-xs font-semibold"
                    style={{ color: active ? '#1D4ED8' : '#64748B' }}>
                    {opt.label}
                  </span>
                </button>
              )
            })}
          </div>
          {errors.gender && (
            <p className="text-xs mt-1.5" style={{ color: '#EF4444' }}>{errors.gender}</p>
          )}
        </div>

        {/* Age */}
        <div className="mb-8">
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
            style={{ color: '#64748B' }}>
            Age
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={18}
            max={120}
            value={age}
            onChange={e => { setAge(e.target.value); setErrors(p => ({ ...p, age: undefined })) }}
            placeholder="e.g. 26"
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
            style={{
              border:     errors.age ? '1.5px solid #F87171' : '1.5px solid #E2E8F0',
              background: errors.age ? '#FEF2F2' : '#F8FAFC',
              color:      '#0F172A',
            }}
          />
          {errors.age && (
            <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errors.age}</p>
          )}
        </div>

        {serverError && (
          <div className="mb-4 px-4 py-3 rounded-xl"
            style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
            <p className="text-xs" style={{ color: '#DC2626' }}>{serverError}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleNext}
          disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-semibold tracking-wide transition-colors focus:outline-none"
          style={{ background: '#1D4ED8', color: 'white', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Saving…' : 'Next →'}
        </button>

      </div>
    </div>
  )
}
