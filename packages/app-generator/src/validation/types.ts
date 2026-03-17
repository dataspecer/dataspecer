import type { ViolationCode } from './violation-codes.ts';

export enum ViolationSeverity {
  Error = 'error',
  Warning = 'warning',
}

export interface Violation {
  code: ViolationCode;
  message: string;
  path?: string;
  severity: ViolationSeverity;
}

export interface ValidationResult {
  valid: boolean;
  violations: Violation[];
}
