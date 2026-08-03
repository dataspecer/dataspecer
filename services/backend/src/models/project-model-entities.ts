import { LOCAL_PACKAGE } from "@dataspecer/core-v2/model/known-models";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { PROJECT_MODEL_MODEL_ENTITY, type PackageEntity, type ProjectModelEntity } from "@dataspecer/core/project-model";
import type { BaseResource, Package } from "./resource-model.ts";

/**
 * Projection of a resource that is not a package onto its project model entity.
 */
export function createRegularResourceEntity(resource: BaseResource): ProjectModelEntity {
  return {
    // Resources may carry arbitrary extra metadata fields (e.g. documentBaseUrl,
    // importedFromUrl) beyond label/description, which callers rely on.
    ...((resource.userMetadata as object) ?? {}),
    id: resource.iri,
    type: [PROJECT_MODEL_MODEL_ENTITY],
    label: resource.userMetadata?.label ?? {},
    description: resource.userMetadata?.description ?? {},
    modelType: resource.types[0] ?? "",
  };
}

/**
 * Projection of a package onto its project model entity, listing its direct
 * sub-resources.
 */
export function createProjectPackageEntity(resource: Package): PackageEntity {
  return {
    ...((resource.userMetadata as object) ?? {}),
    id: resource.iri,
    type: [PROJECT_MODEL_MODEL_ENTITY],
    label: resource.userMetadata?.label ?? {},
    description: resource.userMetadata?.description ?? {},
    modelType: LOCAL_PACKAGE,
    subModels: resource.subResources?.map((subResource) => subResource.iri) ?? [],
  };
}

/**
 * Builds the entities of the virtual project model of a project: its packages
 * and models as they follow from the resource tree.
 *
 * This is the projection the project model's operations are interpreted
 * against and the one its transaction events are derived from, so it is
 * deliberately derived from the resources alone. In particular it does not
 * take labels stored inside the models themselves into account (see
 * getModelsForPackage, which does that for the clients) - such a change
 * belongs to the events of the model that stores it. For the same reason it
 * does not follow references to packages outside the project.
 *
 * Returns an empty record if the project does not exist.
 */
export async function buildProjectModelEntities(
  projectIri: string,
  getPackage: (iri: string) => Promise<Package | null>,
): Promise<EntityRecord<ProjectModelEntity>> {
  const entities: EntityRecord<ProjectModelEntity> = {};

  const visit = async (iri: string): Promise<void> => {
    const resource = await getPackage(iri);
    if (resource === null) {
      return;
    }
    entities[iri] = createProjectPackageEntity(resource);

    for (const subResource of resource.subResources ?? []) {
      if (subResource.types[0] === LOCAL_PACKAGE) {
        await visit(subResource.iri);
      } else {
        entities[subResource.iri] = createRegularResourceEntity(subResource);
      }
    }
  };

  await visit(projectIri);
  return entities;
}
