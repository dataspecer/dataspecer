
/**
 * @throws {RuntimeError} When assertion fail.
 */
export function assert(
  condition: boolean, message: string, ...optionalParams: any[]
) {
  if (condition) {
    // Condition holds
    return;
  }
  console.error("Assert failed!", { message, optionalParams });
  throw new RuntimeError(message);
}

/**
 * Base exception for runtime error.
 */
class RuntimeError extends Error {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Use this exception to report invalid application state.
 * Report details using logger.
 */
export class InvalidState extends RuntimeError {
  constructor() {
    super("Invalid application state.");
  }
}

/**
 * Use this operation when user try to execute an operation
 * which is undefined or made no sense in given context.
 *
 * In general this may sometimes collide with {@link InvalidState}.
 */
export class UnsupportedOperationException extends RuntimeError {
  constructor() {
    super("Unsupported operation.");
  }
}

/**
 * Use when you can not find a model with a given identifier.
 * @deprecated Use {@link InvalidState}.
 */
export class MissingModel extends RuntimeError {
  constructor(identifier: string) {
    super(`Missing vocabulary '${identifier}'.`);
  }
}

