import { LOCAL_SEMANTIC_MODEL } from "@dataspecer/core-v2/model/known-models";
import type { PackageService } from "@dataspecer/core-v2/project";
import { applyOperationToSemanticModel } from "@dataspecer/core-v2/semantic-model";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { Model, ModelIdentifier } from "@dataspecer/core/model";
import type { Operation } from "@dataspecer/core/operation";
import { BaseModelInModelStore, type ModelState } from "./base.ts";
import type { ModelInDefaultFrontendModelStore } from "./implementation.ts";

/**
 * This class implements support for semantic model for DefaultFrontendModelStore.
 */
export class SemanticModelInModelStore extends BaseModelInModelStore implements Model, ModelInDefaultFrontendModelStore {
  protected service: PackageService;

  constructor(id: string, service: PackageService) {
    super(id);
    this.service = service;
  }

  protected async loadInternal(): Promise<ModelState> {
    const data = await this.service.getResourceJsonData(this.id);
    return this.deserializeModel(data);
  }

  private async deserializeModel(data: unknown): Promise<ModelState> {
    const modelDescriptor = {...(data as any)};

    const entities = modelDescriptor.entities;
    const operations = [] as Operation[];

    return {
      entities,
      operations,
    };
  }

  protected async saveInternal(state: ModelState): Promise<void> {
    const data = this.serializeModel(state);
    await this.service.setResourceJsonData(this.id, data);
  }

  private serializeModel(state: ModelState): unknown {
    return {
      type: LOCAL_SEMANTIC_MODEL,
      ...{}, // todo model metadata

      modelId: this.id,
      modelAlias: "todo alias",
      baseIri: "todo base iri",
      entities: state.entities,
    };
  }

  protected override applyOperation(operation: Operation, mutableState: EntityRecord): void {
    const { changes } = applyOperationToSemanticModel(mutableState, [operation]);
    for (const change of changes) {
      if (change.next === null) {
        delete mutableState[change.previous!.id];
      } else {
        mutableState[change.next.id] = change.next;
      }
    }
  }
}

export function createSemanticModel(modelId: ModelIdentifier, context: {
  service: PackageService;
}): Model & ModelInDefaultFrontendModelStore {
  return new SemanticModelInModelStore(modelId, context.service);
}
