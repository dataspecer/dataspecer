import type { ViolationCode } from './violation-codes.ts';
import type { Violation } from './types.ts';
import { ViolationSeverity } from './types.ts';

export function semanticViolation(code: ViolationCode, message: string, path: string): Violation {
  return {
    code,
    message,
    path,
    severity: ViolationSeverity.Error,
  };
}
