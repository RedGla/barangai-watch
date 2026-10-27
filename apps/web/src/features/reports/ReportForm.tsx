import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, m } from 'motion/react'
import {
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  LoaderCircle,
  LocateFixed,
  Map as MapIcon,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Kap, kapAvailable } from '@/components/Kap'
import { Alert, LargeTitle } from '@/components/page'
import { cn } from '@/lib/utils'
import { post } from '../../lib/api'
import { Txt, useText } from '../../lib/i18n'
import { ResidentAccount } from '../../app/ResidentShell'
import { categories, label } from './categories'
import { CategoryTile } from './CategoryIcon'
import { MapPicker } from './MapPicker'
import { useSubmitReport } from './queries'
import type { Category, Prediction, Report } from './types'

const UNAVAILABLE: Prediction = { prediction_available: false, model_category: null, confidence: null }
const NOT_FILLED = { category: false, description: false }
const STEPS = ['Photo', 'Location', 'Details', 'Review'] as const
const EASE = [0.22, 1, 0.36, 1] as const
const PATH = ['Pending', 'Under Verification', 'Accepted', 'In Progress', 'Resolved']

/** Client-side checks so residents learn about unusable photos before uploading them. */
function photoProblem(file: File) {
  if (/\.hei[cf]$/i.test(file.name) || ['image/heic', 'image/heif'].includes(file.type))
    return 'HEIC photos are not supported. Choose JPG, PNG, or WebP, or take a new photo.'
  const supported =
    ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    (!file.type && /\.(jpe?g|png|webp)$/i.test(file.name))
  if (!supported) return 'Choose a JPG, PNG, or WebP photo.'
  if (file.size > 5_000_000) return 'Photo is too large. Choose a photo of 5 MB or less.'
  return ''
}

function validCoordinates(latitude: string, longitude: string) {
  const lat = Number(latitude)
  const lng = Number(longitude)
  return latitude !== '' && longitude !== '' && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
}

function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('hairline rounded-2xl bg-card p-4', className)}>{children}</div>
}

export function ReportForm() {
  const t = useText()
  const submitReport = useSubmitReport()
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [category, setCategory] = useState<Category | ''>('')
  const [description, setDescription] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [showMap, setShowMap] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState<Report | null>(null)
  // Which fields the AI filled from the photo; editing a field hands it back to the resident.
  const [aiFilled, setAiFilled] = useState(NOT_FILLED)
  useEffect(() => {
    if (!photo || typeof URL.createObjectURL !== 'function') return
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])
  useEffect(() => {
    if (!photo) return
    const controller = new AbortController()
    const form = new FormData()
    form.set('image', photo)
    void post<Prediction>('/reports/predict', form, { signal: controller.signal })
      .then(result => {
        if (controller.signal.aborted) return
        setPrediction(result)
        const filled = { ...NOT_FILLED }
        if (result.model_category) {
          setCategory(current => current || result.model_category!)
          filled.category = true
        }
        if (result.suggested_description) {
          setDescription(current => current || result.suggested_description!)
          filled.description = true
        }
        setAiFilled(filled)
      })
      .catch(() => {
        if (!controller.signal.aborted) setPrediction(UNAVAILABLE)
      })
    return () => controller.abort()
  }, [photo])

  function go(next: number) {
    setDirection(next > step ? 1 : -1)
    setError('')
    setStep(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Reset native inputs so selecting the same photo again still fires change.
    event.target.value = ''
    if (file) pickPhoto(file)
  }
  function pickPhoto(file: File) {
    setPhoto(null)
    setPreview('')
    setCategory('')
    if (aiFilled.description) setDescription('')
    setAiFilled(NOT_FILLED)
    setPrediction(null)
    setError('')
    const problem = photoProblem(file)
    if (problem) setError(problem)
    else setPhoto(file)
  }
  function locate() {
    if (!navigator.geolocation) {
      setError('GPS is unavailable. Enter coordinates or place a pin on the map.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      position => {
        setLatitude(position.coords.latitude.toFixed(6))
        setLongitude(position.coords.longitude.toFixed(6))
        setLocating(false)
        setError('')
      },
      () => {
        setLocating(false)
        setError('Location access was unavailable. Enter coordinates or place a pin on the map.')
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }
  function submit() {
    if (!photo || !category) {
      setError('Add a photo and category.')
      return
    }
    if (!validCoordinates(latitude, longitude)) {
      setError('Enter valid coordinates.')
      return
    }
    const form = new FormData()
    form.set('image', photo)
    form.set('resident_category', category)
    form.set('latitude', latitude)
    form.set('longitude', longitude)
    if (description.trim()) form.set('description', description.trim())
    submitReport.mutate(form, {
      onSuccess: report => {
        navigator.vibrate?.(25)
        setSubmitted(report)
      },
      onError: caught => setError(caught.message),
    })
  }
  function startOver() {
    setSubmitted(null)
    setPhoto(null)
    setPreview('')
    setPrediction(null)
    setCategory('')
    setDescription('')
    setLatitude('')
    setLongitude('')
    setShowMap(false)
    setAiFilled(NOT_FILLED)
    setDirection(-1)
    setStep(0)
  }

  if (submitted) return <SuccessView report={submitted} onAnother={startOver} />

  const ready = [Boolean(photo), validCoordinates(latitude, longitude), Boolean(category), true]
  const located = validCoordinates(latitude, longitude)
  return (
    <div className="lg:mx-auto lg:max-w-6xl">
      <LargeTitle title={t('Make a report')} trailing={<ResidentAccount />} />
      {/* Desktop: the steps on the left, a live summary of the report on the right. */}
      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start xl:gap-10">
        <div>
          <div className="mb-4">
            <div className="mb-2 flex items-baseline justify-between text-[15px]">
              <strong className="font-semibold">
                <Txt>{STEPS[step]}</Txt>
              </strong>
              <span className="text-muted-foreground">
                {t('Step')} {step + 1} {t('of')} {STEPS.length}
              </span>
            </div>
            <div className="flex gap-1.5" aria-hidden="true">
              {STEPS.map((name, index) => (
                <span key={name} className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <m.i
                    className="block h-full origin-left rounded-full bg-primary"
                    initial={false}
                    animate={{ scaleX: index <= step ? 1 : 0 }}
                    transition={{ duration: 0.25, ease: EASE }}
                  />
                </span>
              ))}
            </div>
          </div>
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <m.div
              key={step}
              className="space-y-3"
              custom={direction}
              variants={{
                enter: (dir: number) => ({ opacity: 0, x: dir * 24 }),
                center: { opacity: 1, x: 0 },
                exit: (dir: number) => ({ opacity: 0, x: dir * -24 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: EASE }}
            >
              {step === 0 && (
                <PhotoStep
                  photo={photo}
                  preview={preview}
                  prediction={prediction}
                  onSelect={selectPhoto}
                  onDrop={pickPhoto}
                />
              )}
              {step === 1 && (
                <>
                  <p className="text-[15px] text-muted-foreground">
                    <Txt>Use GPS, move a map pin, or enter coordinates.</Txt>
                  </p>
                  <Card className="space-y-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      <Button
                        className="w-full whitespace-normal lg:h-[52px]"
                        type="button"
                        onClick={locate}
                        disabled={locating}
                      >
                        {locating ? <LoaderCircle className="animate-spin" /> : <LocateFixed />}
                        <Txt>{locating ? 'Finding your location…' : 'Use GPS'}</Txt>
                      </Button>
                      <Button
                        variant="tinted"
                        className="w-full whitespace-normal lg:h-[52px]"
                        type="button"
                        onClick={() => setShowMap(!showMap)}
                      >
                        <MapIcon />
                        <Txt>{showMap ? 'Hide map' : 'Adjust pin on map'}</Txt>
                      </Button>
                    </div>
                    {located && (
                      <m.p
                        className="flex items-center gap-2 rounded-xl bg-[color-mix(in_oklab,var(--status-resolved)_12%,transparent)] px-3 py-2.5 text-[15px] font-medium text-[var(--status-resolved)]"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <CheckCircle2 className="size-5 shrink-0" />
                        <span>
                          <Txt>Location set</Txt> · {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}
                        </span>
                      </m.p>
                    )}
                  </Card>
                  {showMap && (
                    <div className="hairline overflow-hidden rounded-2xl">
                      <MapPicker
                        latitude={latitude ? Number(latitude) : null}
                        longitude={longitude ? Number(longitude) : null}
                        onPick={(lat, lng) => {
                          setLatitude(String(lat))
                          setLongitude(String(lng))
                        }}
                      />
                    </div>
                  )}
                  <details className="group hairline rounded-2xl bg-card">
                    <summary className="flex min-h-12 items-center justify-between px-4 text-[16px] font-medium [&::-webkit-details-marker]:hidden">
                      <Txt>Enter coordinates manually</Txt>
                      <ChevronRight className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
                    </summary>
                    <div className="grid grid-cols-2 gap-3 px-4 pb-4">
                      <label className="space-y-1.5 text-[14px] font-medium text-muted-foreground">
                        <Txt>Latitude</Txt>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          min="-90"
                          max="90"
                          value={latitude}
                          onChange={event => setLatitude(event.target.value)}
                          placeholder="14.326900"
                          className="text-foreground"
                        />
                      </label>
                      <label className="space-y-1.5 text-[14px] font-medium text-muted-foreground">
                        <Txt>Longitude</Txt>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          min="-180"
                          max="180"
                          value={longitude}
                          onChange={event => setLongitude(event.target.value)}
                          placeholder="120.936400"
                          className="text-foreground"
                        />
                      </label>
                    </div>
                  </details>
                </>
              )}
              {step === 2 && (
                <>
                  <fieldset>
                    <legend className="mb-2 flex w-full items-center justify-between gap-2 px-1 text-[15px] font-semibold">
                      <Txt>Incident category</Txt>
                      {aiFilled.category && <AiTag />}
                    </legend>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {categories.map(item => (
                        <label
                          key={item.value}
                          className="hairline relative flex min-h-13 items-center gap-3 rounded-2xl bg-card p-3 pr-9 text-[15px] leading-snug font-medium transition-[box-shadow,background-color] has-checked:bg-tint has-checked:shadow-[0_0_0_2px_var(--primary)] has-focus-visible:ring-2 has-focus-visible:ring-ring"
                        >
                          <input
                            className="sr-only"
                            type="radio"
                            name="category"
                            value={item.value}
                            required
                            checked={category === item.value}
                            onChange={() => {
                              setCategory(item.value)
                              setAiFilled(current => ({ ...current, category: false }))
                            }}
                          />
                          <CategoryTile category={item.value} />
                          <Txt>{item.label}</Txt>
                          {category === item.value && (
                            <m.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 600, damping: 26 }}
                              className="absolute top-1/2 right-2.5 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-primary text-primary-foreground"
                            >
                              <Check className="size-4" strokeWidth={3} aria-hidden="true" />
                            </m.span>
                          )}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <AnimatePresence>
                    {category === 'exposed_wiring' && (
                      <m.div
                        role="note"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex gap-2.5 rounded-2xl bg-[color-mix(in_oklab,var(--status-progress)_13%,transparent)] p-3 text-[14px] leading-snug">
                          <TriangleAlert className="size-5 shrink-0 text-[var(--status-progress)]" aria-hidden="true" />
                          <span>
                            <Txt>
                              Stay well away and do not touch the wire or anything it touches. If it is sparking or on
                              the ground, warn people nearby and call your barangay or electric company right away.
                            </Txt>
                          </span>
                        </div>
                      </m.div>
                    )}
                  </AnimatePresence>
                  <label className="block space-y-2">
                    <span className="flex items-center justify-between gap-2 px-1 text-[15px] font-semibold">
                      <Txt>Description (optional)</Txt>
                      {aiFilled.description && <AiTag />}
                    </span>
                    <Textarea
                      rows={2}
                      className="min-h-16"
                      maxLength={1000}
                      placeholder={t('What happened? Add details the photo may not show.')}
                      value={description}
                      onChange={event => {
                        setDescription(event.target.value)
                        setAiFilled(current => ({ ...current, description: false }))
                      }}
                    />
                    {!aiFilled.description && (
                      <span className="hidden items-center gap-1.5 px-1 text-[13px] font-normal text-muted-foreground sm:flex">
                        <Sparkles className="size-3.5" aria-hidden="true" />
                        <Txt>Soon the AI will write this from your photo. For now, add a short note if you like.</Txt>
                      </span>
                    )}
                  </label>
                </>
              )}
              {step === 3 && (
                <div className="hairline overflow-hidden rounded-2xl bg-card">
                  {preview && (
                    <img
                      className="aspect-[2/1] w-full object-cover lg:aspect-[3/1]"
                      src={preview}
                      alt={t('Preview of incident photo')}
                    />
                  )}
                  <dl>
                    {[
                      { term: 'Photo', value: photo?.name, edit: 0 },
                      {
                        term: 'Location',
                        value: `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`,
                        edit: 1,
                      },
                      { term: 'Incident category', value: t(label(category || null)), edit: 2 },
                      {
                        term: 'Description (optional)',
                        value: description.trim() || t('No description added'),
                        edit: 2,
                      },
                    ].map(item => (
                      <div key={item.term} className="flex items-start gap-3 border-t px-4 py-3 first:border-t-0">
                        <div className="min-w-0 flex-1">
                          <dt className="text-[13px] text-muted-foreground">
                            <Txt>{item.term}</Txt>
                          </dt>
                          <dd className="mt-0.5 text-[16px] break-words">{item.value}</dd>
                        </div>
                        <button
                          className="-my-1 min-h-11 px-1 text-[15px] font-medium text-primary"
                          type="button"
                          onClick={() => go(item.edit)}
                        >
                          <Txt>Edit</Txt>
                        </button>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </m.div>
          </AnimatePresence>
          {error && (
            <Alert className="mt-4">
              <Txt>{error}</Txt>
            </Alert>
          )}
          <div className="sticky bottom-[calc(var(--tab-offset)+12px)] z-20 mt-6 flex gap-2.5 md:bottom-28 lg:static">
            {step > 0 && (
              <Button
                variant="secondary"
                className="glass hairline size-[52px] shrink-0 rounded-2xl px-0"
                type="button"
                onClick={() => go(step - 1)}
                aria-label={t('Back')}
              >
                <ChevronLeft className="size-5" />
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button
                size="lg"
                className="flex-1 shadow-[0_8px_20px_-8px_rgb(29_100_216/0.6)]"
                type="button"
                disabled={!ready[step]}
                onClick={() => go(step + 1)}
              >
                <Txt>Next</Txt> <ChevronRight />
              </Button>
            ) : (
              <Button
                size="lg"
                className="flex-1 shadow-[0_8px_20px_-8px_rgb(29_100_216/0.6)]"
                type="button"
                disabled={submitReport.isPending}
                onClick={submit}
              >
                {submitReport.isPending && <LoaderCircle className="animate-spin" />}
                <Txt>{submitReport.isPending ? 'Submitting…' : 'Submit report'}</Txt>
              </Button>
            )}
          </div>
        </div>
        <Summary
          step={step}
          preview={preview}
          location={located ? `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}` : ''}
          category={category}
          description={description.trim()}
          onEdit={go}
        />
      </div>
    </div>
  )
}

/** Desktop only: what the resident has filled in so far, with a jump back to any finished step. */
function Summary({
  step,
  preview,
  location,
  category,
  description,
  onEdit,
}: {
  step: number
  preview: string
  location: string
  category: Category | ''
  description: string
  onEdit: (step: number) => void
}) {
  const t = useText()
  const rows = [
    { label: 'Photo', done: Boolean(preview), value: preview ? t('Added') : t('Not added yet'), step: 0 },
    { label: 'Location', done: Boolean(location), value: location || t('Not set yet'), step: 1 },
    {
      label: 'Incident category',
      done: Boolean(category),
      value: category ? t(label(category)) : t('Not chosen yet'),
      step: 2,
    },
    {
      label: 'Description (optional)',
      done: Boolean(description),
      value: description || t('No description added'),
      step: 2,
    },
  ]
  return (
    <aside className="sticky top-10 hidden space-y-4 xl:block">
      <div className="hairline overflow-hidden rounded-2xl bg-card">
        {preview ? (
          <img className="aspect-[2/1] w-full object-cover" src={preview} alt={t('Preview of incident photo')} />
        ) : (
          <div className="grid aspect-[2/1] place-items-center bg-muted text-muted-foreground">
            <Camera className="size-8" aria-hidden="true" />
          </div>
        )}
        <div className="flex items-center gap-2 border-b px-4 py-3">
          {category && <CategoryTile category={category} size="sm" />}
          <strong className="text-[16px] font-semibold">
            <Txt>Your report</Txt>
          </strong>
        </div>
        <ul>
          {rows.map(row => (
            <li key={row.label} className="flex items-start gap-3 px-4 py-2.5 [&+&]:border-t">
              <span
                className={cn(
                  'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2',
                  row.done ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30',
                )}
              >
                {row.done && <Check className="size-3" strokeWidth={3.5} aria-hidden="true" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] text-muted-foreground">
                  <Txt>{row.label}</Txt>
                </span>
                <span className="block truncate text-[15px]">{row.value}</span>
              </span>
              {row.step < step && (
                <button
                  type="button"
                  onClick={() => onEdit(row.step)}
                  className="text-[14px] font-medium text-primary hover:underline"
                >
                  <Txt>Edit</Txt>
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center gap-3 rounded-2xl bg-tint p-4">
        <Kap pose="idea" className="h-20 w-auto shrink-0" />
        <p className="text-[14px] text-foreground/80">
          <Txt>Stand where you can see the whole problem, and keep faces and plate numbers out of the photo.</Txt>
        </p>
      </div>
    </aside>
  )
}

/** Marks a field the AI filled in from the photo; it disappears once the resident edits that field. */
function AiTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-tint px-2 py-0.5 text-[12px] font-semibold text-primary">
      <Sparkles className="size-3" aria-hidden="true" />
      <Txt>Filled by AI · you can edit</Txt>
    </span>
  )
}

function PhotoStep({
  photo,
  preview,
  prediction,
  onSelect,
  onDrop,
}: {
  photo: File | null
  preview: string
  prediction: Prediction | null
  onSelect: (event: ChangeEvent<HTMLInputElement>) => void
  onDrop: (file: File) => void
}) {
  const t = useText()
  const [dragging, setDragging] = useState(false)
  const tile =
    'hairline relative flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl p-4 text-[16px] font-semibold transition-[transform,box-shadow,background-color] active:scale-[0.98] has-focus-visible:ring-2 has-focus-visible:ring-ring lg:min-h-44'
  return (
    <>
      <p className="text-[15px] text-muted-foreground">
        <Txt>Take a clear photo. The AI fills in the details for you, and you can change anything.</Txt>
      </p>
      {preview && (
        <m.img
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="hairline aspect-[2/1] w-full rounded-2xl object-cover lg:aspect-[3/1] xl:hidden"
          src={preview}
          alt={t('Preview of incident photo')}
        />
      )}
      {photo && (
        <p className="flex items-center gap-2 px-1 text-[14px] text-muted-foreground" role="status">
          <CheckCircle2 className="size-4 shrink-0 text-[var(--status-resolved)]" />
          <span className="truncate">
            <Txt>Selected photo:</Txt> {photo.name}
          </span>
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className={cn(tile, 'bg-primary text-primary-foreground', photo && 'min-h-14 flex-row lg:min-h-16')}>
          <Camera className="size-7" aria-hidden="true" />
          <Txt>{photo ? 'Retake photo' : 'Take photo'}</Txt>
          <input
            className="sr-only"
            type="file"
            aria-label={t('Take photo')}
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={onSelect}
          />
        </label>
        {/* Desktop residents can drop a photo file here as well as browse for one. */}
        <label
          className={cn(
            tile,
            'bg-card text-primary',
            photo && 'min-h-14 flex-row lg:min-h-16',
            dragging && 'bg-tint shadow-[0_0_0_2px_var(--primary)]',
          )}
          onDragOver={event => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={event => {
            event.preventDefault()
            setDragging(false)
            const file = event.dataTransfer.files[0]
            if (file) onDrop(file)
          }}
        >
          <ImagePlus className="size-7" aria-hidden="true" />
          <Txt>{photo ? 'Choose another' : 'Choose photo'}</Txt>
          <span className={cn('hidden text-[13px] font-normal text-muted-foreground', !photo && 'lg:block')}>
            <Txt>or drag a photo here</Txt>
          </span>
          <input
            className="sr-only"
            type="file"
            aria-label={t('Incident photo · Choose photo')}
            accept="image/jpeg,image/png,image/webp"
            required={!photo}
            onChange={onSelect}
          />
        </label>
      </div>
      <p className="px-1 text-[13px] text-muted-foreground">
        <Txt>JPG, PNG, or WebP, up to 5 MB. Avoid faces and license plates.</Txt>
      </p>
      {photo && <AiCard prediction={prediction} />}
    </>
  )
}

/** The classifier is frozen for now; this card must never read as a verified result. */
function AiCard({ prediction }: { prediction: Prediction | null }) {
  const [title, body] = !prediction
    ? ['Checking the photo…', 'You can continue while this runs.']
    : prediction.model_category
      ? ['', 'We filled in the category for you. You can change it on the Details step.']
      : prediction.prediction_available
        ? ['AI is uncertain', 'Choose the category yourself. Barangay personnel will verify it.']
        : ['AI classification unavailable', 'Choose the category yourself. Barangay personnel will verify it.']
  return (
    <div aria-live="polite" className={cn('hairline flex gap-3 rounded-2xl p-4', prediction ? 'bg-card' : 'shimmer')}>
      <span className="grid size-9 shrink-0 place-items-center rounded-[9px] bg-tint text-primary">
        <Sparkles className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 text-[15px]">
        <strong className="block font-semibold">
          {prediction?.model_category ? (
            <>
              <Txt>AI suggests</Txt> <Txt>{label(prediction.model_category)}</Txt>
            </>
          ) : (
            <Txt>{title}</Txt>
          )}
        </strong>
        <span className="text-muted-foreground">
          <Txt>{body}</Txt>
        </span>
      </span>
    </div>
  )
}

function SuccessView({ report, onAnother }: { report: Report; onAnother: () => void }) {
  const t = useText()
  return (
    <div className="flex flex-col items-center pt-4 text-center lg:mx-auto lg:max-w-md lg:pt-6">
      {kapAvailable('cheer') ? (
        <m.div
          initial={{ scale: 0.6, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        >
          <Kap pose="cheer" className="h-32 w-auto lg:h-36" />
        </m.div>
      ) : (
        <svg className="size-24" viewBox="0 0 96 96" aria-hidden="true">
          <m.circle
            cx="48"
            cy="48"
            r="44"
            fill="var(--status-resolved)"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 16 }}
            style={{ originX: '50%', originY: '50%' }}
          />
          <m.path
            d="M30 49 l12 12 l24 -26"
            fill="none"
            stroke="#fff"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.2, duration: 0.35, ease: EASE }}
          />
        </svg>
      )}
      <h1 className="mt-3 text-[26px] font-bold">
        <Txt>Report sent</Txt>
      </h1>
      <p role="status" className="mt-1 max-w-sm text-[16px] text-muted-foreground">
        <Txt>Report submitted. Barangay personnel will review it.</Txt>
      </p>
      <div className="hairline mt-4 w-full rounded-2xl bg-card p-4 text-left">
        <span className="text-[13px] text-muted-foreground">
          <Txt>Reference no.</Txt>
        </span>
        <strong className="mt-0.5 block font-mono text-[24px] font-semibold tracking-wider">
          {report.id.slice(0, 8).toUpperCase()}
        </strong>
        <ol className="mt-3 space-y-1.5 border-t pt-3" aria-label={t('Status path')}>
          {PATH.map((status, index) => (
            <li key={status} className="flex items-center gap-3 text-[15px]">
              <span
                className={cn(
                  'grid size-5 shrink-0 place-items-center rounded-full border-2',
                  index === 0 ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30',
                )}
              >
                {index === 0 && <Check className="size-3" strokeWidth={3.5} aria-hidden="true" />}
              </span>
              <span className={index === 0 ? 'font-semibold' : 'text-muted-foreground'}>
                <Txt>{status}</Txt>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[14px] text-muted-foreground">
          <Txt>Track it anytime in My reports.</Txt>
        </p>
      </div>
      <div className="mt-4 grid w-full gap-2">
        <Button asChild size="lg">
          <Link to={`/reports/${report.id}`}>
            <Txt>View my report</Txt>
          </Link>
        </Button>
        <Button variant="tinted" size="lg" type="button" onClick={onAnother}>
          <Txt>Make another report</Txt>
        </Button>
      </div>
    </div>
  )
}
