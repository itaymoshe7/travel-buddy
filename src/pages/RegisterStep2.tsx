import { useState } from 'react'
import { supabase } from '../lib/supabase'

const REGIONS = [
  { id: 'south-america',   label: 'South America',    emoji: '🌎' },
  { id: 'southeast-asia',  label: 'South East Asia',  emoji: '🌏' },
  { id: 'europe',          label: 'Europe',            emoji: '🏰' },
  { id: 'north-america',   label: 'North America',    emoji: '🗽' },
  { id: 'middle-east',     label: 'Middle East',      emoji: '🕌' },
  { id: 'africa',          label: 'Africa',            emoji: '🌍' },
  { id: 'oceania',         label: 'Oceania',           emoji: '🏄' },
  { id: 'central-america', label: 'Central America',  emoji: '🌺' },
]

const VIBES = [
  {
    id: 'backpacker',
    label: 'Backpacker',
    description: 'Hostels, local eats, adventure on a budget',
    emoji: '🎒',
  },
  {
    id: 'digital-nomad',
    label: 'Digital Nomad',
    description: 'Work from anywhere, co-working spaces & cafés',
    emoji: '💻',
  },
  {
    id: 'flashpacker',
    label: 'Flash-packer',
    description: 'Backpacker spirit with a splash of comfort',
    emoji: '⚡',
  },
  {
    id: 'adventure-seeker',
    label: 'Adventure Seeker',
    description: 'Hikes, dives, and off-the-beaten-path thrills',
    emoji: '🧗',
  },
  {
    id: 'luxury-traveler',
    label: 'Luxury Traveler',
    description: 'Boutique hotels, fine dining, curated experiences',
    emoji: '✨',
  },
]

interface Props {
  userId: string
  onComplete: () => void
}

export default function RegisterStep2({ userId, onComplete }: Props) {
  const [bio, setBio] = useState('')
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const bioMax = 160

  async function handleComplete() {
    setLoading(true)
    setServerError(null)

    const { error } = await supabase
      .from('profiles')
      .update({
        bio: bio.trim() || null,
        travel_region: selectedRegion,
        travel_vibe: selectedVibe,
      })
      .eq('id', userId)

    setLoading(false)

    if (error) {
      // If RLS blocks the update (email not confirmed yet), let the user proceed
      // anyway — their choices can be saved once they log in.
      if (error.code === 'PGRST301' || error.message.toLowerCase().includes('jwt')) {
        setServerError(
          'Please confirm your email first, then sign in to save your profile details.',
        )
        return
      }
      setServerError(error.message)
      return
    }

    onComplete()
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="user-card w-full max-w-lg p-8">

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1 h-1 rounded-full bg-primary opacity-40" />
          <div className="flex-1 h-1 rounded-full bg-primary" />
          <span className="text-xs text-slate-400 ml-1">2 / 2</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-main tracking-tight">Your travel story</h1>
          <p className="text-sm text-slate-500 mt-1">Help others know who they'll be adventuring with</p>
        </div>

        {/* Bio */}
        <div className="mb-8">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Bio
          </label>
          <div className="relative">
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value.slice(0, bioMax))}
              placeholder="I'm a wanderer chasing sunsets, street food, and spontaneous adventures…"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:border-primary focus:bg-white text-sm text-text-main placeholder:text-slate-400 outline-none transition-colors resize-none"
            />
            <span className="absolute bottom-2.5 right-3 text-[11px] text-slate-400 select-none">
              {bio.length}/{bioMax}
            </span>
          </div>
        </div>

        {/* Travel Region */}
        <div className="mb-8">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
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
                  className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border text-center transition-all focus:outline-none focus:ring-2 focus:ring-accent-pink focus:ring-offset-1
                    ${active
                      ? 'border-accent-pink bg-pink-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-pink-200 hover:bg-pink-50/50'
                    }`}
                >
                  <span className="text-xl leading-none">{region.emoji}</span>
                  <span className={`text-[11px] font-semibold leading-tight ${active ? 'text-accent-pink' : 'text-slate-600'}`}>
                    {region.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Travel Vibe */}
        <div className="mb-8">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
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
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl border text-left transition-all focus:outline-none focus:ring-2 focus:ring-accent-pink focus:ring-offset-1
                    ${active
                      ? 'border-accent-pink bg-pink-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-pink-200 hover:bg-pink-50/50'
                    }`}
                >
                  <span className="text-2xl leading-none shrink-0">{vibe.emoji}</span>
                  <span className="flex flex-col gap-0.5 min-w-0">
                    <span className={`text-sm font-semibold ${active ? 'text-accent-pink' : 'text-text-main'}`}>
                      {vibe.label}
                    </span>
                    <span className="text-xs text-slate-500 truncate">{vibe.description}</span>
                  </span>
                  {active && (
                    <svg className="ml-auto w-4 h-4 text-accent-pink shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {serverError && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-700">{serverError}</p>
          </div>
        )}

        {/* Complete Profile */}
        <button
          type="button"
          onClick={handleComplete}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-primary text-white text-sm font-semibold tracking-wide hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          {loading ? 'Saving…' : 'Complete Profile'}
        </button>

        <p className="text-center text-xs text-slate-400 mt-3">
          You can update these details any time in your profile settings.
        </p>

      </div>
    </div>
  )
}
