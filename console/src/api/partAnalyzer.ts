import { useMutation } from '@tanstack/react-query';

// Types mirror ../part-analyzer-api/app/models.py. Keep the two in sync by hand.

export type Material = 'PA12' | 'RESIN';
export type Severity = 'error' | 'warning';
export type WarningCode = 'EXCEEDS_BUILD_VOLUME' | 'NOT_WATERTIGHT';

/** [x, y, z] in millimetres. */
export type Vector3 = [number, number, number];

export interface BoundingBox {
  min: Vector3;
  max: Vector3;
  size: Vector3;
}

export interface DfmWarning {
  code: WarningCode;
  severity: Severity; // "error" = no quote; "warning" = may cause problems
  message: string;
}

/** A FAKE price. Invented rates, for learning only. */
export interface Quote {
  is_fake: true;
  disclaimer: string;
  material: Material;
  material_name: string;
  quantity: number;
  volume_cm3: number;
  usd_per_cm3: number;
  unit_price_usd: number;
  setup_fee_usd: number;
  total_usd: number;
  lead_time_days: number;
}

export interface Analysis {
  volume_mm3: number;
  surface_area_mm2: number;
  bounding_box: BoundingBox;
  watertight: boolean;
  triangle_count: number;
  warnings: DfmWarning[];
}

/** Response of POST /analyze. `quote` is null when any warning has severity "error". */
export interface AnalyzeResponse extends Analysis {
  quote: Quote | null;
}

export interface AnalyzeRequest {
  file: File;
  material: Material;
  quantity: number;
}

export const MATERIALS: { value: Material; label: string }[] = [
  { value: 'PA12', label: 'Nylon PA12 (SLS)' },
  { value: 'RESIN', label: 'Standard resin (SLA)' },
];
export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 1000;

/** An error from the API, with one or more human-readable messages. */
export class PartAnalyzerError extends Error {
  constructor(
    readonly messages: string[],
    readonly status?: number,
  ) {
    super(messages.join(' '));
    this.name = 'PartAnalyzerError';
  }
}

// FastAPI error bodies: 400/413 → { detail: "text" }; 422 → { detail: [{ loc, msg }, ...] }.
type ValidationIssue = { loc: (string | number)[]; msg: string };
type ErrorBody = { detail?: string | ValidationIssue[]; message?: string };

/** "quantity: Input should be greater than or equal to 1" (loc is e.g. ["body", "quantity"]). */
function formatIssue(issue: ValidationIssue): string {
  const field = issue.loc.filter((part) => part !== 'body').join('.');
  return field ? `${field}: ${issue.msg}` : issue.msg;
}

function errorMessages(status: number, body: ErrorBody | null): string[] {
  if (Array.isArray(body?.detail)) return body.detail.map(formatIssue);
  if (typeof body?.detail === 'string') return [body.detail];
  if (body?.message) return [body.message]; // API Gateway's own errors, e.g. a file that is too large
  return [`The Part Analyzer API returned HTTP ${status}.`];
}

function analyzeUrl(): string {
  const base = import.meta.env.VITE_PART_ANALYZER_URL;
  if (!base) {
    throw new PartAnalyzerError(['VITE_PART_ANALYZER_URL is not set. Copy .env.example to .env.local and restart npm run dev.']);
  }
  return `${base.replace(/\/+$/, '')}/analyze`; // SAM's ApiUrl output ends with "/"
}

async function analyzePart({ file, material, quantity }: AnalyzeRequest): Promise<AnalyzeResponse> {
  const url = analyzeUrl();
  const form = new FormData();
  form.append('file', file);
  form.append('material', material);
  form.append('quantity', String(quantity));

  let res: Response;
  try {
    // No Content-Type header: the browser sets multipart/form-data with the right boundary.
    res = await fetch(url, { method: 'POST', body: form });
  } catch {
    // fetch only throws when there is no HTTP response at all: server down, wrong URL, or CORS refused.
    throw new PartAnalyzerError([
      `Could not reach the Part Analyzer API at ${url}. Check that it is running and allows this origin (CORS).`,
    ]);
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ErrorBody | null;
    throw new PartAnalyzerError(errorMessages(res.status, body), res.status);
  }
  return res.json() as Promise<AnalyzeResponse>;
}

/** Upload an STL and get measurements, DFM warnings and a FAKE quote. */
export function useAnalyzePart() {
  return useMutation({ mutationFn: analyzePart });
}
