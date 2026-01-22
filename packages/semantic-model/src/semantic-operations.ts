import {
  createClass,
  createGeneralization,
  createRelationship,
  deleteEntity,
  modifyClass,
  modifyRelation,
  modifyGeneralization,
} from "@dataspecer/core-v2/semantic-model/operations";

export const SemanticOperations = {
  // Class
  createClass,
  updateClass: modifyClass,
  deleteClass: deleteEntity,
  // Relationship
  createRelationship,
  updateRelationship: modifyRelation,
  deleteRelationship: deleteEntity,
  // Generalization
  createGeneralization,
  updateGeneralization: modifyGeneralization,
  deleteGeneralization: deleteEntity,
};
