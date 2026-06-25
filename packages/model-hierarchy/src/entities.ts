import type { LanguageString } from "@dataspecer/core/core/core-resource";
import type { Entity } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";

export const MODEL_HIERARCHY_VOCABULARY = "vocabulary";
export const MODEL_HIERARCHY_APPLICATION_PROFILE = "application-profile";

/**
 * A node in model hierarchy tree that represents a model. This model can be a
 * vocabulary, application profile or other helper models such as imported RDFS
 * Vocabulary.
 *
 * ID of such entity matches ID of the represented model.
 */
interface BaseModelHierarchyEntity extends Entity {
  /**
   * Same id as the semantic model in the project that this entity represents.
   */
  id: ModelIdentifier;

  /**
   * Type of the model from the project model. You can use this to determine if
   * this is RDFS model, SGOV model, or regular semantic model.
   */
  modelType: string;

  label: LanguageString;
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
   * IDs of the other models in the hierarchy that this application profile
   * profiles/uses.
   */
  profiles: ModelIdentifier[];

  /**
   * Whether entities from {@link profiles} that are not themselves profiled by
   * this model are still visible through it.
   */
  passThrough: boolean;
}

export type ModelHierarchyEntity = VocabularyHierarchyEntity | ApplicationProfileHierarchyEntity;

export function isVocabularyHierarchyEntity(entity: Entity | null | undefined): entity is ApplicationProfileHierarchyEntity {
  return entity?.type.includes(MODEL_HIERARCHY_VOCABULARY) ?? false;
}

export function isApplicationProfileHierarchyEntity(entity: Entity | null | undefined): entity is ApplicationProfileHierarchyEntity {
  return entity?.type.includes(MODEL_HIERARCHY_APPLICATION_PROFILE) ?? false;
}
