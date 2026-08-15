import { CoreResource } from "../core-resource.ts";
import { DataPsmOperationResult } from "../../data-psm/operation/data-psm-operation-result.ts";

/**
 * Instance of this class must be returned by all operation executors.
 * As executor and store should live in the same memory space this class
 * is not designed to be serialized in any way.
 */
export class CoreExecutorResult {
  /**
   * Map of created resources.
   */
  readonly created: { [iri: string]: CoreResource };

  /**
   * Map of changed resources.
   */
  readonly changed: { [iri: string]: CoreResource };

  /**
   * List of resources that should be deleted.
   */
  readonly deleted: string[];

  /**
   * Operations should not throw an exception, instead they should
   * return this object with failed set to true and provide an error message.
   */
  readonly failed: boolean;

  /**
   * Error message in case of failure, otherwise an
   * optional message for the user.
   */
  readonly message: string | null;

  /**
   * The fields of this value's type are filled in and the object is returned
   * to the user. This field can be used to return specialization
   * (extending class) of {@link DataPsmOperationResult}.
   */
  readonly operationResult: DataPsmOperationResult | null;

  constructor(
    created: { [iri: string]: CoreResource },
    changed: { [iri: string]: CoreResource },
    deleted: string[],
    failed: boolean,
    message: string | null,
    operationResult: DataPsmOperationResult | null
  ) {
    this.created = created;
    this.changed = changed;
    this.deleted = deleted;
    this.failed = failed;
    this.message = message;
    this.operationResult = operationResult;
  }

  static createError(message: string): CoreExecutorResult {
    return new CoreExecutorResult({}, {}, [], true, message, null);
  }

  static createSuccess(
    created: CoreResource[],
    changed: CoreResource[],
    deleted: string[] = [],
    operationResult: DataPsmOperationResult | null = null
  ): CoreExecutorResult {
    return new CoreExecutorResult(
      asResourceMap(created),
      asResourceMap(changed),
      deleted,
      false,
      null,
      operationResult ?? new DataPsmOperationResult()
    );
  }
}

function asResourceMap(
  resources: CoreResource[]
): Record<string, CoreResource> {
  const result: Record<string, CoreResource> = {};
  resources.forEach((resource) => (result[resource.iri!] = resource));
  return result;
}
