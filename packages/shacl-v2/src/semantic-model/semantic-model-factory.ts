import { Entities } from "@dataspecer/core-v2";
import { EntityModel, EntityModelChangeListener } from "@dataspecer/entity-model";
import { SemanticModel } from "./semantic-model.ts";

class ReadOnlyInMemorySemanticModel implements SemanticModel {

  readonly baseIri: string;

  readonly model: EntityModel;

  constructor(baseIri: string, model: EntityModel) {
    this.baseIri = baseIri;
    this.model = model;
  }

  getId(): string {
    return this.model.getId();
  }

  getEntities(): Entities {
    return this.model.getEntities();
  }

  subscribeToChanges(listener: EntityModelChangeListener): () => void {
    return this.model.subscribeToChanges(listener);
  }

  getBaseIri(): string {
    return this.baseIri;
  }

}

export function createReadOnlyInMemorySemanticModel(
  baseIri: string, model: EntityModel,
): SemanticModel {
  return new ReadOnlyInMemorySemanticModel(baseIri, model);
}
