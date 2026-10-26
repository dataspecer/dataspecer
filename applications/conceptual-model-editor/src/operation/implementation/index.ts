// Only operation factory functions are exported.

export { addSemanticClassSurroundingsOperation } from "./external-semantic-model/add-semantic-class-surroundings";
export {
  releaseSemanticClassSurroundingsOperation,
} from "./external-semantic-model/release-semantic-class-surroundings";

export { changeProfileClassOperation } from "./profile-model/change-profile-class";
export { createProfileClassOperation } from "./profile-model/create-profile-class";
export { createProfileRelationshipOperation } from "./profile-model/create-profile-relationship";
export { profileEntitiesOperation } from "./profile-model/profile-entities";
export {
  updateControlledVocabularyAssignmentsOperation,
} from "./profile-model/update-controlled-vocabulary-assignments";
export { updateProfileClassOperation } from "./profile-model/update-profile-class";
export { updateProfileRelationshipOperation } from "./profile-model/update-profile-relationship";

export { createSemanticClassOperation } from "./semantic-model/create-semantic-class";
export { createSemanticGeneralizationOperation } from "./semantic-model/create-semantic-generalization";
export { createSemanticRelationshipOperation } from "./semantic-model/create-semantic-relationship";
export { deleteSemanticEntitiesOperation } from "./semantic-model/delete-semantic-entities";
export { updateSemanticClassOperation } from "./semantic-model/update-semantic-class";
export { updateSemanticModelOperation } from "./semantic-model/update-semantic-model";
export { updateSemanticRelationshipOperation } from "./semantic-model/update-semantic-relationship";
export { updateSpecializationOperation } from "./semantic-model/update-specialization";

export { addWaypointOperation } from "./visual-model/add-waypoint";
export { alignVisualNodesOperation } from "./visual-model/align-visual-nodes";
export { collapseIntoVisualDiagramNodeOperation } from "./visual-model/collapse-into-visual-diagram-node";
export { copyVisualEntitiesOperation } from "./visual-model/copy-visual-entities";
export { createVisualDiagramNodeOperation } from "./visual-model/create-visual-diagram-node";
export { createVisualGroupOperation } from "./visual-model/create-visual-group";
export { deleteWaypointOperation } from "./visual-model/delete-waypoint";
export { dissolveVisualDiagramNodeOperation } from "./visual-model/dissolve-visual-diagram-node";
export { dissolveVisualGroupOperation } from "./visual-model/dissolve-visual-group";
export { duplicateVisualNodeOperation } from "./visual-model/duplicate-visual-node";
export { hideAttributesOperation } from "./visual-model/hide-attributes";
export { hideByRepresentedOperation } from "./visual-model/hide-by-represented";
export { hideByVisualOperation } from "./visual-model/hide-by-visual";
export { hideSemanticModelOperation } from "./visual-model/hide-semantic-model";
export { layoutVisualEntitiesOperation } from "./visual-model/layout-visual-entities";
export { layoutVisualModelOperation } from "./visual-model/layout-visual-model";
export { moveVisualNodesOperation } from "./visual-model/move-visual-nodes";
export { moveWaypointsOperation } from "./visual-model/move-waypoints";
export { removeSemanticModelFromVisualModelsOperation } from "./visual-model/remove-semantic-model-from-visual-models";
export { setAttributePositionOperation } from "./visual-model/set-attribute-position";
export { setModelColorOperation } from "./visual-model/set-model-color";
export { setVisualEntityColorOperation } from "./visual-model/set-visual-entity-color";
export { shiftAttributeOperation } from "./visual-model/shift-attribute";
export { showAttributeOperation } from "./visual-model/show-attribute";
export { showDiagramNodeRelationshipsOperation } from "./visual-model/show-diagram-node-relationships";
export { showEntitiesOperation } from "./visual-model/show-entities";
export { showEntityNeighborhoodOperation } from "./visual-model/show-entity-neighborhood";
export { showGeneralizationOperation } from "./visual-model/show-generalization";
export { showProfileClassOperation } from "./visual-model/show-profile-class";
export { showRelatedEntitiesOperation } from "./visual-model/show-related-entities";
export { showRelationshipOperation } from "./visual-model/show-relationship";
export { showSemanticClassOperation } from "./visual-model/show-semantic-class";
export { showSemanticModelOperation } from "./visual-model/show-semantic-model";
export { toggleAnchorOperation } from "./visual-model/toggle-anchor";
export { updateVisualModelLabelOperation } from "./visual-model/update-visual-model-label";
export { updateVisualNodeContentOperation } from "./visual-model/update-visual-node-content";
export { updateVisualNodeProfilesOperation } from "./visual-model/update-visual-node-profiles";
