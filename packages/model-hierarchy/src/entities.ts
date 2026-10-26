import type { LanguageString } from "@dataspecer/core/core/core-resource";
import type { Entity } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";

export const MODEL_HIERARCHY_VOCABULARY = "vocabulary";
export const MODEL_HIERARCHY_APPLICATION_PROFILE = "application-profile";
export const MODEL_HIERARCHY_SPECIFICATION = "specification";

/**
 * A hierarchy entity representing a semantic model or a package.
 *
 * ID of such entity matches ID of the represented model.
 */
interface BaseModelHierarchyEntity extends Entity {
  /**
   * Identifier of the represented model or package.
   */
  id: ModelIdentifier;

  /**
   * Type of the model from the project model. You can use this to determine if
   * this is RDFS model, SGOV model, or regular semantic model.
   */
  modelType: string;

  /**
   * Identifier of the specification containing this model; not a dependency edge.
   */
  specificationId: ModelIdentifier;

  label: LanguageString;

  /**
   * Identifier of the project the model belongs to, as in the project model.
   * It differs from the project being worked on for models that come from a
   * project it reuses.
   */
  projectId: ModelIdentifier;
}

/**
 * ! Because right now there are situations where we cannot distinguish between
 *   Vocabulary and AP, some AP may be misclassified as
 *   VocabularyHierarchyEntity.
 *
 * A vocabulary - a set of classes, relationship and attributes. Some
 * vocabularies may import other vocabularies because they reference some of
 * their concepts.
 *
 * Examples:
 * - A local, writable, semantic model that contains classes, relationships and
 *   attributes.
 * - Imported RDFS vocabulary that can be reimported.
 * - SPARQL model that can be queried.
 */
export interface VocabularyHierarchyEntity extends BaseModelHierarchyEntity {
  type: [typeof MODEL_HIERARCHY_VOCABULARY];
}

/**
 * A semantic model that profiles (some of) the entities of other models.
 * Its dependencies can be vocabularies or entire specifications.
 *
 * Examples:
 * - A local, writable, semantic model that contain profiling entities.
 * - An imported, read-only, semantic model containing profiling entities from
 *   profiled specification.
 */
export interface ApplicationProfileHierarchyEntity extends BaseModelHierarchyEntity {
  type: [typeof MODEL_HIERARCHY_APPLICATION_PROFILE];

  /**
   * Local vocabulary IDs followed by directly used external vocabulary and
   * specification IDs. Referenced specifications are not expanded.
   */
  profiles: ModelIdentifier[];
}

/**
 * This represents a specification - the end product that data modeller exposes
 * to the world. Specification defines vocabularies, application profiles and
 * structure models. Each specification roots a semantic-model dependency graph.
 */
export interface SpecificationHierarchyEntity extends BaseModelHierarchyEntity {
  type: [typeof MODEL_HIERARCHY_SPECIFICATION];

  /**
   * Locally defined vocabulary identifiers in merge order.
   */
  vocabularies: ModelIdentifier[];

  /**
   * The exposed application profile, or null for a vocabulary-only package.
   */
  applicationProfile: ModelIdentifier | null;

  /**
   * Direct child specification and external vocabulary IDs in dependency order.
   * Transitive dependencies are represented by the referenced specifications.
   */
  usedExternalSpecifications: ModelIdentifier[];

  // todo: list of structure models as a future work
}

export type ModelHierarchyEntity = VocabularyHierarchyEntity | ApplicationProfileHierarchyEntity | SpecificationHierarchyEntity;

export function isVocabularyHierarchyEntity(entity: Entity | null | undefined): entity is VocabularyHierarchyEntity {
  return entity?.type.includes(MODEL_HIERARCHY_VOCABULARY) ?? false;
}

export function isApplicationProfileHierarchyEntity(entity: Entity | null | undefined): entity is ApplicationProfileHierarchyEntity {
  return entity?.type.includes(MODEL_HIERARCHY_APPLICATION_PROFILE) ?? false;
}

export function isSpecificationHierarchyEntity(entity: Entity | null | undefined): entity is SpecificationHierarchyEntity {
  return entity?.type.includes(MODEL_HIERARCHY_SPECIFICATION) ?? false;
}
