import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Camera, Loader2, MapPin, Search, Trash2, Upload } from 'lucide-react';
import { submitComplaint } from '../lib/api';

const SAMPLE_DEMO_PHOTOS = [
  {
    label: 'Road Pothole',
    url: '/src/assets/images/sample_road_pothole_1795238442073.jpg',
    fileName: 'road-pothole-demo.jpg',
  },
  {
    label: 'Water Pipe Leak',
    url: '/src/assets/images/sample_water_leak_1795238442339.jpg',
    fileName: 'water-leak-demo.jpg',
  },
  {
    label: 'Fallen Tree',
    url: '/src/assets/images/sample_fallen_tree_1795238441262.jpg',
    fileName: 'fallen-tree-demo.jpg',
  },
];

const LANGUAGE_OPTIONS = [
  'Auto-detect (Recommended)',
  'English',
  'Hindi',
  'Tamil',
  'Telugu',
  'Marathi',
  'Bengali',
  'Kannada',
  'Spanish',
  'Other',
];

const QUICK_TEST_SCENARIOS = [
  {
    label: 'English — Blocked Storm Drain',
    language: 'Auto-detect (Recommended)',
    location: 'Station Road near Metro Pillar 14, Ward 7',
    description:
      'The main roadside storm drain at Station Road is completely choked with plastic waste and silt. Dirty water has started backing up across the footpath and cycling lane after this morning’s rain.',
  },
  {
    label: 'Hindi — Exposed Live Wire',
    language: 'Auto-detect (Recommended)',
    location: 'Shastri Nagar Main Market, Electric Pole #42',
    description:
      'Shastri Nagar main market ke pole number 42 se bijli ki nangi taar neeche latak rahi hai aur halki chingari nikal rahi hai. Paas mein bacchon ka school hai, turant action lein.',
  },
  {
    label: 'Duplicate Check — Market St Pothole',
    language: 'Auto-detect (Recommended)',
    location: 'Market Street & 5th Crosswalk, Ward 4',
    description:
      'There is a huge deep pothole filled with rainwater right next to the pedestrian crossing on Market Street near 5th. Scooters are slipping on the broken asphalt edges.',
  },
];

const PROCESSING_STEPS = [
  'Validating report and uploaded visual evidence',
  'Running multilingual & multimodal CivicLens AI classification',
  'Calibrating severity level, risk factors, and department route',
  'Scanning existing tickets with Duplicate Radar & saving ticket',
];

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export function ReportPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [languageHint, setLanguageHint] = useState('Auto-detect (Recommended)');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [imageSizeLabel, setImageSizeLabel] = useState<string | null>(null);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingSamplePhoto, setLoadingSamplePhoto] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [lookupId, setLookupId] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);

  async function attachSamplePhoto(preset: (typeof SAMPLE_DEMO_PHOTOS)[number]) {
    setValidationError(null);
    setServerError(null);
    setLoadingSamplePhoto(true);
    try {
      const response = await fetch(preset.url);
      if (!response.ok) throw new Error('Unable to load sample photograph.');
      const blob = await response.blob();
      const file = new File([blob], preset.fileName, { type: 'image/jpeg' });
      handleFileSelected(file);
    } catch {
      setValidationError('Could not attach sample photograph. Please upload a photo from your device.');
    } finally {
      setLoadingSamplePhoto(false);
    }
  }

  function handleTicketLookup(e: React.FormEvent) {
    e.preventDefault();
    const normalized = lookupId.trim().toUpperCase();
    if (!/^CL-\d{4}-\d{4,}$/.test(normalized)) {
      setLookupError('Enter a valid ticket ID such as CL-2026-0002.');
      return;
    }
    setLookupError(null);
    navigate(`/analysis/${normalized}`);
  }

  function handleFileSelected(file: File | null) {
    setValidationError(null);
    setServerError(null);

    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setValidationError('Please upload a JPEG, PNG, or WebP photograph.');
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setValidationError('Photograph must be 5 MB or smaller.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (!result) {
        setValidationError('Could not read the selected photograph.');
        return;
      }
      setImagePreview(result);
      setImageMimeType(file.type);
      setImageName(file.name);
      const kb = Math.round(file.size / 1024);
      setImageSizeLabel(kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`);
    };
    reader.onerror = () => {
      setValidationError('Failed to read the selected image file.');
    };
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImagePreview(null);
    setImageMimeType(null);
    setImageName(null);
    setImageSizeLabel(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function applySample(sample: (typeof QUICK_TEST_SCENARIOS)[number]) {
    setDescription(sample.description);
    setLocation(sample.location);
    setLanguageHint(sample.language);
    setValidationError(null);
    setServerError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);
    setServerError(null);

    const trimmedDesc = description.trim();
    const trimmedLocation = location.trim();

    if (!trimmedDesc && !imagePreview) {
      setValidationError(
        'Please describe the civic issue, attach a photograph, or provide both before submitting.'
      );
      return;
    }

    if (trimmedDesc.length > 4000) {
      setValidationError('Complaint description must be 4,000 characters or fewer.');
      return;
    }

    setSubmitting(true);
    setActiveStep(0);

    const stepInterval = window.setInterval(() => {
      setActiveStep((prev) => (prev < PROCESSING_STEPS.length - 1 ? prev + 1 : prev));
    }, 1100);

    try {
      const created = await submitComplaint({
        description: trimmedDesc,
        location: trimmedLocation,
        languageHint:
          languageHint === 'Auto-detect (Recommended)' ? undefined : languageHint,
        imageBase64: imagePreview,
        imageMimeType,
      });

      window.clearInterval(stepInterval);
      navigate(`/analysis/${created.ticket_id}`, { state: { complaint: created } });
    } catch (err) {
      window.clearInterval(stepInterval);
      setServerError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while analyzing your complaint.'
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
      <div className="max-w-3xl">
        <p className="text-sm font-medium text-[#1D4ED8]">Citizen Complaint Portal</p>
        <h1
          className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0F172A]"
          style={{ textWrap: 'balance' }}
        >
          Report a municipal issue in your own words.
        </h1>
        <p className="mt-3 text-base text-[#475569] leading-relaxed">
          Write naturally in English or any regional language, attach a photograph if available, and
          add a nearby landmark. CivicLens analyzes your submission immediately and routes a tracked
          ticket to the right department.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Submission Form */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-lg p-6 sm:p-8 space-y-6"
        >
          {/* Description Field */}
          <div>
            <div className="flex items-baseline justify-between gap-4">
              <label
                htmlFor="complaint-description"
                className="block text-sm font-semibold text-[#0F172A]"
              >
                Complaint description
              </label>
              <span className="text-xs font-mono text-[#64748B] tabular-nums">
                {description.length} / 4000
              </span>
            </div>
            <p className="mt-1 text-xs text-[#64748B]">
              Describe what happened, how long it has been an issue, and any safety risks. Optional
              if you upload a clear photograph.
            </p>
            <textarea
              id="complaint-description"
              name="description"
              rows={5}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (validationError) setValidationError(null);
              }}
              disabled={submitting}
              placeholder="Example: Deep pothole outside City Library bus stop causing cyclists to swerve into traffic..."
              className="mt-2 block w-full rounded-md border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 disabled:bg-[#F8FAFC] disabled:text-[#64748B]"
            />
          </div>

          {/* Location & Language Row */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
            <div className="sm:col-span-7">
              <label
                htmlFor="complaint-location"
                className="block text-sm font-semibold text-[#0F172A]"
              >
                Location or nearby landmark{' '}
                <span className="font-normal text-[#64748B]">(Optional)</span>
              </label>
              <div className="relative mt-2">
                <MapPin
                  className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="complaint-location"
                  type="text"
                  maxLength={300}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={submitting}
                  placeholder="Street name, crossroad, ward, or landmark"
                  className="block w-full rounded-md border border-[#CBD5E1] bg-white pl-9 pr-3.5 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 disabled:bg-[#F8FAFC]"
                />
              </div>
            </div>

            <div className="sm:col-span-5">
              <label
                htmlFor="complaint-language"
                className="block text-sm font-semibold text-[#0F172A]"
              >
                Language
              </label>
              <select
                id="complaint-language"
                value={languageHint}
                onChange={(e) => setLanguageHint(e.target.value)}
                disabled={submitting}
                className="mt-2 block w-full rounded-md border border-[#CBD5E1] bg-white px-3 py-2.5 text-sm text-[#0F172A] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 disabled:bg-[#F8FAFC]"
              >
                {LANGUAGE_OPTIONS.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Photo Upload Area */}
          <div>
            <label className="block text-sm font-semibold text-[#0F172A]">
              Photograph evidence <span className="font-normal text-[#64748B]">(Optional)</span>
            </label>
            <p className="mt-1 text-xs text-[#64748B]">
              Attach a JPEG, PNG, or WebP photo (up to 5 MB). CivicLens inspects visible street
              conditions and combines them with your description.
            </p>

            <input
              ref={fileInputRef}
              id="complaint-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={submitting}
              onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
              className="sr-only"
            />

            {!imagePreview ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!submitting) {
                    handleFileSelected(e.dataTransfer.files?.[0] ?? null);
                  }
                }}
                className="mt-2 border border-dashed border-[#CBD5E1] rounded-md bg-[#F8FAFC] p-6 text-center hover:border-[#94A3B8] transition-colors"
              >
                <Camera className="w-6 h-6 text-[#64748B] mx-auto" aria-hidden="true" />
                <p className="mt-2 text-sm text-[#334155]">
                  Drag and drop a photo here, or browse from your device.
                </p>
                <button
                  type="button"
                  disabled={submitting || loadingSamplePhoto}
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#0F172A] bg-white border border-[#CBD5E1] hover:bg-[#F1F5F9] rounded-md transition-colors whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Choose Photograph</span>
                </button>
                <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex flex-wrap items-center justify-center gap-2 text-xs">
                  <span className="text-[#64748B]">Or test visual AI with a sample photo:</span>
                  {SAMPLE_DEMO_PHOTOS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      disabled={submitting || loadingSamplePhoto}
                      onClick={() => attachSamplePhoto(preset)}
                      className="px-2.5 py-1 font-medium text-[#1D4ED8] bg-white border border-[#CBD5E1] hover:border-[#1D4ED8] rounded transition-colors whitespace-nowrap disabled:opacity-50"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-2 border border-[#E2E8F0] rounded-md overflow-hidden bg-[#F8FAFC]">
                <div className="relative bg-[#0F172A] flex items-center justify-center max-h-80 overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Preview of uploaded civic issue photograph"
                    className="max-h-80 w-auto object-contain"
                  />
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-4 bg-white border-t border-[#E2E8F0]">
                  <div className="min-w-0 text-xs text-[#475569] truncate">
                    <span className="font-medium text-[#0F172A]">{imageName}</span>
                    {imageSizeLabel && (
                      <>
                        <span className="mx-1.5" aria-hidden="true">
                          ·
                        </span>
                        <span className="font-mono">{imageSizeLabel}</span>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={clearImage}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#B91C1C] hover:bg-[#FEF2F2] rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Validation & Server Errors */}
          {(validationError || serverError) && (
            <div
              role="alert"
              className="p-4 rounded-md bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-3 text-sm text-[#991B1B]"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#B91C1C]" aria-hidden="true" />
              <div>
                <p className="font-semibold">Unable to submit complaint</p>
                <p className="mt-0.5 text-sm">{validationError || serverError}</p>
              </div>
            </div>
          )}

          {/* Live AI Processing Indicator */}
          {submitting && (
            <div
              aria-live="polite"
              className="p-5 rounded-md bg-[#F8FAFC] border border-[#CBD5E1] space-y-3"
            >
              <div className="flex items-center gap-2.5 text-sm font-semibold text-[#0F172A]">
                <Loader2 className="w-4 h-4 animate-spin text-[#1D4ED8]" aria-hidden="true" />
                <span>CivicLens Intelligence Engine is analyzing your report…</span>
              </div>
              <ol className="space-y-1.5 text-xs text-[#475569] pl-6 list-decimal">
                {PROCESSING_STEPS.map((step, idx) => (
                  <li
                    key={step}
                    className={
                      idx === activeStep
                        ? 'text-[#1D4ED8] font-medium'
                        : idx < activeStep
                          ? 'text-[#15803D]'
                          : 'text-[#94A3B8]'
                    }
                  >
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Submit Actions */}
          <div className="pt-2 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-xs text-[#64748B]">
              Generates a unique ticket ID immediately after analysis completes.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:bg-[#93C5FD] rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Analyzing Complaint…</span>
                </>
              ) : (
                <span>Submit &amp; Analyze Complaint</span>
              )}
            </button>
          </div>
        </form>

        {/* Right Side Guidance & Interactive Test Scenarios */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-[#E2E8F0] rounded-lg p-6">
            <h2 className="font-display text-base font-semibold text-[#0F172A]">
              What happens after you submit
            </h2>
            <ol className="mt-4 space-y-3 text-sm text-[#475569] leading-relaxed">
              <li>
                <span className="font-semibold text-[#0F172A]">1. Language &amp; image understanding:</span>{' '}
                Your report is interpreted in its original language alongside any attached photo.
              </li>
              <li>
                <span className="font-semibold text-[#0F172A]">2. Priority &amp; routing:</span>{' '}
                The engine assigns Critical, High, Medium, or Low severity with a plain-English
                reason and routes it to the matching department.
              </li>
              <li>
                <span className="font-semibold text-[#0F172A]">3. Duplicate Radar scan:</span>{' '}
                Similar existing reports are flagged for officer review without deleting your ticket.
              </li>
            </ol>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-lg p-6">
            <h2 className="font-display text-base font-semibold text-[#0F172A]">
              Try a sample scenario
            </h2>
            <p className="mt-1 text-xs text-[#64748B] leading-relaxed">
              Prefill the form to test English classification, regional-language translation, or
              Duplicate Radar against live stored tickets.
            </p>
            <div className="mt-4 space-y-2.5">
              {QUICK_TEST_SCENARIOS.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  disabled={submitting}
                  onClick={() => applySample(sample)}
                  className="w-full text-left px-3.5 py-2.5 rounded-md border border-[#E2E8F0] hover:border-[#1D4ED8] hover:bg-[#F8FAFC] transition-colors disabled:opacity-50"
                >
                  <p className="text-xs font-semibold text-[#0F172A]">{sample.label}</p>
                  <p className="mt-0.5 text-xs text-[#64748B] line-clamp-2">{sample.description}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-lg p-6">
            <h2 className="font-display text-base font-semibold text-[#0F172A]">
              Track an existing ticket
            </h2>
            <p className="mt-1 text-xs text-[#64748B]">
              Already submitted a complaint? Enter your ticket ID to view its AI analysis and live
              status.
            </p>
            <form onSubmit={handleTicketLookup} className="mt-3 space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search
                    className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    aria-label="Ticket ID"
                    value={lookupId}
                    onChange={(e) => {
                      setLookupId(e.target.value);
                      if (lookupError) setLookupError(null);
                    }}
                    placeholder="CL-2026-0002"
                    className="w-full rounded-md border border-[#CBD5E1] bg-white pl-8 pr-3 py-2 font-mono text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#1D4ED8] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-md whitespace-nowrap"
                >
                  <span>Track</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
              {lookupError && <p className="text-xs text-[#B91C1C]">{lookupError}</p>}
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}
