/**
 * We provide custom logging interface instead of using existing one, like Winston.
 * The reason is we need to collect more information, e.g. transactions, source.
 * In addition we may send the logs to backend as well.
 *
 * This must be the only interface used for logging!
 */
interface Logger {

  /**
   * Use this to trace operation execution.
   */
  trace(operation: string, ...optionalParams: any[]): void;

  render(component: string, ...optionalParams: any[]): void;

  error(message?: any, ...optionalParams: any[]): void;

  warn(message: string, ...args: unknown[]): void;

  missingTranslation(name: string): void;

  missingEntity(identifier: string): void;

  invalidEntity(identifier: string, message: string, ...args: unknown[]): void;

}

/**
 * Usage `const logger = createLogger(import.meta.url);`
 */
export const createLogger = (moduleUrl: string): Logger => {

  const { pathname } = new URL(moduleUrl);
  const path = pathname.replace("/src/", "");
  const name = "[" + path.substring(0, path.length - 3) + "]";

  const logger: Logger = {
    trace: (operation: string, ...optionalParams: any[]) => {
      console.info(operation, ...optionalParams);
    },
    render: (component) => {
      console.info(`Rendering ${component}.`);
    },
    error: (message, optionalParams) => {
      console.error(name, message, optionalParams);
    },
    warn: (message, optionalParams) => {
      console.warn(name, message, optionalParams);
    },
    missingTranslation: (name: string) => {
      console.error(name, `Missing translation for "${name}"`);
    },
    missingEntity: (identifier: string) => {
      console.warn(name, `Missing entity with identifier "${identifier}".`);
    },
    invalidEntity: (identifier: string, message: string, ...args: unknown[]) => {
      console.error(name, `Entity '${identifier}' is not valid: ${message}`, ...args);
    },
  };

  return logger;
};

/**
 * We use this as a single place to log events. The idea is that we have
 * all logging coming through our interface.
 *
 * For now we just call console to print into the console.
 *
 * @deprecated Create custom logger instead.
 */
export const logger = createLogger("http://src/");
