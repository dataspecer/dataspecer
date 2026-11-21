import { addSemanticClassOperation } from "./implementation/external-semantic-model/add-semantic-class";
import { addSemanticClassSurroundingsOperation } from "./implementation/external-semantic-model/add-semantic-class-surroundings";
import { releaseSemanticClassSurroundingsOperation } from "./implementation/external-semantic-model/release-semantic-class-surroundings";
import { createProfileClassOperation } from "./implementation/profile-model/create-profile-class";
import { createProfileRelationshipOperation } from "./implementation/profile-model/create-profile-relationship";
import { changeProfileClassOperation } from "./implementation/profile-model/change-profile-class";
import { profileEntitiesOperation } from "./implementation/profile-model/profile-entities";
import { updateControlledVocabularyAssignmentsOperation } from "./implementation/profile-model/update-controlled-vocabulary-assignments";
import { updateProfileClassOperation } from "./implementation/profile-model/update-profile-class";
import { updateProfileRelationshipOperation } from "./implementation/profile-model/update-profile-relationship";
import { createSemanticClassOperation } from "./implementation/semantic-model/create-semantic-class";
import { createSemanticGeneralizationOperation } from "./implementation/semantic-model/create-semantic-generalization";
import { createSemanticRelationshipOperation } from "./implementation/semantic-model/create-semantic-relationship";
import { deleteSemanticEntitiesOperation } from "./implementation/semantic-model/delete-semantic-entities";
import { updateSemanticClassOperation } from "./implementation/semantic-model/update-semantic-class";
import { updateSemanticModelOperation } from "./implementation/semantic-model/update-semantic-model";
import { updateSemanticRelationshipOperation } from "./implementation/semantic-model/update-semantic-relationship";
import { updateSpecializationOperation } from "./implementation/semantic-model/update-specialization";
import { addWaypointOperation } from "./implementation/visual-model/add-waypoint";
import { alignVisualNodesOperation } from "./implementation/visual-model/align-visual-nodes";
import { collapseIntoVisualDiagramNodeOperation } from "./implementation/visual-model/collapse-into-visual-diagram-node";
import { copyVisualEntitiesOperation } from "./implementation/visual-model/copy-visual-entities";
import { createVisualDiagramNodeOperation } from "./implementation/visual-model/create-visual-diagram-node";
import { createVisualGroupOperation } from "./implementation/visual-model/create-visual-group";
import { deleteWaypointOperation } from "./implementation/visual-model/delete-waypoint";
import { dissolveVisualDiagramNodeOperation } from "./implementation/visual-model/dissolve-visual-diagram-node";
import { dissolveVisualGroupOperation } from "./implementation/visual-model/dissolve-visual-group";
import { duplicateVisualNodeOperation } from "./implementation/visual-model/duplicate-visual-node";
import { hideAttributesOperation } from "./implementation/visual-model/hide-attributes";
import { hideByRepresentedOperation } from "./implementation/visual-model/hide-by-represented";
import { hideByVisualOperation } from "./implementation/visual-model/hide-by-visual";
import { hideSemanticModelOperation } from "./implementation/visual-model/hide-semantic-model";
import { layoutVisualEntitiesOperation } from "./implementation/visual-model/layout-visual-entities";
import { layoutVisualModelOperation } from "./implementation/visual-model/layout-visual-model";
import { moveVisualNodesOperation } from "./implementation/visual-model/move-visual-nodes";
import { moveWaypointsOperation } from "./implementation/visual-model/move-waypoints";
import { removeSemanticModelFromVisualModelsOperation } from "./implementation/visual-model/remove-semantic-model-from-visual-models";
import { setAttributePositionOperation } from "./implementation/visual-model/set-attribute-position";
import { setModelColorOperation } from "./implementation/visual-model/set-model-color";
import { setVisualEntityColorOperation } from "./implementation/visual-model/set-visual-entity-color";
import { shiftAttributeOperation } from "./implementation/visual-model/shift-attribute";
import { showAttributeOperation } from "./implementation/visual-model/show-attribute";
import { showDiagramNodeRelationshipsOperation } from "./implementation/visual-model/show-diagram-node-relationships";
import { showEntitiesOperation } from "./implementation/visual-model/show-entities";
import { showEntityNeighborhoodOperation } from "./implementation/visual-model/show-entity-neighborhood";
import { showGeneralizationOperation } from "./implementation/visual-model/show-generalization";
import { showProfileClassOperation } from "./implementation/visual-model/show-profile-class";
import { showRelatedEntitiesOperation } from "./implementation/visual-model/show-related-entities";
import { showRelationshipOperation } from "./implementation/visual-model/show-relationship";
import { showSemanticClassOperation } from "./implementation/visual-model/show-semantic-class";
import { showSemanticModelOperation } from "./implementation/visual-model/show-semantic-model";
import { showVisualEdgeOperation } from "./implementation/visual-model/show-visual-edge";
import { toggleAnchorOperation } from "./implementation/visual-model/toggle-anchor";
import { updateVisualModelLabelOperation } from "./implementation/visual-model/update-visual-model-label";
import { updateVisualNodeContentOperation } from "./implementation/visual-model/update-visual-node-content";
import { updateVisualNodeProfilesOperation } from "./implementation/visual-model/update-visual-node-profiles";

/**
 * List of all available operations.
 * Use as cmeOperations.createSemanticClass.create({ ... }) to prepare arguments
 * for the executor.
 */
export const cmeOperations = {
  addSemanticClass: addSemanticClassOperation,
  addSemanticClassSurroundings: addSemanticClassSurroundingsOperation,
  releaseSemanticClassSurroundings: releaseSemanticClassSurroundingsOperation,
  createProfileClass: createProfileClassOperation,
  createProfileRelationship: createProfileRelationshipOperation,
  changeProfileClass: changeProfileClassOperation,
  profileEntities: profileEntitiesOperation,
  updateControlledVocabularyAssignments: updateControlledVocabularyAssignmentsOperation,
  updateProfileClass: updateProfileClassOperation,
  updateProfileRelationship: updateProfileRelationshipOperation,
  createSemanticClass: createSemanticClassOperation,
  createSemanticGeneralization: createSemanticGeneralizationOperation,
  createSemanticRelationship: createSemanticRelationshipOperation,
  deleteSemanticEntities: deleteSemanticEntitiesOperation,
  updateSemanticClass: updateSemanticClassOperation,
  updateSemanticModel: updateSemanticModelOperation,
  updateSemanticRelationship: updateSemanticRelationshipOperation,
  updateSpecialization: updateSpecializationOperation,
  addWaypoint: addWaypointOperation,
  alignVisualNodes: alignVisualNodesOperation,
  collapseIntoVisualDiagramNode: collapseIntoVisualDiagramNodeOperation,
  copyVisualEntities: copyVisualEntitiesOperation,
  createVisualDiagramNode: createVisualDiagramNodeOperation,
  createVisualGroup: createVisualGroupOperation,
  deleteWaypoint: deleteWaypointOperation,
  dissolveVisualDiagramNode: dissolveVisualDiagramNodeOperation,
  dissolveVisualGroup: dissolveVisualGroupOperation,
  duplicateVisualNode: duplicateVisualNodeOperation,
  hideAttributes: hideAttributesOperation,
  hideByRepresented: hideByRepresentedOperation,
  hideByVisual: hideByVisualOperation,
  hideSemanticModel: hideSemanticModelOperation,
  layoutVisualEntities: layoutVisualEntitiesOperation,
  layoutVisualModel: layoutVisualModelOperation,
  moveVisualNodes: moveVisualNodesOperation,
  moveWaypoints: moveWaypointsOperation,
  removeSemanticModelFromVisualModels: removeSemanticModelFromVisualModelsOperation,
  setAttributePosition: setAttributePositionOperation,
  setModelColor: setModelColorOperation,
  setVisualEntityColor: setVisualEntityColorOperation,
  shiftAttribute: shiftAttributeOperation,
  showAttribute: showAttributeOperation,
  showDiagramNodeRelationships: showDiagramNodeRelationshipsOperation,
  showEntities: showEntitiesOperation,
  showEntityNeighborhood: showEntityNeighborhoodOperation,
  showGeneralization: showGeneralizationOperation,
  showProfileClass: showProfileClassOperation,
  showRelatedEntities: showRelatedEntitiesOperation,
  showRelationship: showRelationshipOperation,
  showSemanticClass: showSemanticClassOperation,
  showSemanticModel: showSemanticModelOperation,
  showVisualEdge: showVisualEdgeOperation,
  toggleAnchor: toggleAnchorOperation,
  updateVisualModelLabel: updateVisualModelLabelOperation,
  updateVisualNodeContent: updateVisualNodeContentOperation,
  updateVisualNodeProfiles: updateVisualNodeProfilesOperation,
};
