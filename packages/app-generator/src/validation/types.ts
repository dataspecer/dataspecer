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
  /** True when no violation has error severity. Warnings leave the graph generatable. */
  valid: boolean;
  violations: Violation[];
}

export function semanticViolation(code: ViolationCode, message: string, path: string): Violation {
  return {
    code,
    message,
    path,
    severity: ViolationSeverity.Error,
  };
}

export function semanticWarning(code: ViolationCode, message: string, path: string): Violation {
  return {
    code,
    message,
    path,
    severity: ViolationSeverity.Warning,
  };
}

export function hasErrors(violations: readonly Violation[]): boolean {
  return violations.some((violation) => violation.severity === ViolationSeverity.Error);
}
