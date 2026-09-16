import { Entities } from "@dataspecer/core-v2";
import { ApplicationProfile } from "./dsv-model.ts";
import { EntityListContainer } from "./entity-model.ts";
import { createContext } from "./entity-model-to-dsv.ts";
import { entityListContainerToConceptualModel } from "./index.ts";

interface SemanticModel {

  getBaseIri(): string | null;

  getEntities(): Entities;

};

interface ProfileModel {

  getBaseIri(): string | null;

  getEntities(): Entities;

};

/**
 * Create data specification vocabulary representation for given profile models.
 * The function also require list all models as transitive dependencies.
 *
 * Result of this method does not include the intermediate entities.
 *
 * @param dependencies Semantic and semantic profiles models.
 *  They must provide connection from the second function argument to the semantic model.
 *  This is required to properly determine profile types.
 * @param dependencies.controlledVocabularies Controlled vocabulary models -
 *  each holds exactly one CV entity. Only used to resolve references to them
 *  (via createContext); they do not affect profile type determination the
 *  way semantics/profiles do.
 * @param profiles The top level semantic profile model to create the DSV representation for.
 *  This model must be connected to the semantic entities by dependencies.
 * @param configuration
 * @param configuration.controlledVocabularyCatalogIris Maps a controlled
 *  vocabulary's entity id to the IRI of the catalog it is a direct member of
 *  - see createContext.
 */
export function createDataSpecificationVocabulary(
  dependencies: {
    semantics: SemanticModel[],
    profiles: ProfileModel[],
    controlledVocabularies?: SemanticModel[],
  },
  profiles: ProfileModel[],
  configuration: {
    iri: string,
    controlledVocabularyCatalogIris?: Map<string, string>,
  }
): ApplicationProfile {

  const containers: EntityListContainer[] = [];
  dependencies.semantics.forEach(item => containers.push({
    baseIri: item.getBaseIri(),
    entities: Object.values(item.getEntities()),
  }));

  dependencies.profiles.forEach(item => containers.push({
    baseIri: item.getBaseIri(),
    entities: Object.values(item.getEntities()),
  }));

  (dependencies.controlledVocabularies ?? []).forEach(item => containers.push({
    baseIri: item.getBaseIri(),
    entities: Object.values(item.getEntities()),
  }));

  const profileContainers: EntityListContainer[] = [];
  profiles.forEach(item => {
    const container = {
      baseIri: item.getBaseIri(),
      entities: Object.values(item.getEntities()),
    };
    profileContainers.push(container);
    // Also add to dependencies if not already path of that.
    if (!dependencies.profiles.includes(item)) {
      containers.push(container);
    }
  });

  const context = createContext(containers, configuration.controlledVocabularyCatalogIris);
  const result: ApplicationProfile = {
    iri: configuration.iri,
    externalDocumentationUrl: null,
    classProfiles: [],
    datatypePropertyProfiles: [],
    objectPropertyProfiles: [],
  };
  for (const container of profileContainers) {
    const model = entityListContainerToConceptualModel(
      configuration.iri, container, context);
    // Merge to result.
    result.classProfiles.push(...model.classProfiles);
    result.datatypePropertyProfiles.push(...model.datatypePropertyProfiles);
    result.objectPropertyProfiles.push(...model.objectPropertyProfiles);
  }

  return result;
}
