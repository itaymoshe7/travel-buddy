import { City } from 'country-state-city'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/src/style.css'
import { supabase } from '../lib/supabase'

// ─── Regions ──────────────────────────────────────────────────────────────────

const REGIONS = [
  { id: 'south-america',         label: 'South America',           emoji: '🌎' },
  { id: 'central-north-america', label: 'Central & North America', emoji: '🗽' },
  { id: 'europe',                label: 'Europe',                   emoji: '🏰' },
  { id: 'australia',             label: 'Australia',                emoji: '🐨' },
  { id: 'africa',                label: 'Africa',                   emoji: '🦁' },
  { id: 'asia',                  label: 'Asia',                     emoji: '⛩️' },
] as const

type RegionId = typeof REGIONS[number]['id']

const REGION_COUNTRY_CODES: Record<RegionId, string[]> = {
  'south-america':         ['AR','BR','CL','CO','PE','UY','EC','BO','PY','VE','GY','SR'],
  'central-north-america': ['US','CA','MX','GT','BZ','HN','SV','NI','CR','PA','CU','JM','DO','TT','BB','BS'],
  'europe':                ['FR','DE','GB','IT','ES','PT','NL','BE','CH','AT','SE','NO','DK','FI','GR','PL','CZ','HU','RO','BG','HR','RS','SK','SI','EE','LV','LT','IE','IS','AL','BA','ME','MK','LU','CY','MT','MD','UA','BY','RU'],
  'australia':             ['AU','NZ','FJ','PG','WS','TO','VU','SB'],
  'africa':                ['ZA','EG','NG','KE','ET','MA','TZ','GH','TN','DZ','SN','MZ','UG','ZM','ZW','CM','CI','AO','MG','RW','SD','CD','MU','SC','NA','BW','LY','DJ','SL','GM'],
  'asia':                  ['CN','JP','KR','IN','TH','VN','ID','SG','MY','PH','TW','HK','AE','TR','SA','QA','KW','BH','OM','JO','LB','IL','GE','AM','AZ','NP','LK','BD','PK','MV','KH','LA','MM','MN','UZ','KZ'],
}

const FEATURED_CITIES: Record<RegionId, string[]> = {
  'south-america':         ['Buenos Aires','Rio de Janeiro','São Paulo','Bogotá','Lima','Santiago','Cartagena','Medellín','Cusco','Montevideo','Quito','La Paz','Fortaleza','Valparaíso','Florianópolis'],
  'central-north-america': ['New York','Los Angeles','Miami','Mexico City','Cancún','Tulum','Chicago','Toronto','Las Vegas','San Francisco','New Orleans','Vancouver','Nashville','Montréal','Havana'],
  'europe':                ['Paris','Barcelona','Amsterdam','Rome','Lisbon','Prague','Berlin','Athens','Budapest','Dubrovnik','London','Madrid','Vienna','Copenhagen','Zürich'],
  'australia':             ['Sydney','Melbourne','Brisbane','Perth','Gold Coast','Auckland','Queenstown','Cairns','Byron Bay','Darwin','Adelaide','Christchurch','Wellington','Nadi','Rotorua'],
  'africa':                ['Marrakech','Cape Town','Nairobi','Cairo','Zanzibar','Addis Ababa','Lagos','Casablanca','Accra','Dakar','Johannesburg','Kigali','Dar es Salaam','Sharm El-Sheikh','Luxor'],
  'asia':                  ['Tokyo','Bangkok','Bali','Singapore','Seoul','Hong Kong','Dubai','Hanoi','Kuala Lumpur','Chiang Mai','Kyoto','Osaka','Istanbul','Mumbai','New Delhi'],
}

const FALLBACK_CITIES: Record<RegionId, string[]> = {
  'south-america': ['Buenos Aires','Río de Janeiro','São Paulo','Bogotá','Lima','Santiago','Cartagena','Medellín','Cusco','Montevideo','Quito','La Paz','Fortaleza','Valparaíso','Florianópolis'],
  'central-north-america': ['New York','Los Angeles','Miami','Mexico City','Cancún','Tulum','Chicago','Toronto','Las Vegas','San Francisco','New Orleans','Vancouver','Nashville','Montréal','Havana'],
  'europe': ['Paris','Barcelona','Amsterdam','Rome','Lisbon','Prague','Berlin','Athens','Budapest','Dubrovnik','London','Madrid','Vienna','Copenhagen','Zürich','Milan','Venice','Florence','Porto','Seville'],
  'australia': ['Sydney','Melbourne','Brisbane','Perth','Gold Coast','Auckland','Queenstown','Cairns','Byron Bay','Darwin','Adelaide','Christchurch','Wellington'],
  'africa': ['Marrakech','Cape Town','Nairobi','Cairo','Zanzibar','Addis Ababa','Lagos','Casablanca','Accra','Dakar','Johannesburg','Kigali','Dar es Salaam'],
  'asia': ['Tokyo','Bangkok','Bali','Singapore','Seoul','Hong Kong','Dubai','Hanoi','Kuala Lumpur','Chiang Mai','Kyoto','Osaka','Istanbul','Mumbai','New Delhi'],
}

function isUsableCityName(name: string): boolean {
  if (!name || name.length > 42) return false
  const l = name.toLowerCase()
  if (l.includes('municipality')) return false
  if (l.includes('kabupaten'))    return false
  if (l.includes('prefecture'))   return false
  if (l.startsWith('kota '))      return false
  if (l.includes(' and ') && l.includes(' city')) return false
  return true
}

const regionCityCache = new Map<RegionId, string[]>()

function buildRegionCities(regionId: RegionId): string[] {
  if (regionCityCache.has(regionId)) return regionCityCache.get(regionId)!
  const set = new Set<string>()
  for (const c of FEATURED_CITIES[regionId]) set.add(c)
  let libraryCount = 0
  for (const code of REGION_COUNTRY_CODES[regionId]) {
    const libCities = City.getCitiesOfCountry(code) ?? []
    for (const city of libCities) {
      if (isUsableCityName(city.name)) { set.add(city.name); libraryCount++ }
    }
  }
  if (libraryCount === 0) {
    for (const c of FALLBACK_CITIES[regionId]) set.add(c)
  }
  const sorted = Array.from(set).sort((a, b) => a.localeCompare(b))
  regionCityCache.set(regionId, sorted)
  return sorted
}

// ─── DatePicker ───────────────────────────────────────────────────────────────

function toDate(iso: string): Date | undefined {
  if (!iso) return undefined
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function DatePicker({
  value, onChange, disabled: isDisabled, disabledDays, placeholder, error,
}: {
  value: string; onChange: (iso: string) => void; disabled?: boolean
  disabledDays?: (date: Date) => boolean; placeholder?: string; error?: string
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const selected = toDate(value)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const display = selected
    ? selected.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : placeholder ?? 'Select date'

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => setOpen(o => !o)}
        className={`w-full px-4 py-2.5 rounded-xl border text-sm text-left outline-none transition-colors flex items-center justify-between gap-2
          ${isDisabled
            ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
            : error
              ? 'border-red-400 bg-red-50 text-text-main'
              : 'border-slate-200 bg-slate-50 text-text-main focus:border-primary focus:bg-white'}`}
      >
        <span style={{ color: selected ? undefined : '#94A3B8' }}>{display}</span>
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}
          style={{ color: isDisabled ? '#CBD5E1' : '#94A3B8' }}>
          <rect x="3" y="4" width="18" height="18" rx="3" ry="3" />
          <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </button>
      {open && !isDisabled && (
        <div className="absolute z-50 rounded-2xl overflow-hidden"
          style={{ top: 'calc(100% + 6px)', left: 0, background: 'white',
                   boxShadow: '0 8px 32px rgba(15,23,42,0.15)', border: '1px solid #E2E8F0' }}>
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(day) => { onChange(day ? toISO(day) : ''); setOpen(false) }}
            disabled={disabledDays}
            styles={{ root: { margin: 0, fontFamily: 'inherit', fontSize: 14 } }}
            classNames={{ today: 'rdp-today', selected: 'rdp-selected' }}
          />
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

// ─── CitySearch ───────────────────────────────────────────────────────────────

function CitySearch({
  regionId, value, onChange, error,
}: {
  regionId: RegionId | null; value: string; onChange: (v: string) => void; error?: string
}) {
  const [allCities,      setAllCities]      = useState<string[]>([])
  const [computing,      setComputing]      = useState(false)
  const [open,           setOpen]           = useState(false)
  const [cursor,         setCursor]         = useState(-1)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef  = useRef<HTMLUListElement>(null)

  useEffect(() => {
    setDebouncedQuery('')
    if (!regionId) { setAllCities([]); return }
    if (regionCityCache.has(regionId)) { setAllCities(regionCityCache.get(regionId)!); return }
    setComputing(true)
    const tid = setTimeout(() => {
      setAllCities(buildRegionCities(regionId))
      setComputing(false)
    }, 0)
    return () => clearTimeout(tid)
  }, [regionId])

  useEffect(() => {
    const tid = setTimeout(() => setDebouncedQuery(value.trim().toLowerCase()), 150)
    return () => clearTimeout(tid)
  }, [value])

  useEffect(() => { setCursor(-1) }, [debouncedQuery, regionId])

  useEffect(() => {
    if (cursor < 0 || !listRef.current) return
    const el = listRef.current.children[cursor] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  const suggestions = useMemo(() => {
    if (!regionId) return []
    if (!debouncedQuery) return FEATURED_CITIES[regionId]
    const src = allCities.length ? allCities : FALLBACK_CITIES[regionId]
    const q          = debouncedQuery
    const startsWith = src.filter(c => c.toLowerCase().startsWith(q))
    const contains   = src.filter(c => !c.toLowerCase().startsWith(q) && c.toLowerCase().includes(q))
    return [...startsWith, ...contains].slice(0, 100)
  }, [debouncedQuery, regionId, allCities])

  function select(city: string) {
    onChange(city); setOpen(false); setCursor(-1); inputRef.current?.blur()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) { if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true) }; return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, -1)) }
    else if (e.key === 'Enter' && cursor >= 0) { e.preventDefault(); select(suggestions[cursor]) }
    else if (e.key === 'Escape') { setOpen(false) }
  }

  const isDisabled = !regionId

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          disabled={isDisabled}
          placeholder={isDisabled ? 'Select a region first' : computing ? 'Loading cities…' : 'Search any city…'}
          autoComplete="off"
          onChange={e => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          className={`w-full px-4 py-2.5 pr-9 rounded-xl border text-sm outline-none transition-colors
            ${error
              ? 'border-red-400 bg-red-50 text-text-main'
              : isDisabled
                ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'border-slate-200 bg-slate-50 text-text-main focus:border-primary focus:bg-white'}`}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }}>
          {computing
            ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
            : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
          }
        </span>
      </div>
      {open && suggestions.length > 0 && (
        <ul ref={listRef} className="absolute left-0 right-0 rounded-xl overflow-y-auto z-40"
          style={{ top: 'calc(100% + 4px)', background: 'white',
                   boxShadow: '0 4px 6px rgba(15,23,42,0.06), 0 10px 32px rgba(15,23,42,0.12)',
                   border: '1px solid #E2E8F0', maxHeight: 220 }}>
          {suggestions.map((city, i) => (
            <li key={city}>
              <button type="button" onMouseDown={() => select(city)}
                className="w-full px-4 py-2.5 text-left text-sm focus:outline-none"
                style={{
                  background: i === cursor ? '#EFF6FF' : 'transparent',
                  color: i === cursor ? '#1D4ED8' : '#0F172A',
                  fontWeight: i === cursor ? 600 : 400,
                  borderBottom: i < suggestions.length - 1 ? '1px solid #F8FAFC' : 'none',
                }}>
                {city}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

// ─── Activity Types ───────────────────────────────────────────────────────────

const ACTIVITY_TYPES = [
  { id: 'landing',   label: 'Landing',   emoji: '✈️' },
  { id: 'stay',      label: 'Stay',      emoji: '🏡' },
  { id: 'trip',      label: 'Trip',      emoji: '🥾' },
  { id: 'nightlife', label: 'Nightlife', emoji: '🍻' },
] as const

type ActivityType = typeof ACTIVITY_TYPES[number]['id']

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  title:        string
  destination:  string
  region:       RegionId | null
  startDate:    string
  endDate:      string
  activityType: ActivityType | null
  spots:        number
  description:  string
}

interface FormErrors {
  title?:        string
  destination?:  string
  region?:       string
  startDate?:    string
  endDate?:      string
  activityType?: string
}

interface Props {
  momentId:   string
  userId:     string
  onComplete: () => void
  onBack:     () => void
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EditMoment({ momentId, userId, onComplete, onBack }: Props) {
  const [form, setForm] = useState<FormState>({
    title: '', destination: '', region: null,
    startDate: '', endDate: '', activityType: null, spots: 4, description: '',
  })
  const [errors,          setErrors]          = useState<FormErrors>({})
  const [fetchLoading,    setFetchLoading]    = useState(true)
  const [fetchError,      setFetchError]      = useState<string | null>(null)
  const [loading,         setLoading]         = useState(false)
  const [serverError,     setServerError]     = useState<string | null>(null)
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)
  const [imageFile,       setImageFile]       = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [removeExisting,  setRemoveExisting]  = useState(false)
  const [uploadError,     setUploadError]     = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Load existing moment data
  useEffect(() => {
    async function load() {
      setFetchLoading(true)
      const { data, error } = await supabase
        .from('moments')
        .select('title, destination, region, start_date, end_date, activity_type, total_spots, description, image_url, creator_id')
        .eq('id', momentId)
        .single()
      if (error || !data) {
        setFetchError(error?.message ?? 'Moment not found')
        setFetchLoading(false)
        return
      }
      // Verify ownership
      if (data.creator_id !== userId) {
        setFetchError('You do not own this moment.')
        setFetchLoading(false)
        return
      }
      setForm({
        title:        data.title ?? '',
        destination:  data.destination ?? '',
        region:       (REGIONS.some(r => r.id === data.region) ? data.region : null) as RegionId | null,
        startDate:    data.start_date ?? '',
        endDate:      data.end_date ?? '',
        activityType: (ACTIVITY_TYPES.some(a => a.id === data.activity_type) ? data.activity_type : null) as ActivityType | null,
        spots:        data.total_spots ?? 4,
        description:  data.description ?? '',
      })
      if (data.image_url) {
        setExistingImageUrl(data.image_url)
        setImagePreviewUrl(data.image_url)
      }
      setFetchLoading(false)
    }
    load()
  }, [momentId, userId])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    setImageFile(file)
    if (imagePreviewUrl && imagePreviewUrl !== existingImageUrl) URL.revokeObjectURL(imagePreviewUrl)
    setImagePreviewUrl(URL.createObjectURL(file))
    setRemoveExisting(false)
    setUploadError(null)
  }

  function removeImage() {
    setImageFile(null)
    if (imagePreviewUrl && imagePreviewUrl !== existingImageUrl) URL.revokeObjectURL(imagePreviewUrl)
    setImagePreviewUrl(null)
    setRemoveExisting(true)
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
    setServerError(null)
  }

  function handleStartDateChange(newStart: string) {
    setForm(prev => ({
      ...prev,
      startDate: newStart,
      endDate: (prev.endDate && newStart && prev.endDate < newStart) ? '' : prev.endDate,
    }))
    setErrors(prev => ({ ...prev, startDate: undefined, endDate: undefined }))
    setServerError(null)
  }

  function validate(): boolean {
    const next: FormErrors = {}
    if (!form.title.trim())       next.title        = 'Title is required'
    if (!form.destination.trim()) next.destination  = 'City is required'
    if (!form.region)             next.region       = 'Please choose a region'
    if (!form.startDate)          next.startDate    = 'Start date is required'
    if (!form.endDate)            next.endDate      = 'End date is required'
    if (!form.activityType)       next.activityType = 'Please choose an activity type'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setLoading(true)
    setServerError(null)
    setUploadError(null)

    let imageUrl: string | null | undefined = undefined  // undefined = no change

    if (imageFile) {
      // Upload new image
      const ext  = imageFile.name.split('.').pop() ?? 'jpg'
      const path = `${userId}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('moment-images')
        .upload(path, imageFile, { upsert: false })
      if (uploadErr) {
        setUploadError('Image upload failed: ' + uploadErr.message)
        setLoading(false)
        return
      }
      const { data: urlData } = supabase.storage.from('moment-images').getPublicUrl(path)
      imageUrl = urlData.publicUrl
    } else if (removeExisting) {
      imageUrl = null
    }

    const updates: Record<string, unknown> = {
      title:         form.title.trim(),
      destination:   form.destination.trim(),
      region:        form.region,
      start_date:    form.startDate,
      end_date:      form.endDate,
      activity_type: form.activityType,
      total_spots:   form.spots,
      description:   form.description.trim() || null,
    }
    if (imageUrl !== undefined) updates.image_url = imageUrl

    const { error } = await supabase
      .from('moments')
      .update(updates)
      .eq('id', momentId)
      .eq('creator_id', userId)

    setLoading(false)
    if (error) { setServerError(error.message); return }
    onComplete()
  }

  // ── Loading / error states ─────────────────────────────────────────────────

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: '#1D4ED8', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
        <div className="user-card w-full max-w-sm p-8 text-center">
          <p className="text-sm text-red-600 mb-4">{fetchError}</p>
          <button type="button" onClick={onBack}
            className="text-sm font-semibold" style={{ color: '#1D4ED8' }}>
            ← Go back
          </button>
        </div>
      </div>
    )
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="user-card w-full max-w-lg p-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-text-main tracking-tight leading-none">
              Edit Moment
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Update the details below</p>
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

          {/* Region */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Region
            </label>
            <div className="grid grid-cols-3 gap-2">
              {REGIONS.map(r => {
                const active = form.region === r.id
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setForm(prev => ({ ...prev, region: r.id as RegionId, destination: '' }))
                      setErrors(prev => ({ ...prev, region: undefined, destination: undefined }))
                      setServerError(null)
                    }}
                    className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border text-center transition-all focus:outline-none
                      ${active
                        ? 'border-accent-pink bg-pink-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-pink-200 hover:bg-pink-50/40'}`}
                  >
                    <span className="text-xl leading-none">{r.emoji}</span>
                    <span className="text-[11px] font-semibold leading-tight mt-0.5"
                      style={{ color: active ? undefined : '#64748B' }}>
                      {r.label}
                    </span>
                  </button>
                )
              })}
            </div>
            {errors.region && <p className="text-xs text-red-500 mt-1.5">{errors.region}</p>}
          </div>

          {/* City */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              City
            </label>
            <CitySearch
              regionId={form.region}
              value={form.destination}
              onChange={v => set('destination', v)}
              error={errors.destination}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Start Date
              </label>
              <DatePicker
                value={form.startDate}
                onChange={handleStartDateChange}
                placeholder="Pick a date"
                error={errors.startDate}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                End Date
              </label>
              <DatePicker
                value={form.endDate}
                onChange={v => set('endDate', v)}
                disabled={!form.startDate}
                disabledDays={form.startDate ? (date: Date) => date < toDate(form.startDate)! : undefined}
                placeholder="Pick a date"
                error={errors.endDate}
              />
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
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-center transition-all focus:outline-none
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
            {errors.activityType && <p className="text-xs text-red-500 mt-1.5">{errors.activityType}</p>}
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
              <span className="w-8 text-center text-lg font-bold text-text-main tabular-nums">{form.spots}</span>
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

          {/* Cover Image */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Cover Photo <span className="normal-case font-normal">(optional)</span>
            </label>

            {imagePreviewUrl ? (
              <div className="relative rounded-xl overflow-hidden" style={{ height: 160 }}>
                <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center focus:outline-none"
                  style={{ background: 'rgba(0,0,0,0.55)', color: 'white' }}
                  aria-label="Remove image"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 py-8 transition-colors focus:outline-none hover:border-primary hover:bg-blue-50/30"
                style={{ borderColor: '#CBD5E1', background: '#F8FAFC' }}
              >
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: '#94A3B8' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M13.5 12h.008v.008H13.5V12zm-6-3a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium" style={{ color: '#64748B' }}>Tap to add a cover photo</span>
                <span className="text-xs" style={{ color: '#94A3B8' }}>JPG, PNG, WebP</span>
              </button>
            )}

            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
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
          className="mt-6 w-full py-3 rounded-full bg-primary text-white text-sm font-bold tracking-wide hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none flex items-center justify-center gap-2"
        >
          {loading && (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
          {loading ? 'Saving…' : 'Save Changes'}
        </button>

      </div>
    </div>
  )
}
