import { Logger, severityToLevel } from "./logger";

/**
 * @returns Logger printing all messages into a console.
 */
export function createConsoleLogger(
  severity: "trace" | "debug" | "info",
): Logger {
  return new ConsoleLogger(severityToLevel(severity), null);
}

const traceThreshold = severityToLevel("trace");

const debugThreshold = severityToLevel("debug");

const infoThreshold = severityToLevel("info");

class ConsoleLogger implements Logger {

  private readonly level: number;

  private readonly tag: string | null;

  constructor(level: number, tag: string | null) {
    this.level = level;
    this.tag = tag;
  }

  private format(message: string): string {
    return this.tag === null ? message : `[${this.tag}] ${message}`;
  }

  trace(message: string, ...data: unknown[]) {
    if (traceThreshold < this.level) {
      return;
    }
    console.debug(this.format(message), ...data);
  }

  debug(message: string, ...data: unknown[]) {
    if (debugThreshold < this.level) {
      return;
    }
    console.debug(this.format(message), ...data);
  }

  info(message: string, ...data: unknown[]) {
    if (infoThreshold < this.level) {
      return;
    }
    console.info(this.format(message), ...data);
  }

  warn(message: string, ...data: unknown[]) {
    console.warn(this.format(message), ...data);
  }

  error(message: string, ...data: unknown[]) {
    console.error(this.format(message), ...data);
  }

  critical(message: string, ...data: unknown[]) {
    console.error("[CRITICAL]" + this.format(message), ...data);
  }

  withTag(tag: string): Logger {
    return new ConsoleLogger(this.level, tag);
  }

}
