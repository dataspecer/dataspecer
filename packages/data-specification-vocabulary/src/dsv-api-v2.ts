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
 */
export function createDataSpecificationVocabulary(
  dependencies: {
    semantics: SemanticModel[],
    profiles: ProfileModel[],
  },
  profiles: ProfileModel[],
  configuration: {
    iri: string,
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

  const context = createContext(containers);
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
