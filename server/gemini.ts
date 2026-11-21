import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  CivicCategory,
  DuplicateCandidate,
  MunicipalDepartment,
  SeverityLevel,
} from '../src/types.ts';
import {
  CIVIC_CATEGORIES,
  MUNICIPAL_DEPARTMENTS,
  SEVERITY_LEVELS,
} from '../src/types.ts';

export interface ExistingTicketContext {
  ticket_id: string;
  complaint_summary: string;
  original_description: string;
  category: string;
  location: string;
  status: string;
  created_at: string;
}

export interface AnalyzeComplaintInput {
  description: string;
  location: string;
  languageHint?: string;
  imageBase64?: string | null;
  imageMimeType?: string | null;
  existingTickets: ExistingTicketContext[];
}

export interface GeminiAnalysisResult {
  complaint_summary: string;
  detected_language: string;
  category: CivicCategory;
  severity: SeverityLevel;
  severity_reason: string;
  risk_factors: string[];
  visual_observations: string | null;
  department: MunicipalDepartment;
  recommended_action: string;
  duplicate_candidates: DuplicateCandidate[];
  confidence: number;
  uncertainty_note: string | null;
}

const DEFAULT_DEPARTMENT_BY_CATEGORY: Record<CivicCategory, MunicipalDepartment> = {
  Roads: 'Roads Department',
  Waste: 'Waste Management Department',
  Water: 'Water Supply Department',
  Electricity: 'Electricity Department',
  Trees: 'Parks and Tree Management Department',
  Drainage: 'Drainage Department',
  Other: 'General Civic Services',
};

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured on the server. Please configure your Gemini API key in Settings > Secrets.'
    );
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function normalizeCategory(value: unknown): CivicCategory {
  if (typeof value === 'string') {
    const match = CIVIC_CATEGORIES.find((c) => c.toLowerCase() === value.trim().toLowerCase());
    if (match) return match;
  }
  return 'Other';
}

function normalizeSeverity(value: unknown): SeverityLevel {
  if (typeof value === 'string') {
    const match = SEVERITY_LEVELS.find((s) => s.toLowerCase() === value.trim().toLowerCase());
    if (match) return match;
  }
  return 'Medium';
}

function normalizeDepartment(value: unknown, fallbackCategory: CivicCategory): MunicipalDepartment {
  if (typeof value === 'string') {
    const match = MUNICIPAL_DEPARTMENTS.find(
      (d) => d.toLowerCase() === value.trim().toLowerCase()
    );
    if (match) return match;
  }
  return DEFAULT_DEPARTMENT_BY_CATEGORY[fallbackCategory];
}

function sanitizeJsonText(rawText: string): string {
  const trimmed = rawText.trim();
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
  }
  return trimmed;
}

function isTransientError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('503') ||
    message.includes('500') ||
    message.includes('UNAVAILABLE') ||
    message.includes('ECONNRESET') ||
    message.includes('fetch failed') ||
    message.includes('TIMED_OUT')
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('GEMINI_TIMED_OUT')), ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 1): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;
      if (!isTransientError(error) || attempt === maxRetries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 600 * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

export async function analyzeComplaintWithGemini(
  input: AnalyzeComplaintInput
): Promise<GeminiAnalysisResult> {
  const ai = getGeminiClient();

  const existingSummary =
    input.existingTickets.length > 0
      ? input.existingTickets
          .map(
            (t) =>
              `- [${t.ticket_id}] Category: ${t.category} | Location: ${t.location || 'Unspecified'} | Status: ${t.status} | Summary: ${t.complaint_summary}`
          )
          .join('\n')
      : 'None currently stored.';

  const systemInstruction = `You are the CivicLens Intelligence Engine, a senior municipal complaint triage and civic risk analyst.
Your mission is to turn unstructured citizen complaints (in English, regional languages, Romanized scripts, text-only, image-only, or text-plus-image) into accurate, structured, explainable municipal tickets.

STRICT OPERATIONAL RULES:
1. MEANING OVER KEYWORDS: Understand semantic meaning across English and regional languages (Hindi, Tamil, Telugu, Kannada, Marathi, Bengali, Spanish, French, Arabic, etc., including Romanized/transliterated text). Output complaint_summary, severity_reason, risk_factors, visual_observations, and recommended_action in clear, professional English for municipal officers.
2. SEVERITY CALIBRATION (CRITICAL DISCIPLINE):
   - Critical: Immediate life-safety threat, active injury/accident already occurred or imminent, live exposed electrical wires, major road collapse/obstruction forcing oncoming traffic swerves, severe flooding/gas/structural collapse. Do NOT mark routine issues Critical.
   - High: Significant public safety risk, dark pedestrian underpass/streetlights in dangerous zone, pressurized water main leak eroding walkways, blocked main drainage during rain, major garbage hazard near schools/hospitals.
   - Medium: Clear civic disruption needing scheduled action within days—moderate potholes, missed waste collection (2-3 days), minor drainage slowdown, localized lighting malfunction.
   - Low: Cosmetic, preventive, or minor upkeep issues—faded bench paint, minor overgrown grass, non-urgent signage touch-up.
3. VISUAL INTEGRITY (NO FABRICATION):
   - If an image is attached, report ONLY what is directly visible in visual_observations. Combine visual evidence with text to improve classification and severity accuracy.
   - If an image is blurry, dark, ambiguous, or unrelated, explicitly state the uncertainty in visual_observations and uncertainty_note. NEVER invent evidence that cannot be seen.
   - If no image is attached, set visual_observations to an empty string "".
4. AUTOMATIC DEPARTMENT ROUTING:
   Choose the exact matching department from the allowed list:
   - Roads -> Roads Department
   - Waste -> Waste Management Department
   - Water -> Water Supply Department
   - Electricity -> Electricity Department
   - Trees -> Parks and Tree Management Department
   - Drainage -> Drainage Department
   - Other -> General Civic Services
5. RECOMMENDED CIVIC ACTION:
   Generate ONE practical, actionable next step for municipal officers (e.g., "Dispatch an electrical technician to inspect the faulty circuit and restore lighting."). Frame strictly as a recommendation; never claim work has already been completed.
6. DUPLICATE RADAR:
   Compare the incoming complaint against the list of Existing Tickets provided below.
   Flag an existing ticket ONLY if it plausibly describes the same or closely related civic incident (considering issue type, category, description similarity, and location overlap when available).
   Only use exact ticket_id strings from the Existing Tickets list. Return an empty array [] if no plausible duplicates exist. Never invent ticket IDs.
7. CONFIDENCE & UNCERTAINTY:
   Provide a calibrated confidence score between 0.0 and 1.0. If location is missing, description is very vague, or image is unclear, lower confidence appropriately and explain why in uncertainty_note; otherwise set uncertainty_note to "".`;

  const textPrompt = `INCOMING CITIZEN COMPLAINT:
- Complaint Description: ${input.description.trim() || '(No text provided — analyze uploaded photograph only)'}
- Location / Landmark: ${input.location.trim() || '(Not provided by citizen)'}
- Optional Citizen Language Hint: ${input.languageHint?.trim() || 'Auto-detect'}
- Photograph Attached: ${input.imageBase64 ? 'Yes (see attached image)' : 'No'}

EXISTING MUNICIPAL TICKETS FOR DUPLICATE RADAR COMPARISON:
${existingSummary}

Analyze this complaint carefully and return the structured JSON response matching the schema.`;

  const parts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [];

  if (input.imageBase64 && input.imageMimeType) {
    parts.push({
      inlineData: {
        mimeType: input.imageMimeType,
        data: input.imageBase64,
      },
    });
  }

  parts.push({ text: textPrompt });

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      complaint_summary: {
        type: Type.STRING,
        description: 'Concise, clear 1-2 sentence English summary of the civic issue.',
      },
      detected_language: {
        type: Type.STRING,
        description:
          'Detected language of the citizen text (e.g. English, Hindi, Hindi (Romanized), Tamil, Spanish, or "Image Only (No Text)").',
      },
      category: {
        type: Type.STRING,
        description: 'Exactly one of: Roads, Waste, Water, Electricity, Trees, Drainage, Other.',
      },
      severity: {
        type: Type.STRING,
        description: 'Exactly one of: Critical, High, Medium, Low.',
      },
      severity_reason: {
        type: Type.STRING,
        description:
          'Clear one-line explanation justifying why this exact severity level was assigned.',
      },
      risk_factors: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: '2 to 4 concise, factual public-safety or service-impact risk factors.',
      },
      visual_observations: {
        type: Type.STRING,
        description:
          'Factual summary of visible evidence in the attached image, or empty string if no image was provided.',
      },
      department: {
        type: Type.STRING,
        description:
          'Exactly one of: Roads Department, Waste Management Department, Water Supply Department, Electricity Department, Parks and Tree Management Department, Drainage Department, General Civic Services.',
      },
      recommended_action: {
        type: Type.STRING,
        description: 'One practical recommended next municipal action. Recommendation only.',
      },
      duplicate_candidates: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            ticket_id: {
              type: Type.STRING,
              description: 'Exact existing ticket_id from the provided list.',
            },
            similarity_score: {
              type: Type.NUMBER,
              description: 'Similarity score between 0.5 and 1.0.',
            },
            reason: {
              type: Type.STRING,
              description: 'Clear explanation of why these two tickets may be related.',
            },
          },
          required: ['ticket_id', 'similarity_score', 'reason'],
        },
        description: 'Potentially related existing tickets, or empty array if none.',
      },
      confidence: {
        type: Type.NUMBER,
        description: 'Calibrated analysis confidence score from 0.0 to 1.0.',
      },
      uncertainty_note: {
        type: Type.STRING,
        description:
          'Explicit explanation of any ambiguity, missing location, or unclear image; empty string if none.',
      },
    },
    required: [
      'complaint_summary',
      'detected_language',
      'category',
      'severity',
      'severity_reason',
      'risk_factors',
      'visual_observations',
      'department',
      'recommended_action',
      'duplicate_candidates',
      'confidence',
      'uncertainty_note',
    ],
  };

  let response;
  try {
    response = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      }),
      12000
    );
  } catch (primaryErr) {
    if (!isTransientError(primaryErr)) {
      throw primaryErr;
    }
    response = await callWithRetry(() =>
      withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: { parts },
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema,
          },
        }),
        15000
      )
    );
  }

  const rawText = response.text;
  if (!rawText || !rawText.trim()) {
    throw new Error('Gemini returned an empty response while analyzing the complaint.');
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(sanitizeJsonText(rawText)) as Record<string, unknown>;
  } catch {
    throw new Error('Failed to parse structured JSON output from Gemini analysis.');
  }

  const category = normalizeCategory(parsed.category);
  const severity = normalizeSeverity(parsed.severity);
  const department = normalizeDepartment(parsed.department, category);

  const validExistingIds = new Set(input.existingTickets.map((t) => t.ticket_id));
  const rawDuplicates = Array.isArray(parsed.duplicate_candidates)
    ? parsed.duplicate_candidates
    : [];

  const duplicate_candidates: DuplicateCandidate[] = rawDuplicates
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).ticket_id === 'string' &&
        validExistingIds.has(String((item as Record<string, unknown>).ticket_id).trim())
    )
    .map((item) => {
      const score = Number(item.similarity_score);
      return {
        ticket_id: String(item.ticket_id).trim(),
        similarity_score: Number.isFinite(score) ? Math.min(1, Math.max(0, score)) : 0.75,
        reason:
          typeof item.reason === 'string' && item.reason.trim()
            ? item.reason.trim()
            : 'Similar civic issue and context detected.',
      };
    })
    .slice(0, 3);

  const rawRiskFactors = Array.isArray(parsed.risk_factors) ? parsed.risk_factors : [];
  const risk_factors = rawRiskFactors
    .filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
    .map((f) => f.trim())
    .slice(0, 5);

  const rawConfidence = Number(parsed.confidence);
  const confidence = Number.isFinite(rawConfidence)
    ? Math.round(Math.min(1, Math.max(0.1, rawConfidence)) * 100) / 100
    : 0.8;

  const summary =
    typeof parsed.complaint_summary === 'string' && parsed.complaint_summary.trim()
      ? parsed.complaint_summary.trim()
      : 'Citizen-reported civic issue requiring municipal review.';

  const detectedLanguage =
    typeof parsed.detected_language === 'string' && parsed.detected_language.trim()
      ? parsed.detected_language.trim()
      : input.description.trim()
        ? 'English'
        : 'Image Only (No Text)';

  const severityReason =
    typeof parsed.severity_reason === 'string' && parsed.severity_reason.trim()
      ? parsed.severity_reason.trim()
      : `Assigned ${severity} priority based on reported civic impact and safety considerations.`;

  const recommendedAction =
    typeof parsed.recommended_action === 'string' && parsed.recommended_action.trim()
      ? parsed.recommended_action.trim()
      : `Schedule an on-site inspection by the ${department}.`;

  const visualObservations =
    input.imageBase64 &&
    typeof parsed.visual_observations === 'string' &&
    parsed.visual_observations.trim()
      ? parsed.visual_observations.trim()
      : null;

  const uncertaintyNote =
    typeof parsed.uncertainty_note === 'string' && parsed.uncertainty_note.trim()
      ? parsed.uncertainty_note.trim()
      : null;

  return {
    complaint_summary: summary,
    detected_language: detectedLanguage,
    category,
    severity,
    severity_reason: severityReason,
    risk_factors:
      risk_factors.length > 0 ? risk_factors : ['Requires field verification for full impact assessment'],
    visual_observations: visualObservations,
    department,
    recommended_action: recommendedAction,
    duplicate_candidates,
    confidence,
    uncertainty_note: uncertaintyNote,
  };
}
