
export interface Logger {

  trace: (message: string, ...data: unknown[]) => void;

  debug: (message: string, ...data: unknown[]) => void;

  info: (message: string, ...data: unknown[]) => void;

  warn: (message: string, ...data: unknown[]) => void;

  error: (message: string, ...data: unknown[]) => void;

  /**
   * Use to report internal errors.
   * Those are not related to user input and rather signal a bug in the application.
   */
  critical: (message: string, ...data: unknown[]) => void;

  withTag: (tag: string) => Logger;

}

export type Severity =
  "trace" | "debug" | "info" | "warn" | "error" | "critical";

/**
 * @see https://opentelemetry.io/docs/specs/otel/logs/data-model/
 */
export const severityToLevel = (severity: Severity): number => {
  switch (severity) {
    case "trace":
      return 0;
    case "debug":
      return 5;
    case "info":
      return 9;
    case "warn":
      return 13;
    case "error":
      return 17;
    case "critical":
      return 21;
  }
};
