import { DataPsmClass, DataPsmContainer, DataPsmSchema } from "@dataspecer/core/data-psm/model";
import { DataPsmMoveProperty } from "@dataspecer/core/data-psm/operation";
import { ComplexOperation } from "@dataspecer/federated-observable-store/complex-operation";
import { FederatedObservableStore } from "@dataspecer/federated-observable-store/federated-observable-store";

export class MoveProperty implements ComplexOperation {
  private readonly fromContainerId: string;
  private readonly propertyId: string;
  private readonly toContainerId: string;
  private readonly newIndexPosition: number;
  private store!: FederatedObservableStore;

  constructor(fromContainerId: string, propertyId: string, toContainerId: string, newIndexPosition: number) {
    this.fromContainerId = fromContainerId;
    this.propertyId = propertyId;
    this.toContainerId = toContainerId;
    this.newIndexPosition = newIndexPosition;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  execute(): void {
    // We expect that the schema for all resources is the same.
    const schema = this.store.getSchemaForResource(this.fromContainerId) as string;

    let moveAfter: string | null;

    const targetContainerResource = this.store.readResource(this.toContainerId);
    if (this.newIndexPosition === 0) {
      moveAfter = null;
    } else {
      if (DataPsmClass.is(targetContainerResource) || DataPsmContainer.is(targetContainerResource)) {
        moveAfter = targetContainerResource.dataPsmParts[this.newIndexPosition - 1];
      } else {
        moveAfter = (targetContainerResource as DataPsmSchema).dataPsmRoots[this.newIndexPosition - 1];
      }
    }

    const operation = new DataPsmMoveProperty();
    operation.dataPsmSourceContainer = this.fromContainerId;
    operation.dataPsmTargetContainer = this.toContainerId;
    operation.dataPsmProperty = this.propertyId;
    operation.dataPsmMoveAfter = moveAfter;

    this.store.applyOperation(schema, operation);
  }
}
