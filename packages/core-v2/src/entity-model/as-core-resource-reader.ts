import { CoreResource } from "@dataspecer/core/core/core-resource";
import { EntityModel } from './entity-model.ts';
import { CoreResourceReader } from "@dataspecer/core/core/core-reader";

export class EntityModelAsCoreResourceReader implements CoreResourceReader {
  private readonly entityModel: EntityModel;
  private readonly id: string;

  constructor(entityModel: EntityModel) {
    this.entityModel = entityModel;
    this.id = entityModel.getId();
  }

  listResources(): string[] {
    return [this.id, ...Object.keys(this.entityModel.getEntities())];
  }

  listResourcesOfType(typeIri: string): string[] {
    throw new Error('Method not implemented.');
  }

  readResource(iri: string): CoreResource | null {
    if (iri === this.id) {
      return this.entityModel as unknown as CoreResource;
    }
    return this.entityModel.getEntities()[iri] as unknown as CoreResource ?? null;
  }
}