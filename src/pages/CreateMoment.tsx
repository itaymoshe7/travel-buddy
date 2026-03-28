import { useState } from 'react'
import { supabase } from '../lib/supabase'

const ACTIVITY_TYPES = [
  { id: 'landing',   label: 'Landing',   emoji: '✈️' },
  { id: 'stay',      label: 'Stay',      emoji: '🏨' },
  { id: 'trip',      label: 'Trip',      emoji: '🥾' },
  { id: 'nightlife', label: 'Nightlife', emoji: '🍻' },
] as const

type ActivityType = typeof ACTIVITY_TYPES[number]['id']

interface FormState {
  title: string
  destination: string
  startDate: string
  endDate: string
  activityType: ActivityType | null
  spots: number
  description: string
}

interface FormErrors {
  title?: string
  destination?: string
  startDate?: string
  endDate?: string
  activityType?: string
}

interface Props {
  userId: string
  onComplete: () => void
  onBack: () => void
}

export default function CreateMoment({ userId, onComplete, onBack }: Props) {
  const [form, setForm] = useState<FormState>({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    activityType: null,
    spots: 4,
    description: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
    setServerError(null)
  }

  function validate(): boolean {
    const next: FormErrors = {}
    if (!form.title.trim())       next.title        = 'Title is required'
    if (!form.destination.trim()) next.destination  = 'Destination is required'
    if (!form.startDate)          next.startDate    = 'Start date is required'
    if (!form.endDate)            next.endDate      = 'End date is required'
    else if (form.startDate && form.endDate < form.startDate)
                                  next.endDate      = 'End date must be after start date'
    if (!form.activityType)       next.activityType = 'Please choose an activity type'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setLoading(true)
    setServerError(null)

    const { error } = await supabase.from('moments').insert({
      creator_id:    userId,
      title:         form.title.trim(),
      destination:   form.destination.trim(),
      start_date:    form.startDate,
      end_date:      form.endDate,
      activity_type: form.activityType,
      total_spots:   form.spots,
      description:   form.description.trim() || null,
    })

    setLoading(false)

    if (error) {
      setServerError(error.message)
      return
    }

    onComplete()
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="user-card w-full max-w-lg p-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-text-main tracking-tight leading-none">
              Create a Moment
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Share where you're headed</p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus:underline"
          >
            Cancel
          </button>
        </div>

        <div className="space-y-6">

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Sunrise Hike"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm text-text-main placeholder:text-slate-400 outline-none transition-colors
                ${errors.title
                  ? 'border-red-400 bg-red-50'
                  : 'border-slate-200 bg-slate-50 focus:border-primary focus:bg-white'}`}
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* Destination */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Specific Destination
            </label>
            <input
              type="text"
              value={form.destination}
              onChange={e => set('destination', e.target.value)}
              placeholder="e.g. Mount Batur, Bali"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm text-text-main placeholder:text-slate-400 outline-none transition-colors
                ${errors.destination
                  ? 'border-red-400 bg-red-50'
                  : 'border-slate-200 bg-slate-50 focus:border-primary focus:bg-white'}`}
            />
            {errors.destination && <p className="text-xs text-red-500 mt-1">{errors.destination}</p>}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => set('startDate', e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm text-text-main outline-none transition-colors
                  ${errors.startDate
                    ? 'border-red-400 bg-red-50'
                    : 'border-slate-200 bg-slate-50 focus:border-primary focus:bg-white'}`}
              />
              {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={form.endDate}
                min={form.startDate || undefined}
                onChange={e => set('endDate', e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm text-text-main outline-none transition-colors
                  ${errors.endDate
                    ? 'border-red-400 bg-red-50'
                    : 'border-slate-200 bg-slate-50 focus:border-primary focus:bg-white'}`}
              />
              {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>}
            </div>
          </div>

          {/* Activity Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Activity Type
            </label>
            <div className="grid grid-cols-4 gap-2">
              {ACTIVITY_TYPES.map(type => {
                const active = form.activityType === type.id
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => set('activityType', type.id)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-center transition-all focus:outline-none focus:ring-2 focus:ring-accent-pink focus:ring-offset-1
                      ${active
                        ? 'border-accent-pink bg-pink-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-pink-200 hover:bg-pink-50/40'}`}
                  >
                    <span className="text-xl leading-none">{type.emoji}</span>
                    <span className={`text-[11px] font-semibold ${active ? 'text-accent-pink' : 'text-slate-500'}`}>
                      {type.label}
                    </span>
                  </button>
                )
              })}
            </div>
            {errors.activityType && (
              <p className="text-xs text-red-500 mt-1.5">{errors.activityType}</p>
            )}
          </div>

          {/* Spots stepper */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              How many buddies needed?
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => set('spots', Math.max(1, form.spots - 1))}
                className="w-10 h-10 rounded-full border border-slate-200 bg-white text-xl font-bold text-slate-500 hover:border-primary hover:text-primary active:bg-blue-50 transition-colors focus:outline-none flex items-center justify-center"
                aria-label="Decrease spots"
              >
                −
              </button>
              <span className="w-8 text-center text-lg font-bold text-text-main tabular-nums">
                {form.spots}
              </span>
              <button
                type="button"
                onClick={() => set('spots', Math.min(10, form.spots + 1))}
                className="w-10 h-10 rounded-full border border-slate-200 bg-white text-xl font-bold text-slate-500 hover:border-primary hover:text-primary active:bg-blue-50 transition-colors focus:outline-none flex items-center justify-center"
                aria-label="Increase spots"
              >
                +
              </button>
              <span className="text-xs text-slate-400">spots (1–10)</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              General Details <span className="normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Share what you're planning, who you're looking for, vibe…"
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:border-primary focus:bg-white text-sm text-text-main placeholder:text-slate-400 outline-none transition-colors resize-none"
            />
          </div>
        </div>

        {serverError && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
            <p className="text-xs text-red-600">{serverError}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="mt-6 w-full py-3 rounded-xl bg-primary text-white text-sm font-semibold tracking-wide hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 flex items-center justify-center gap-2"
        >
          {loading && (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
          {loading ? 'Publishing…' : 'Publish Moment'}
        </button>

      </div>
    </div>
  )
}
