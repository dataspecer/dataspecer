import type { PackageService } from "@dataspecer/core-v2/project";
import { createSgovModel, type ExternalSemanticModel } from "@dataspecer/core-v2/semantic-model/simplified";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import type { Model, ModelIdentifier } from "@dataspecer/core/model";
import type { Operation } from "@dataspecer/core/operation";
import { diffEntities } from "../utilities.ts";
import { BaseModelInModelStore } from "./base.ts";
import type { ApplyOperationResult, ModelInDefaultFrontendModelStore } from "./implementation.ts";

/**
 * Models that can be queried asynchronously.
 * @todo this is only for SGOV model from CME
 */
export class AsyncQueryableModelInModelStore extends BaseModelInModelStore implements Model, ModelInDefaultFrontendModelStore {
  protected service: PackageService;
  protected httpFetch: HttpFetch;

  /**
   * Underlying implementation of the model.
   * @todo this is just a temporary solution
   */
  protected model: ExternalSemanticModel | null = null;

  constructor(id: string, service: PackageService, httpFetch: HttpFetch) {
    super(id);
    this.service = service;
    this.httpFetch = httpFetch;
  }

  getAllEntities(): EntityRecord {
    throw new Error("Method not implemented.");
  }

  applyOperations(operations: Operation[]): ApplyOperationResult {
    throw new Error("Not implemented yet.");
  }

  async load(): Promise<void> {
    const modelData = (await this.service.getResourceJsonData(this.id)) as any;

    this.model = createSgovModel("", this.httpFetch, this.id);
    let previousEntities: EntityRecord = {};
    this.model.subscribeToChanges(() => {
      const currentEntities = this.model!.getEntities();
      const diff = diffEntities(previousEntities, currentEntities);
      previousEntities = currentEntities;
      this.internalNotifyExternalChanges(diff);
    });
    this.model.unserializeModel(modelData);
  }

  async save(): Promise<void> {
    // @todo no saving for now
    return;
  }
}

export function createAsyncQueryableModel(
  modelId: ModelIdentifier,
  context: {
    service: PackageService;
    httpFetch: HttpFetch;
  },
): Model & ModelInDefaultFrontendModelStore {
  return new AsyncQueryableModelInModelStore(modelId, context.service, context.httpFetch);
}
