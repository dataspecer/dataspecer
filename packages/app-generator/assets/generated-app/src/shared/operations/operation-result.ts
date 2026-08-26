export enum ValidationIssueCode {
  // generic error
  Error = 'error',
  Required = 'required',
  InvalidIri = 'invalid_iri',
  NotFound = 'not_found',
  MissingPayload = 'missing_payload',
  MissingOriginalPayload = 'missing_original_payload',
  MinCount = 'min_count',
  MaxCount = 'max_count',
  Duplicate = 'duplicate',
  InvalidValue = 'invalid_value',
  PatternMismatch = 'pattern_mismatch',
  MissingCompositionTarget = 'missing_composition_target',
  InvalidComposition = 'invalid_composition',
  SpecializationRequired = 'specialization_required',
  SpecializationUnresolved = 'specialization_unresolved',
  SpecializationEvidenceRequired = 'specialization_evidence_required',
}

export interface ValidationIssue {
  code: ValidationIssueCode;
  message: string;
  path?: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

export type OperationResult<TData = unknown> =
  | {
      ok: true;
      data: TData;
    }
  | {
      ok: false;
      issues: ValidationIssue[];
    };

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function issueMessageAt(
  issues: readonly ValidationIssue[],
  path: string,
): string | undefined {
  return issues.find((issue) => issue.path === path)?.message;
}
