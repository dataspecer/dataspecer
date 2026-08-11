export enum ValidationIssueCode {
  // generic error
  Error = 'error',
  Required = 'required',
  NotFound = 'not_found',
  MissingPayload = 'missing_payload',
  MissingOriginalPayload = 'missing_original_payload',
  MinCount = 'min_count',
  MaxCount = 'max_count',
  Duplicate = 'duplicate',
  MissingCompositionTarget = 'missing_composition_target',
  InvalidComposition = 'invalid_composition',
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
