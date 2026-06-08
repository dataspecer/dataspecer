import { CoreResource } from "../core-resource.ts";

/**
 * Operation can be applied to change data model. Any data model, like
 * data-psm or platform-independent-model, must change only using operations.
 * This provide us with possibility to implement time travel and synchronization
 * of multiple models.
 *
 * @deprecated This interface is deprecated and all models should be refactored
 * to use {@link Operation} instead.
 */
export class CoreOperation extends CoreResource {
  private static readonly OPERATION_TYPE = "core-operation";

  parent: string | null = null;

  protected constructor() {
    super(null);
    this.types.push(CoreOperation.OPERATION_TYPE);
  }

  static is(resource: CoreResource): resource is CoreOperation {
    return resource.types.includes(CoreOperation.OPERATION_TYPE);
  }
}
