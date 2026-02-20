import type { Entity } from "../entity.ts";
import type { Operation, WritableEntityModel } from "../writable-entity-model.ts";
import { DefaultEntityModel } from "./default-entity-model.ts";
import { CreateOrUpdateEntityOperation, RemoveEntityOperation } from "./default-operations.ts";

export class DefaultWritableEntityModel extends DefaultEntityModel implements WritableEntityModel {
  dispatch(operations: Operation[]): void {
    const createOrUpdate: Entity[] = [];
    const remove: string[] = [];

    for (const operation of operations) {
      switch (operation.type) {
        case CreateOrUpdateEntityOperation.prototype.type:
          createOrUpdate.push((operation as CreateOrUpdateEntityOperation).entity);
          break;
        case RemoveEntityOperation.prototype.type:
          remove.push((operation as RemoveEntityOperation).identifier);
          break;
        default:
          throw new Error(`Unrecognized operation type: ${operation.type}`);
      }
    }

    this.changeEntitiesAndNotify(createOrUpdate, remove);
  }
}
