import { ModelDsIdentifier } from "../entity-model";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { InvalidState } from "../../application/error";
import {
  CmeClass,
  CmeClassProfile,
  CmeReference,
  CmeRelationship,
  CmeRelationshipProfile,
  CmeSemanticModelChange,
  NewCmeClass,
  NewCmeClassProfile,
  NewCmeGeneralization,
  NewCmeRelationship,
  NewCmeRelationshipProfile,
} from "./model";
import { EntityModel } from "@dataspecer/core-v2";
import { isInMemorySemanticModel } from "../../utilities/model";
import { createLogger } from "../../application";
import { createCmeClassProfile } from "./operation/create-cme-class-profile";
import { createCmeClass } from "./operation/create-cme-class";
import { createCmeGeneralization } from "./operation/create-cme-generalization";
import { createCmeRelationshipProfile } from "./operation/create-cme-relationship-profile";
import { createCmeRelationship } from "./operation/create-cme-relationship";
import { deleteCmeClass } from "./operation/delete-cme-class";
import { deleteCmeClassProfile } from "./operation/delete-cme-class-profile";
import { deleteCmeGeneralization } from "./operation/delete-cme-generalization";
import { deleteCmeRelationshipProfile } from "./operation/delete-cme-relationship-profile";
import { deleteCmeRelationship } from "./operation/delete-cme-relationship";
import { updateCmeClassProfile } from "./operation/update-cme-class-profile";
import { updateCmeClass } from "./operation/update-cme-class";
import { updateCmeRelationshipProfile } from "./operation/update-cme-relationship-profile";
import { CmeSpecialization, NewCmeSpecialization } from "./model/cme-specialization";
import { updateCmeSpecialization } from "./operation/update-cme-entity-specialization";
import { updateCmeRelationship } from "./operation/update-cme-relationship";
import { changeCmeClassProfile } from "./operation/change-cme-class-profile";
import { updateCmeSemanticModel } from "./operation/update-semantic-model";

const LOG = createLogger(import.meta.url);

export interface CmeModelOperationExecutor {

  // Class profile

  /**
   * @throws {DataspecerError}
   * @throws {InvalidState}
   */
  createClassProfile(value: NewCmeClassProfile): CmeReference;

  /**
   * @throws {InvalidState}
   * @throws {DataspecerError}
   */
  updateClassProfile(value: CmeClassProfile): void;

  /**
   * @throws {InvalidState}
   * @throws {DataspecerError}
   */
  deleteClassProfile(value: CmeReference): void;

  /**
   * Change values of only the given properties.
   *
   * @throws {InvalidState}
   * @throws {DataspecerError}
   */
  changeClassProfile(value: CmeReference & Partial<CmeClassProfile>): void;

  // Class

  /**
   * @throws {DataspecerError}
   * @throws {InvalidState}
   */
  createClass(value: NewCmeClass): CmeReference;

  /**
   * @throws {DataspecerError}
   * @throws {InvalidState}
   */
  updateClass(value: CmeClass): void;

  /**
   * @throws {InvalidState}
   * @throws {DataspecerError}
   */
  deleteClass(value: CmeReference): void;

  // Generalization

  /**
   * @throws {DataspecerError}
   * @throws {InvalidState}
   */
  createGeneralization(value: NewCmeGeneralization): CmeReference;

  /**
   * @throws {InvalidState}
   * @throws {DataspecerError}
   */
  deleteGeneralization(value: CmeReference): void;

  /**
   * Update specializations for given entity to match the desired next state.
   *
   * @param writeModel Model to create new entities into.
   * @throws {InvalidState}
   * @throws {DataspecerError}
   */
  updateSpecialization(
    entity: CmeReference,
    writeModel: ModelDsIdentifier,
    previous: (NewCmeSpecialization | CmeSpecialization)[],
    next: (NewCmeSpecialization | CmeSpecialization)[]): void;

  // Relationship profile

  /**
   * @throws {InvalidState}
   * @throws {DataspecerError}
   */
  createRelationshipProfile(value: NewCmeRelationshipProfile): CmeReference;

  /**
   * @throws {DataspecerError}
   * @throws {InvalidState}
   */
  updateRelationshipProfile(value: CmeRelationshipProfile): void;

  /**
   * @throws {InvalidState}
   * @throws {DataspecerError}
   */
  deleteRelationshipProfile(value: CmeReference): void;

  // Relationship

  /**
   * @throws {InvalidState}
   * @throws {DataspecerError}
   */
  createRelationship(value: NewCmeRelationship): CmeReference;

  /**
   * @throws {InvalidState}
   * @throws {DataspecerError}
   */
  updateRelationship(value: CmeRelationship): void;

  /**
   * @throws {InvalidState}
   * @throws {DataspecerError}
   */
  deleteRelationship(value: CmeReference): void;

  // Semantic model

  updateSemanticModel(value: CmeSemanticModelChange): void;

}

class DefaultCmeModelOperationExecutor implements CmeModelOperationExecutor {

  private readonly models: InMemorySemanticModel[];

  constructor(models: InMemorySemanticModel[]) {
    this.models = models;
  }

  // Class profile

  createClassProfile(value: NewCmeClassProfile): CmeReference {
    LOG.trace("DefaultCmeModelOperationExecutor.createClassProfile", { value });
    const model = this.findModel(value.model);
    return createCmeClassProfile(model, value);
  }

  /**
   * @returns Model with given identifier.
   * @throws {InvalidState}
   */
  private findModel(identifier: ModelDsIdentifier) {
    const result = this.models.find(model => model.getId() === identifier);
    if (result === undefined) {
      LOG.error("Missing model.", { identifier, models: this.models });
      throw new InvalidState();
    }
    return result;
  }

  updateClassProfile(value: CmeClassProfile): void {
    LOG.trace("DefaultCmeModelOperationExecutor.updateClassProfile", { value });
    const model = this.findModel(value.model);
    updateCmeClassProfile(model, value);
  }

  changeClassProfile(value: CmeReference & Partial<CmeClassProfile>): void {
    LOG.trace("DefaultCmeModelOperationExecutor.changeClassProfile", { value });
    const model = this.findModel(value.model);
    changeCmeClassProfile(model, value);
  }

  deleteClassProfile(value: CmeReference): void {
    LOG.trace("DefaultCmeModelOperationExecutor.deleteClassProfile", { value });
    const model = this.findModel(value.model);
    deleteCmeClassProfile(model, value);
  }

  // Class

  createClass(value: NewCmeClass): CmeReference {
    LOG.trace("DefaultCmeModelOperationExecutor.createClass", { value });
    const model = this.findModel(value.model);
    return createCmeClass(model, value);
  }

  updateClass(value: CmeClass): void {
    LOG.trace("DefaultCmeModelOperationExecutor.updateClass", { value });
    const model = this.findModel(value.model);
    updateCmeClass(model, value);
  }

  deleteClass(value: CmeReference): void {
    LOG.trace("DefaultCmeModelOperationExecutor.deleteClass", { value });
    const model = this.findModel(value.model);
    deleteCmeClass(model, value);
  }

  // Generalization

  createGeneralization(value: NewCmeGeneralization): CmeReference {
    LOG.trace("DefaultCmeModelOperationExecutor.createGeneralization", { value });
    const model = this.findModel(value.model);
    return createCmeGeneralization(model, value);
  }

  deleteGeneralization(value: CmeReference): void {
    LOG.trace("DefaultCmeModelOperationExecutor.createGeneralization", { value });
    const model = this.findModel(value.model);
    deleteCmeGeneralization(model, value);
  }

  updateSpecialization(
    entity: CmeReference,
    writeModel: ModelDsIdentifier,
    previous: (NewCmeSpecialization | CmeSpecialization)[],
    next: (NewCmeSpecialization | CmeSpecialization)[]): void {
    LOG.trace("DefaultCmeModelOperationExecutor.updateSpecialization",
      { entity, writeModel, previous, next });
    const model = this.findModel(writeModel);
    updateCmeSpecialization(this.models, model, entity, previous, next);
  }

  // Relationship profile

  createRelationshipProfile(value: NewCmeRelationshipProfile): CmeReference {
    LOG.trace("DefaultCmeModelOperationExecutor.createRelationshipProfile",
      { value });
    const model = this.findModel(value.model);
    return createCmeRelationshipProfile(model, value);
  }

  updateRelationshipProfile(value: CmeRelationshipProfile): void {
    LOG.trace("DefaultCmeModelOperationExecutor.updateRelationshipProfile",
      { value });
    const model = this.findModel(value.model);
    updateCmeRelationshipProfile(model, value);
  }

  deleteRelationshipProfile(value: CmeReference): void {
    LOG.trace("DefaultCmeModelOperationExecutor.deleteRelationshipProfile",
      { value });
    const model = this.findModel(value.model);
    deleteCmeRelationshipProfile(model, value);
  }

  // Relationship

  createRelationship(value: NewCmeRelationship): CmeReference {
    LOG.trace("DefaultCmeModelOperationExecutor.createRelationship", { value });
    const model = this.findModel(value.model);
    return createCmeRelationship(model, value);
  }

  updateRelationship(value: CmeRelationship): void {
    LOG.trace("DefaultCmeModelOperationExecutor.updateRelationship", { value });
    const model = this.findModel(value.model);
    updateCmeRelationship(model, value);
  }

  deleteRelationship(value: CmeReference): void {
    LOG.trace("DefaultCmeModelOperationExecutor.deleteRelationship", { value });
    const model = this.findModel(value.model);
    deleteCmeRelationship(model, value);
  }

  // Model

  updateSemanticModel(value: CmeSemanticModelChange): void {
    LOG.trace("DefaultCmeModelOperationExecutor.updateSemanticModel", { value });
    const model = this.findModel(value.identifier);
    updateCmeSemanticModel(model, value);
  }

}

export function createCmeModelOperationExecutor(
  models: EntityModel[] | Map<string, EntityModel>,
) {
  let entityModels: EntityModel[] = [];
  if (models instanceof Map) {
    entityModels = [...models.values()];
  } else {
    entityModels = models;
  }
  //
  const semanticModels = entityModels.filter(isInMemorySemanticModel);
  return new DefaultCmeModelOperationExecutor(semanticModels);
}
