export interface ValidationIssue {
  code: string;
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
