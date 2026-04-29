import type { PackageService } from "@dataspecer/core-v2/project";
import type { MemoryStore } from "@dataspecer/core/core/index";
import type { Model, ModelIdentifier } from "@dataspecer/core/model";
import type { Operation } from "@dataspecer/core/operation";
import { BaseModelInModelStore } from "./base.ts";
import type { ApplyOperationResult, ModelInDefaultFrontendModelStore } from "./implementation.ts";
import { diffEntities } from "../utilities.ts";
import type { EntityRecord } from "@dataspecer/core/entity-model";

// @ts-ignore
import { MemoryStoreFromBlob } from "@dataspecer/specification/memory-store";

/**
 * Currently, the structure model is PSM. This will be changed in the future,
 * but we will already call it properly to avoid refactoring in the future.
 */
export class StructureModelInModelStore extends BaseModelInModelStore implements Model, ModelInDefaultFrontendModelStore {
  protected service: PackageService;

  constructor(id: string, service: PackageService) {
    super(id);
    this.service = service;
  }

  protected model: MemoryStore | null = null;

  getAllEntities(): EntityRecord {
    if (!this.model) {
      return {};
    }
    const entities = this.model.listResources().map((iri) => this.model!.readResource(iri)!).map(entity => ({
      ...entity,
      // In PSM, entities have IRIs as unique identifiers. We need "id"
      id: entity.iri,
    }));

    return Object.fromEntries(entities.map((entity) => [entity.id, entity]));
  }

  applyOperations(operations: Operation[]): ApplyOperationResult {
    const oldEntities = this.getAllEntities();
    for (const operation of operations) {
      this.model!.applyOperation(operation as unknown as any);
    }
    const entityChanges = diffEntities(oldEntities, this.getAllEntities());

    return {
      entityChanges,
      transactionId: "",
    };
  }

  async load(): Promise<void> {
    const model = MemoryStoreFromBlob.createFromConnector({
      load: () => this.service.getResourceJsonData(this.id) as any,
      save: (data: unknown) => this.service.setResourceJsonData(this.id, data),
    });
    this.model = model;

    await model.load();

    const entities = this.getAllEntities();
    this.internalNotifyExternalChanges(Object.values(entities).map((entity) => ({
      previous: null,
      next: entity,
    })));
  }

  save(): Promise<void> {
    throw new Error("Method not implemented.");
  }
}

export function createStructureModel(
  modelId: ModelIdentifier,
  context: {
    service: PackageService;
  },
): Model & ModelInDefaultFrontendModelStore {
  return new StructureModelInModelStore(modelId, context.service);
}
