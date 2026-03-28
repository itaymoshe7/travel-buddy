import { useState } from 'react'
import { supabase } from '../lib/supabase'

const REGIONS = [
  { id: 'south-america',   label: 'South America',   emoji: '🌎' },
  { id: 'southeast-asia',  label: 'South East Asia', emoji: '🌏' },
  { id: 'europe',          label: 'Europe',           emoji: '🏰' },
  { id: 'north-america',   label: 'North America',   emoji: '🗽' },
  { id: 'middle-east',     label: 'Middle East',     emoji: '🕌' },
  { id: 'africa',          label: 'Africa',           emoji: '🌍' },
  { id: 'oceania',         label: 'Oceania',          emoji: '🏄' },
  { id: 'central-america', label: 'Central America', emoji: '🌺' },
]

const VIBES = [
  { id: 'backpacker',       label: 'Backpacker',       description: 'Hostels, local eats, adventure on a budget',      emoji: '🎒' },
  { id: 'digital-nomad',    label: 'Digital Nomad',    description: 'Work from anywhere, co-working spaces & cafés',   emoji: '💻' },
  { id: 'flashpacker',      label: 'Flash-packer',     description: 'Backpacker spirit with a splash of comfort',      emoji: '⚡' },
  { id: 'adventure-seeker', label: 'Adventure Seeker', description: 'Hikes, dives, and off-the-beaten-path thrills',  emoji: '🧗' },
  { id: 'luxury-traveler',  label: 'Luxury Traveler',  description: 'Boutique hotels, fine dining, curated experiences', emoji: '✨' },
]

interface Props {
  userId:     string
  onComplete: () => void
}

export default function RegisterStep3({ userId, onComplete }: Props) {
  const [bio,            setBio]            = useState('')
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [selectedVibe,   setSelectedVibe]   = useState<string | null>(null)
  const [loading,        setLoading]        = useState(false)
  const [serverError,    setServerError]    = useState<string | null>(null)

  const bioMax = 160

  async function handleComplete() {
    setLoading(true)
    setServerError(null)

    const { error } = await supabase
      .from('profiles')
      .update({
        bio:           bio.trim() || null,
        travel_region: selectedRegion,
        travel_vibe:   selectedVibe,
      })
      .eq('id', userId)

    setLoading(false)

    if (error) {
      if (error.code === 'PGRST301' || error.message.toLowerCase().includes('jwt')) {
        setServerError('Please confirm your email first, then sign in to save your profile details.')
        return
      }
      setServerError(error.message)
      return
    }

    onComplete()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F8FAFC' }}>
      <div className="w-full max-w-lg rounded-2xl p-8"
        style={{ background: 'white', boxShadow: '0 4px 24px rgba(15,23,42,0.08)' }}>

        {/* Step indicator — 3 / 3 */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1 h-1 rounded-full" style={{ background: '#1D4ED8', opacity: 0.4 }} />
          <div className="flex-1 h-1 rounded-full" style={{ background: '#1D4ED8', opacity: 0.4 }} />
          <div className="flex-1 h-1 rounded-full" style={{ background: '#1D4ED8' }} />
          <span className="text-xs ml-1" style={{ color: '#94A3B8' }}>3 / 3</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#0F172A' }}>
            Your travel story
          </h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            Help others know who they'll be adventuring with
          </p>
        </div>

        {/* Bio */}
        <div className="mb-8">
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
            style={{ color: '#64748B' }}>
            Bio
          </label>
          <div className="relative">
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value.slice(0, bioMax))}
              placeholder="I'm a wanderer chasing sunsets, street food, and spontaneous adventures…"
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors resize-none"
              style={{ border: '1.5px solid #E2E8F0', background: '#F8FAFC', color: '#0F172A' }}
            />
            <span className="absolute bottom-2.5 right-3 text-[11px] select-none"
              style={{ color: '#94A3B8' }}>
              {bio.length}/{bioMax}
            </span>
          </div>
        </div>

        {/* Travel Region */}
        <div className="mb-8">
          <label className="block text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: '#64748B' }}>
            Where do you want to explore?
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {REGIONS.map(region => {
              const active = selectedRegion === region.id
              return (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => setSelectedRegion(active ? null : region.id)}
                  className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border text-center transition-all focus:outline-none"
                  style={{
                    border:     active ? '1.5px solid #F472B6' : '1.5px solid #E2E8F0',
                    background: active ? '#FDF2F8' : 'white',
                  }}
                >
                  <span className="text-xl leading-none">{region.emoji}</span>
                  <span className="text-[11px] font-semibold leading-tight"
                    style={{ color: active ? '#BE185D' : '#475569' }}>
                    {region.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Travel Vibe */}
        <div className="mb-8">
          <label className="block text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: '#64748B' }}>
            What's your travel vibe?
          </label>
          <div className="space-y-2">
            {VIBES.map(vibe => {
              const active = selectedVibe === vibe.id
              return (
                <button
                  key={vibe.id}
                  type="button"
                  onClick={() => setSelectedVibe(active ? null : vibe.id)}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left transition-all focus:outline-none"
                  style={{
                    border:     active ? '1.5px solid #F472B6' : '1.5px solid #E2E8F0',
                    background: active ? '#FDF2F8' : 'white',
                  }}
                >
                  <span className="text-2xl leading-none shrink-0">{vibe.emoji}</span>
                  <span className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-semibold"
                      style={{ color: active ? '#BE185D' : '#0F172A' }}>
                      {vibe.label}
                    </span>
                    <span className="text-xs truncate" style={{ color: '#64748B' }}>
                      {vibe.description}
                    </span>
                  </span>
                  {active && (
                    <svg className="ml-auto w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24"
                      stroke="#BE185D" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {serverError && (
          <div className="mb-4 px-4 py-3 rounded-xl"
            style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <p className="text-xs" style={{ color: '#92400E' }}>{serverError}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleComplete}
          disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-semibold tracking-wide transition-colors focus:outline-none"
          style={{ background: '#1D4ED8', color: 'white', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Saving…' : 'Complete Profile 🎉'}
        </button>

        <p className="text-center text-xs mt-3" style={{ color: '#94A3B8' }}>
          You can update these details any time in your profile.
        </p>

      </div>
    </div>
  )
}
