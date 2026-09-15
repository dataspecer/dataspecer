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

  /**
   * Whether this session can write to the model (by applying operations).
   */
  writable: boolean;

  /**
   * List of models in the hierarchy that this model uses, e.g. vocabularies
   * that it imports. These are the only models that this models sees.
   */
  imports: ModelIdentifier[];

  /**
   * Whether imported vocabularies should be merged together with this model.
   */
  passThrough: boolean;
}

/**
 * A semantic model that profiles (some of) the entities of other models.
 * Instead of imports field, it has profiles field that specifies other
 * vocabularies or profiles that this model profiles.
 *
 * Examples:
 * - A local, writable, semantic model that contain profiling entities.
 * - An imported, read-only, semantic model containing profiling entities from
 *   profiled specification.
 */
export interface ApplicationProfileHierarchyEntity extends BaseModelHierarchyEntity {
  type: [typeof MODEL_HIERARCHY_APPLICATION_PROFILE];

  writable: boolean;

  /**
   * Whether the aggregator can create entities in this profile.
   */
  canAddEntities: boolean;

  /**
   * Whether the aggregator can modify entities in this profile.
   */
  canModify: boolean;

  /**
   * IDs of the other models in the hierarchy that this application profile
   * profiles/uses, in merge order. Each referenced model applies its own
   * pass-through setting; its dependencies are not expanded into this array.
   */
  profiles: ModelIdentifier[];

  /**
   * Whether entities from {@link profiles} that are not themselves profiled by
   * this model are still visible through it.
   */
  passThrough: boolean;
}

/**
 * This represents a specification - the end product that data modeller exposes
 * to the world. Specification defines vocabularies, application profiles and
 * structure models.
 */
export interface SpecificationHierarchyEntity extends BaseModelHierarchyEntity {
  type: [typeof MODEL_HIERARCHY_SPECIFICATION];

  /**
   * Vocabulary identifiers in merge order, exposed alongside the profile.
   */
  vocabularies: ModelIdentifier[];

  /**
   * The exposed application profile, or null for a vocabulary-only package.
   */
  applicationProfile: ModelIdentifier | null;

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
