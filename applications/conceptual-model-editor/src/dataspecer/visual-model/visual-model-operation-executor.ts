import { VisualEntity, VisualModel, WritableVisualModel } from "@dataspecer/visual-model";
import { EntityDsIdentifier, ModelDsIdentifier } from "../entity-model";
import { addVisualNodeProfile } from "./operation/add-visual-node-profile";
import { addVisualNode } from "./operation/add-visual-node";
import { deleteEntityModel } from "./operation/delete-entity-model";
import { updateVisualNodeProfiles } from "./operation/update-visual-node-profiles";
import {
  addVisualRelationshipsForRepresented,
  addVisualRelationshipsWithSpecifiedVisualEnds,
} from "./operation/add-visual-relationships";
import { CmeReference } from "../cme-model/model";
import { deleteVisualEntity } from "./operation/delete-visual-entity";

export interface VisualModelOperationExecutor {

  /**
   * @throws DataspecerError
   */
  addGeneralization(
    represented: CmeReference,
    child: EntityDsIdentifier,
    parent: EntityDsIdentifier,
  ): void;

  /**
   * @throws DataspecerError
   */
  addGeneralizationWithSpecifiedVisualEnds(
    represented: CmeReference,
    visualSources: EntityDsIdentifier[],
    visualTargets: EntityDsIdentifier[],
  ): void;

  /**
   * @throws DataspecerError
   */
  addProfile(
    profile: CmeReference,
    profiled: CmeReference,
  ): void;

  /**
   * Try to perform {@link addProfile} operation, but ignore failure.
   */
  tryAddProfile(
    profile: CmeReference,
    profiled: CmeReference,
  ): void;

  /**
   * @throws DataspecerError
   */
  addNode(
    represented: CmeReference,
    position: { x: number, y: number },
    content: string[],
  ): void;

  /**
   * @throws DataspecerError
   */
  addRelationship(
    represented: CmeReference,
    source: EntityDsIdentifier,
    target: EntityDsIdentifier,
  ): void;

  /**
   * @throws DataspecerError
   */
  addRelationshipWithSpecifiedVisualEnds(
    represented: CmeReference,
    visualSources: EntityDsIdentifier[],
    visualTargets: EntityDsIdentifier[],
  ): void;

  /**
   * @throws DataspecerError
   */
  updateProfile(
    represented: CmeReference,
    previous: CmeReference[],
    next: CmeReference[],
  ): void;

  /**
   * Delete all visual entities representing given reference.
   *
   * @throws DataspecerError
   */
  deleteEntity(represented: CmeReference): void;

  /**
   * @throws DataspecerError
   */
  deleteModel(model: ModelDsIdentifier): void;

}

class DefaultVisualModelOperationExecutor
implements VisualModelOperationExecutor {

  private visualModel: WritableVisualModel;

  constructor(visualModel: WritableVisualModel) {
    this.visualModel = visualModel;
  }

  addGeneralization(
    represented: CmeReference,
    child: EntityDsIdentifier,
    parent: EntityDsIdentifier,
  ): void {
    addVisualRelationshipsForRepresented(this.visualModel,
      represented.model, represented.identifier, child, parent);
  }

  addGeneralizationWithSpecifiedVisualEnds(
    represented: CmeReference,
    visualChildren: EntityDsIdentifier[],
    visualParents: EntityDsIdentifier[]
  ): void {
    const visualSources = convertIdentifiersToVisualEntities(this.visualModel, visualChildren);
    const visualTargets = convertIdentifiersToVisualEntities(this.visualModel, visualParents);
    addVisualRelationshipsWithSpecifiedVisualEnds(this.visualModel,
      represented.model, represented.identifier, visualSources, visualTargets);
  }

  addProfile(
    profile: CmeReference,
    profiled: CmeReference,
  ): void {
    addVisualNodeProfile(this.visualModel, profile, profiled);
  }

  tryAddProfile(
    profile: CmeReference,
    profiled: CmeReference,
  ): void {
    try {
      addVisualNodeProfile(this.visualModel, profile, profiled);
    } catch {
      // We do nothing as it is just a try.
    }
  }

  addNode(
    represented: CmeReference,
    position: { x: number, y: number },
    content: string[],
  ): void {
    addVisualNode(this.visualModel,
      { id: represented.identifier }, represented.model, position, content);
  }

  addRelationshipWithSpecifiedVisualEnds(
    represented: CmeReference,
    visualSourcesIdentifiers: EntityDsIdentifier[],
    visualTargetsIdentifiers: EntityDsIdentifier[]
  ): void {
    const visualSources = convertIdentifiersToVisualEntities(this.visualModel, visualSourcesIdentifiers);
    const visualTargets = convertIdentifiersToVisualEntities(this.visualModel, visualTargetsIdentifiers);
    addVisualRelationshipsWithSpecifiedVisualEnds(this.visualModel,
      represented.model, represented.identifier, visualSources, visualTargets);
  }

  addRelationship(
    represented: CmeReference,
    source: EntityDsIdentifier,
    target: EntityDsIdentifier,
  ): void {
    addVisualRelationshipsForRepresented(this.visualModel,
      represented.model, represented.identifier, source, target);
  }

  updateProfile(
    represented: CmeReference,
    previous: CmeReference[],
    next: CmeReference[],
  ): void {
    updateVisualNodeProfiles(this.visualModel, represented, previous, next);
  }

  deleteEntity(represented: CmeReference): void {
    deleteVisualEntity(this.visualModel, represented);
  }

  deleteModel(model: ModelDsIdentifier): void {
    deleteEntityModel(this.visualModel, model);
  }

}

function convertIdentifiersToVisualEntities(
  visualModel: VisualModel,
  identifiers: string[]
): VisualEntity[] {
  const visualEntities = identifiers
    .map(identifier => visualModel.getVisualEntity(identifier))
    .filter(entity => entity !== null);
  return visualEntities;
}

export function createVisualModelOperationExecutor(
  visualModel: WritableVisualModel,
): VisualModelOperationExecutor {
  return new DefaultVisualModelOperationExecutor(visualModel);
}
