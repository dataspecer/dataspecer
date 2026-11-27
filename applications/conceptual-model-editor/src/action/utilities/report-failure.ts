import { createLogger } from "../../application";
import { UseNotificationServiceWriterType } from "../../notification/notification-service-context";
import { CmeOperationExecutionFailed } from "../../operation/operation";

const LOG = createLogger(import.meta.url);

/**
 * Outcome of an operation or of a batch, both have the exception
 * only when the execution failed.
 */
interface Outcome {
  exception?: CmeOperationExecutionFailed;
}

type FailedOutcome<OutcomeType extends Outcome> =
  Extract<OutcomeType, { exception: CmeOperationExecutionFailed }>;

/**
 * Report failed execution to the user and log the exception.
 * Does nothing for a successful execution.
 *
 * @param message Shown to the user, describe what could not be done.
 * @returns True when the execution failed.
 *
 * @example
 * const outcome = await executor.execute(batch);
 * if (reportFailure(notifications, outcome, "Can not update the class.")) {
 *   return;
 * }
 * // Here the outcome is a success.
 */
export function reportFailure<OutcomeType extends Outcome>(
  notifications: UseNotificationServiceWriterType,
  outcome: OutcomeType,
  message: string,
): outcome is FailedOutcome<OutcomeType> {
  if (outcome.exception === undefined) {
    return false;
  }
  LOG.error(message, outcome.exception);
  notifications.error(message);
  return true;
}
